/**
 * Yönetici kimlik doğrulaması — YALNIZCA SUNUCU.
 *
 * Bu dosyayı istemci bileşenlerinden import etmeyin. Şifre özeti ve oturum
 * anahtarı ortam değişkenlerinden okunur; kaynak kodda hiçbir gizli değer yoktur:
 *
 *   ADMIN_PASSWORD_HASH   scrypt:<salt-hex>:<hash-hex>  (scripts/set-admin-password.js üretir)
 *   ADMIN_SESSION_SECRET  en az 32 karakterlik rastgele dize
 *
 * İkisinden biri eksikse giriş kapalıdır (fail closed).
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

export const SESSION_COOKIE = 'ysn_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 saat

export type AdminRole = 'superadmin' | 'accounting' | 'sales' | 'engineer';

export interface AdminUser {
  email: string;
  name: string;
  role: AdminRole;
}

export interface AdminSession extends AdminUser {
  /** Bitiş zamanı (epoch saniye) */
  exp: number;
}

/** Giriş yapabilen hesaplar. Şifre burada tutulmaz. */
const ADMIN_USERS: AdminUser[] = [
  { email: 'yasin@ysnsoft.com', name: 'Yasin Yıldırım', role: 'superadmin' },
  { email: 'destek@ysnsoft.com', name: 'YSNSOFT Destek Ekibi', role: 'engineer' },
  { email: 'info@ysnsoft.com', name: 'YSNSOFT Kurumsal İletişim', role: 'sales' },
  { email: 'noreply@ysnsoft.com', name: 'Sistem & E-Posta Bildirimleri', role: 'accounting' },
];

// ── Yapılandırma ─────────────────────────────────────────────

function getSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function isAuthConfigured(): boolean {
  return Boolean(getSecret() && process.env.ADMIN_PASSWORD_HASH);
}

// ── Şifre ────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(password: string): boolean {
  const stored = process.env.ADMIN_PASSWORD_HASH ?? '';
  const [scheme, saltHex, hashHex] = stored.split(':');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length || 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * E-posta + şifreyi doğrular. Bilinmeyen e-postada da şifre hesabı yapılır ki
 * yanıt süresi hangi hesapların var olduğunu ele vermesin.
 */
export function authenticate(email: string, password: string): AdminUser | null {
  const user = ADMIN_USERS.find((u) => u.email === email.trim().toLowerCase());
  const passwordOk = verifyPassword(password);
  return user && passwordOk ? user : null;
}

// ── Oturum belirteci (HMAC imzalı, durumsuz) ─────────────────

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionToken(user: AdminUser): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const session: AdminSession = {
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
    // Hesap listeden çıkarıldıysa eski oturumu da geçersiz say
    if (!ADMIN_USERS.some((u) => u.email === session.email && u.role === session.role)) return null;
    return session;
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

/**
 * Rota işleyicilerinin başında çağrılır. Oturum yoksa 401 yanıtı döner;
 * varsa `null` döner ve işleyici devam eder.
 *
 *   const denied = requireAdmin(request);
 *   if (denied) return denied;
 */
export function requireAdmin(request: Request): NextResponse | null {
  if (getAdminSession(request)) return null;
  return NextResponse.json(
    { success: false, error: 'Bu işlem için yönetici girişi gereklidir.' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } }
  );
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
