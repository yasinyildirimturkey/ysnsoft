import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  authenticate,
  clearFailedAttempts,
  clientKey,
  createSessionToken,
  isAuthConfigured,
  lockedForSeconds,
  recordFailedAttempt,
  sessionCookieOptions,
} from '@/lib/admin-auth';

const noStore = { 'Cache-Control': 'no-store' };

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Yönetici girişi yapılandırılmamış. Sunucuda `node scripts/set-admin-password.js` çalıştırın.',
      },
      { status: 503, headers: noStore }
    );
  }

  const key = clientKey(request);
  const locked = lockedForSeconds(key);
  if (locked > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Çok fazla hatalı deneme. ${Math.ceil(locked / 60)} dakika sonra tekrar deneyin.`,
      },
      { status: 429, headers: { ...noStore, 'Retry-After': String(locked) } }
    );
  }

  let email = '';
  let password = '';
  try {
    const body = await request.json();
    email = typeof body?.email === 'string' ? body.email : '';
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    // geçersiz gövde → aşağıda hatalı giriş olarak ele alınır
  }

  const user = email && password ? authenticate(email, password) : null;
  if (!user) {
    recordFailedAttempt(key);
    return NextResponse.json(
      { success: false, error: 'E-posta adresi veya şifre hatalı.' },
      { status: 401, headers: noStore }
    );
  }

  const token = createSessionToken(user);
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Oturum oluşturulamadı.' },
      { status: 500, headers: noStore }
    );
  }

  clearFailedAttempts(key);
  const response = NextResponse.json({ success: true, user }, { headers: noStore });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
