import { NextResponse } from 'next/server';
import { clearFailedAttempts, clientKey, lockedForSeconds, recordFailedAttempt } from '@/lib/admin-auth';
import { acceptInvite, audit, inviteTarget, MIN_PASSWORD_LENGTH } from '@/lib/admin-users';

const noStore = { 'Cache-Control': 'no-store' };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: noStore });

async function readBody(request: Request): Promise<{ token: string; password: string }> {
  try {
    const body = await request.json();
    return {
      token: typeof body?.token === 'string' ? body.token : '',
      password: typeof body?.password === 'string' ? body.password : '',
    };
  } catch {
    return { token: '', password: '' };
  }
}

/**
 * Davet bağlantısı (oturum gerektirmez):
 *   { token }            → davetin kime ait olduğunu gösterir
 *   { token, password }  → şifreyi belirler, daveti kapatır
 * Belirteç gövdede gelir (URL'de değil); hatalı denemeler girişle aynı kilit sayacına işlenir.
 */
export async function POST(request: Request) {
  const key = `invite:${clientKey(request)}`;
  const locked = lockedForSeconds(key);
  if (locked > 0) {
    return json({ success: false, error: `Çok fazla hatalı deneme. ${Math.ceil(locked / 60)} dakika sonra tekrar deneyin.` }, 429);
  }

  const { token, password } = await readBody(request);
  if (!password) {
    const user = inviteTarget(token);
    if (!user) {
      recordFailedAttempt(key);
      return json({ success: false, error: 'Davet bağlantısı geçersiz veya süresi dolmuş.' }, 404);
    }
    return json({ success: true, email: user.email, name: user.name, minLength: MIN_PASSWORD_LENGTH });
  }

  const result = acceptInvite(token, password);
  if (typeof result === 'string') {
    if (!inviteTarget(token)) recordFailedAttempt(key);
    return json({ success: false, error: result }, 400);
  }
  clearFailedAttempts(key);
  audit(result.email, 'invite-accept');
  return json({ success: true, email: result.email });
}
