/**
 * Yönetici hesapları deposu — YALNIZCA SUNUCU.
 *
 * Hesaplar data/admin-users.json dosyasında durur (deploy paketine girmez, sunucudaki
 * dosya ezilmez). Her kullanıcının kendi scrypt şifre özeti vardır; düz şifre ve davet
 * belirteci hiçbir yere yazılmaz (davetin yalnızca SHA-256 özeti saklanır).
 *
 * İlk çalıştırmada dosya yoksa tohumlanır: yasin@ysnsoft.com (Süper Admin) eski ortak
 * ADMIN_PASSWORD_HASH ile girişe devam eder; diğer hesaplar davet bağlantısıyla şifre belirler.
 */
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isAdminRole, type AdminRole } from '@/lib/roles';

const DATA_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'admin-users.json');
const AUDIT_FILE = path.join(DATA_DIR, 'admin-audit.log');
const INVITE_TTL_MS = 72 * 60 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 12;

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  status: 'active' | 'disabled';
  passwordHash: string | null;
  invite: { hash: string; exp: number } | null;
  /** Oturum sürümü: rol/durum/şifre değişince artar, eski oturumlar düşer. */
  sv: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

/** İstemciye dönen güvenli görünüm (özet ve davet bilgisi yok). */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  status: 'active' | 'disabled';
  hasPassword: boolean;
  invitePending: boolean;
  inviteExpiresAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

const SEED: { email: string; name: string; role: AdminRole; legacyHash: boolean }[] = [
  { email: 'yasin@ysnsoft.com', name: 'Yasin Yıldırım', role: 'superadmin', legacyHash: true },
  { email: 'denizyildirimyelken@gmail.com', name: 'Deniz Yıldırım Yelken', role: 'admin', legacyHash: false },
];

// ── Dosya ───────────────────────────────────────────────────

let cache: { mtimeMs: number; users: StoredUser[] } | null = null;

function now(): string {
  return new Date().toISOString();
}

function seedUsers(): StoredUser[] {
  const legacy = process.env.ADMIN_PASSWORD_HASH?.startsWith('scrypt:') ? process.env.ADMIN_PASSWORD_HASH : null;
  return SEED.map((s) => ({
    id: randomUUID(),
    email: s.email,
    name: s.name,
    role: s.role,
    status: 'active',
    passwordHash: s.legacyHash ? legacy : null,
    invite: null,
    sv: 1,
    createdAt: now(),
    updatedAt: now(),
    lastLoginAt: null,
  }));
}

function writeUsers(users: StoredUser[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${USERS_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ version: 1, users }, null, 2), 'utf8');
  fs.renameSync(tmp, USERS_FILE);
  cache = { mtimeMs: fs.statSync(USERS_FILE).mtimeMs, users };
}

export function loadUsers(): StoredUser[] {
  let stat: fs.Stats | null = null;
  try {
    stat = fs.statSync(USERS_FILE);
  } catch {
    stat = null;
  }
  if (!stat) {
    const seeded = seedUsers();
    writeUsers(seeded);
    audit('system', 'seed', { users: seeded.map((u) => `${u.email}:${u.role}`) });
    return seeded;
  }
  if (cache && cache.mtimeMs === stat.mtimeMs) return cache.users;
  const parsed = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) as { users?: StoredUser[] };
  const users = (parsed.users ?? []).filter((u) => u && typeof u.email === 'string' && isAdminRole(u.role));
  cache = { mtimeMs: stat.mtimeMs, users };
  return users;
}

function mutate<T>(fn: (users: StoredUser[]) => T): T {
  const users = loadUsers().map((u) => ({ ...u }));
  const result = fn(users);
  // Hata metni dönen işlemde (doğrulama başarısız) yarım değişiklik diske yazılmaz
  if (typeof result !== 'string') writeUsers(users);
  return result;
}

export function toPublic(u: StoredUser): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    hasPassword: Boolean(u.passwordHash),
    invitePending: Boolean(u.invite && u.invite.exp > Date.now()),
    inviteExpiresAt: u.invite ? new Date(u.invite.exp).toISOString() : null,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  };
}

export function findUserById(id: string): StoredUser | undefined {
  return loadUsers().find((u) => u.id === id);
}

// ── Denetim kaydı ───────────────────────────────────────────

export function audit(actor: string, action: string, detail: Record<string, unknown> = {}): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(AUDIT_FILE, JSON.stringify({ at: now(), actor, action, ...detail }) + '\n', 'utf8');
  } catch {
    // denetim kaydı yazılamasa da işlem engellenmez
  }
}

export function readAudit(limit = 100): Record<string, unknown>[] {
  try {
    const lines = fs.readFileSync(AUDIT_FILE, 'utf8').trim().split('\n');
    return lines
      .slice(-limit)
      .reverse()
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

// ── Şifre ───────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

// Bilinmeyen e-postada da aynı maliyette hesap yapılsın (zamanlama ile hesap tespiti olmasın)
const DUMMY_HASH = hashPassword(randomBytes(16).toString('hex'));

function verifyHash(stored: string, password: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split(':');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length || 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır.`;
  }
  if (password.length > 200) return 'Şifre çok uzun.';
  return null;
}

export function authenticateUser(email: string, password: string): StoredUser | null {
  const user = loadUsers().find((u) => u.email === email.trim().toLowerCase());
  const usable = user && user.status === 'active' && user.passwordHash;
  const ok = verifyHash(usable ? user.passwordHash! : DUMMY_HASH, password);
  if (!usable || !ok) return null;
  return mutate((users) => {
    const u = users.find((x) => x.id === user.id)!;
    u.lastLoginAt = now();
    return u;
  });
}

export function changeOwnPassword(id: string, current: string, next: string): string | null {
  const user = findUserById(id);
  if (!user?.passwordHash || !verifyHash(user.passwordHash, current)) return 'Mevcut şifre hatalı.';
  const problem = passwordProblem(next);
  if (problem) return problem;
  mutate((users) => {
    const u = users.find((x) => x.id === id)!;
    u.passwordHash = hashPassword(next);
    u.sv += 1;
    u.updatedAt = now();
  });
  return null;
}

// ── Davet ───────────────────────────────────────────────────

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

/** Yeni davet belirteci üretir; düz belirteç yalnızca bir kez döner. */
export function issueInvite(id: string): string {
  const token = randomBytes(32).toString('base64url');
  mutate((users) => {
    const u = users.find((x) => x.id === id);
    if (!u) throw new Error('Kullanıcı bulunamadı.');
    u.invite = { hash: tokenHash(token), exp: Date.now() + INVITE_TTL_MS };
    u.updatedAt = now();
  });
  return token;
}

export function inviteTarget(token: string): StoredUser | null {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null;
  const h = tokenHash(token);
  const user = loadUsers().find((u) => u.invite && u.invite.hash === h);
  return user && user.invite!.exp > Date.now() && user.status === 'active' ? user : null;
}

export function acceptInvite(token: string, password: string): StoredUser | string {
  const user = inviteTarget(token);
  if (!user) return 'Davet bağlantısı geçersiz veya süresi dolmuş.';
  const problem = passwordProblem(password);
  if (problem) return problem;
  return mutate((users) => {
    const u = users.find((x) => x.id === user.id)!;
    u.passwordHash = hashPassword(password);
    u.invite = null;
    u.sv += 1;
    u.updatedAt = now();
    return u;
  });
}

// ── Yönetim (yalnızca Süper Admin rotasından çağrılır) ──────

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;

function activeSuperadmins(users: StoredUser[]): StoredUser[] {
  return users.filter((u) => u.role === 'superadmin' && u.status === 'active');
}

export function createUser(input: { email: unknown; name: unknown; role: unknown }): StoredUser | string {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!EMAIL_RE.test(email)) return 'Geçerli bir e-posta adresi girin.';
  if (name.length < 2 || name.length > 80) return 'Ad soyad 2–80 karakter olmalıdır.';
  if (!isAdminRole(input.role)) return 'Geçersiz rol.';
  const role = input.role;
  return mutate((users) => {
    if (users.some((u) => u.email === email)) return 'Bu e-posta ile bir hesap zaten var.';
    const user: StoredUser = {
      id: randomUUID(),
      email,
      name,
      role,
      status: 'active',
      passwordHash: null,
      invite: null,
      sv: 1,
      createdAt: now(),
      updatedAt: now(),
      lastLoginAt: null,
    };
    users.push(user);
    return user;
  });
}

export function updateUser(
  actorId: string,
  id: string,
  patch: { name?: unknown; role?: unknown; status?: unknown }
): StoredUser | string {
  return mutate((users) => {
    const u = users.find((x) => x.id === id);
    if (!u) return 'Kullanıcı bulunamadı.';
    if (patch.name !== undefined) {
      const name = typeof patch.name === 'string' ? patch.name.trim() : '';
      if (name.length < 2 || name.length > 80) return 'Ad soyad 2–80 karakter olmalıdır.';
      u.name = name;
    }
    let securityChange = false;
    if (patch.role !== undefined && patch.role !== u.role) {
      if (!isAdminRole(patch.role)) return 'Geçersiz rol.';
      if (id === actorId) return 'Kendi rolünüzü değiştiremezsiniz.';
      u.role = patch.role;
      securityChange = true;
    }
    if (patch.status !== undefined && patch.status !== u.status) {
      if (patch.status !== 'active' && patch.status !== 'disabled') return 'Geçersiz durum.';
      if (id === actorId) return 'Kendi hesabınızı pasifleştiremezsiniz.';
      u.status = patch.status;
      securityChange = true;
    }
    if (activeSuperadmins(users).length === 0) return 'En az bir aktif Süper Admin kalmalıdır.';
    if (securityChange) u.sv += 1;
    u.updatedAt = now();
    return u;
  });
}

export function deleteUser(actorId: string, id: string): StoredUser | string {
  return mutate((users) => {
    const i = users.findIndex((x) => x.id === id);
    if (i < 0) return 'Kullanıcı bulunamadı.';
    if (id === actorId) return 'Kendi hesabınızı silemezsiniz.';
    const [removed] = users.splice(i, 1);
    if (activeSuperadmins(users).length === 0) {
      users.splice(i, 0, removed);
      return 'En az bir aktif Süper Admin kalmalıdır.';
    }
    return removed;
  });
}
