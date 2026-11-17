/**
 * Yönetici kimlik doğrulaması — YALNIZCA SUNUCU.
 *
 * Bu dosyayı istemci bileşenlerinden import etmeyin. Kaynak kodda hiçbir gizli değer yoktur:
 *
 *   ADMIN_SESSION_SECRET  en az 32 karakterlik rastgele dize (yoksa giriş kapalı — fail closed)
 *
 * Hesaplar ve şifre özetleri `src/lib/admin-users.ts` deposundadır (data/admin-users.json).
 * Eski ortak ADMIN_PASSWORD_HASH yalnızca ilk tohumlamada Süper Admin'e aktarılır.
 * Yetki matrisi `src/lib/roles.ts` içindedir.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authenticateUser, findUserById } from '@/lib/admin-users';
import { can, type AccessLevel, type AdminModule, type AdminRole } from '@/lib/roles';

export type { AdminRole } from '@/lib/roles';

export const SESSION_COOKIE = 'ysn_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 saat

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

export interface AdminSession extends AdminUser {
  /** Oturum sürümü (hesap deposundaki `sv` ile eşleşmeli) */
  sv: number;
  /** Bitiş zamanı (epoch saniye) */
  exp: number;
}

// ── Yapılandırma ─────────────────────────────────────────────

function getSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function isAuthConfigured(): boolean {
  return Boolean(getSecret());
}

/** E-posta + şifreyi kullanıcı deposunda doğrular (her hesabın kendi şifresi vardır). */
export function authenticate(email: string, password: string): (AdminUser & { sv: number }) | null {
  const user = authenticateUser(email, password);
  return user ? { id: user.id, email: user.email, name: user.name, role: user.role, sv: user.sv } : null;
}

// ── Oturum belirteci (HMAC imzalı; hesap durumu her istekte depodan kontrol edilir) ──

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionToken(user: AdminUser & { sv: number }): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const session: AdminSession = {
    id: user.id,
    sv: user.sv,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token: string | undefined | null): AdminSession | null {
  const secret = getSecret();
  if (!secret || !token) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AdminSession;
    if (typeof session.exp !== 'number' || session.exp < Date.now() / 1000) return null;
    // Hesap silindi, pasifleşti, rolü ya da şifresi değiştiyse eski oturum düşer
    const user = typeof session.id === 'string' ? findUserById(session.id) : undefined;
    if (!user || user.status !== 'active' || user.sv !== session.sv) return null;
    return { ...session, email: user.email, name: user.name, role: user.role };
  } catch {
    return null;
  }
}

// ── İstek yardımcıları ───────────────────────────────────────

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq > -1 && part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

export function getAdminSession(request: Request): AdminSession | null {
  return verifySessionToken(readCookie(request, SESSION_COOKIE));
}

const unauthorized = () =>
  NextResponse.json(
    { success: false, error: 'Bu işlem için yönetici girişi gereklidir.' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } }
  );

const forbidden = () =>
  NextResponse.json(
    { success: false, error: 'Bu işlem için yetkiniz yok.' },
    { status: 403, headers: { 'Cache-Control': 'no-store' } }
  );

/** Yalnızca oturum kontrolü (rol fark etmez). Mümkünse `requireRole` kullanın. */
export function requireAdmin(request: Request): NextResponse | null {
  return getAdminSession(request) ? null : unauthorized();
}

/**
 * Oturum + rol yetkisi kontrolü.
 *
 *   const denied = requireRole(request, 'leads', 'write');
 *   if (denied) return denied;
 */
export function requireRole(request: Request, module: AdminModule, level: AccessLevel = 'read'): NextResponse | null {
  const session = getAdminSession(request);
  if (!session) return unauthorized();
  return can(session.role, module, level) ? null : forbidden();
}

// ── "Bizim cihaz" işareti ─────────────────────────────────────
// Panele bir kez girilen tarayıcı kalıcı olarak işaretlenir; oturum kapansa da o cihazdan açılan
// demolar müşteri açılışı sayılmaz (/demo/<token>). Kişisel veri değildir, yalnızca "1" taşır.
export const OWN_DEVICE_COOKIE = 'ysn_own_device';
export const ownDeviceCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 400, // tarayıcıların izin verdiği en uzun süre
};
export function isOwnDevice(request: Request): boolean {
  return readCookie(request, OWN_DEVICE_COOKIE) === '1';
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
};

// ── Deneme sınırı (kaba kuvvet koruması) ─────────────────────
// Tek süreçli sunucu (iisnode) için bellek içi sayaç yeterlidir.

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const failedAttempts = new Map<string, { count: number; resetAt: number }>();

export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

/** Kilitliyse kalan süreyi saniye olarak, değilse 0 döner. */
export function lockedForSeconds(key: string): number {
  const entry = failedAttempts.get(key);
  if (!entry) return 0;
  if (entry.resetAt <= Date.now()) {
    failedAttempts.delete(key);
    return 0;
  }
  return entry.count >= MAX_FAILED_ATTEMPTS ? Math.ceil((entry.resetAt - Date.now()) / 1000) : 0;
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = failedAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    failedAttempts.set(key, { count: 1, resetAt: now + LOCK_WINDOW_MS });
  } else {
    entry.count += 1;
  }
  // Harita sınırsız büyümesin
  if (failedAttempts.size > 5000) {
    for (const [k, v] of failedAttempts) if (v.resetAt <= now) failedAttempts.delete(k);
  }
}

export function clearFailedAttempts(key: string): void {
  failedAttempts.delete(key);
}
