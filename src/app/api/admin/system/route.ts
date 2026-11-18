import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/admin-auth';
import { audit } from '@/lib/admin-users';
import { mailLayout, mailStatus, recentMails, sendMail } from '@/lib/mailer';
import { schedulerStatus, sendMorningSummary } from '@/lib/scheduler';

/**
 * Sistem durumu (ayarlar ekranı): e-posta yapılandırması, son gönderimler, zamanlanmış işlerin son çalışması.
 * POST: gerçek test e-postası ya da sabah özetini şimdi kendine gönderme. Şifreler hiçbir zaman dönmez.
 */
const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  const denied = requireRole(request, 'settings', 'read');
  if (denied) return denied;
  return NextResponse.json({ success: true, mail: mailStatus(), mails: recentMails(20), jobs: schedulerStatus() }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const denied = requireRole(request, 'settings', 'write');
  if (denied) return denied;
  const me = getAdminSession(request)!;
  let body: { action?: string } = {};
  try { body = await request.json(); } catch { /* boş gövde */ }

  if (body.action === 'test-mail') {
    const res = await sendMail({
      to: me.email,
      subject: 'YSNSOFT test e-postası',
      html: mailLayout('Test e-postası', `<p style="margin:0">Bu e-posta yönetim panelinden <b>${me.email}</b> için gönderildi. Sunucunun e-posta ayarları çalışıyor.</p>`),
      kind: 'test',
    });
    audit(me.email, 'mail-test', { status: res.status });
    return NextResponse.json({ success: res.ok, ...res, to: me.email }, { headers: NO_STORE });
  }

  if (body.action === 'morning-now') {
    const res = await sendMorningSummary({ to: [me.email], force: true });
    audit(me.email, 'morning-summary-now', { status: (res as { status?: string }).status ?? 'skipped' });
    return NextResponse.json({ success: true, ...res, to: me.email }, { headers: NO_STORE });
  }

  return NextResponse.json({ success: false, error: 'Bilinmeyen işlem.' }, { status: 400, headers: NO_STORE });
}
