import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import { listNotifications, markSeen, notify } from '@/lib/notifications';
import { addSubscription, listSubscriptions, removeSubscription, vapidKeys } from '@/lib/webpush';

/**
 * Bildirim merkezi + bu cihazda anlık bildirim aboneliği.
 * GET: son bildirimler, okunmamış sayısı, VAPID açık anahtarı, bu kullanıcının kayıtlı cihaz sayısı.
 * POST: seen | subscribe | unsubscribe | test
 */
const NO_STORE = { 'Cache-Control': 'no-store' };
const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status, headers: NO_STORE });

export async function GET(request: Request) {
  const me = getAdminSession(request);
  if (!me) return fail('Oturum gerekli.', 401);
  const mine = listSubscriptions().filter((s) => s.user === me.email).length;
  return NextResponse.json({ success: true, ...listNotifications(me.email), publicKey: vapidKeys().publicKey, devices: mine }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const me = getAdminSession(request);
  if (!me) return fail('Oturum gerekli.', 401);
  let body: { action?: string; subscription?: { endpoint: string; keys: { p256dh: string; auth: string } }; endpoint?: string; label?: string } = {};
  try { body = await request.json(); } catch { return fail('Geçersiz istek.'); }

  if (body.action === 'seen') { markSeen(me.email); return NextResponse.json({ success: true }, { headers: NO_STORE }); }
  if (body.action === 'subscribe') {
    try { addSubscription(body.subscription!, me.email, body.label); } catch (e) { return fail(e instanceof Error ? e.message : 'Abonelik kaydedilemedi.'); }
    return NextResponse.json({ success: true }, { headers: NO_STORE });
  }
  if (body.action === 'unsubscribe') {
    if (typeof body.endpoint !== 'string') return fail('Geçersiz istek.');
    removeSubscription(body.endpoint);
    return NextResponse.json({ success: true }, { headers: NO_STORE });
  }
  if (body.action === 'test') {
    const item = await notify({ kind: 'test', title: 'Bildirimler açık', body: `${me.name || me.email} için deneme bildirimi.`, url: '/admin' });
    return NextResponse.json({ success: true, id: item.id }, { headers: NO_STORE });
  }
  return fail('Bilinmeyen işlem.');
}
