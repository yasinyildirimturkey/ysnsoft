import { NextResponse } from 'next/server';
import { clientKey, requireRole } from '@/lib/admin-auth';
import { notify } from '@/lib/notifications';
import { rateLimit } from '@/lib/rate-limit';
import { getRealAppointments, saveAppointment, updateAppointmentStatus, type AppointmentItem } from '@/lib/server-db';

/**
 * Sitedeki görüşme randevusu formu. Herkes POST edebilir; okuma/durum değişikliği yalnız panel yetkisiyle.
 * Eskiden müşteriye "Google Meet oluşturuldu, takvim davetiyesi gönderildi" deniyordu ve rastgele, var olmayan bir
 * Meet bağlantısı üretiliyordu; hiçbir davet gitmiyordu. Artık talep "beklemede" kaydedilir, ekip onaylar.
 */
const NO_STORE = { 'Cache-Control': 'no-store' };
const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'] as const;
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export async function GET(request: Request) {
  const denied = requireRole(request, 'appointments', 'read');
  if (denied) return denied;
  const appointments = getRealAppointments();
  return NextResponse.json({ success: true, count: appointments.length, data: appointments }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const wait = rateLimit('appointment', clientKey(request), 5, 10 * 60_000);
  if (wait) {
    return NextResponse.json({ success: false, error: 'Çok fazla deneme. Lütfen birkaç dakika sonra tekrar deneyin.' }, { status: 429, headers: { 'Retry-After': String(wait) } });
  }
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Geçersiz istek.' }, { status: 400 }); }

  const name = clip(body.name, 120);
  const email = clip(body.email, 200);
  const date = clip(body.date, 40);
  const time = clip(body.time, 20);
  if (!name || !email || !date || !time) return NextResponse.json({ success: false, error: 'İsim, e-posta, tarih ve saat seçimi zorunludur.' }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ success: false, error: 'Geçerli bir e-posta adresi girin.' }, { status: 400 });

  const apt: AppointmentItem = {
    id: `apt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name, email, date, time,
    phone: clip(body.phone, 40),
    projectFocus: clip(body.projectFocus, 160) || 'Genel görüşme',
    notes: clip(body.notes, 2000),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  try {
    saveAppointment(apt);
  } catch {
    return NextResponse.json({ success: false, error: 'Randevu kaydedilemedi. Lütfen telefonla ulaşın.' }, { status: 500 });
  }
  void notify({ kind: 'appointment', title: 'Yeni randevu talebi', body: `${name} · ${date} ${time} — ${apt.projectFocus}`, url: '/admin?m=appointments' }).catch(() => {});
  return NextResponse.json({ success: true, message: 'Randevu talebiniz alındı. Uygunluğu kontrol edip size e-postayla onay göndereceğiz.' }, { status: 201, headers: NO_STORE });
}

/** Panel: randevu durumunu değiştirir (onayla / tamamlandı / iptal). */
export async function PATCH(request: Request) {
  const denied = requireRole(request, 'appointments', 'write');
  if (denied) return denied;
  let body: { id?: unknown; status?: unknown } = {};
  try { body = await request.json(); } catch { /* aşağıda reddedilir */ }
  if (typeof body.id !== 'string' || !STATUSES.includes(body.status as (typeof STATUSES)[number])) {
    return NextResponse.json({ success: false, error: 'Geçersiz istek.' }, { status: 400 });
  }
  const ok = updateAppointmentStatus(body.id, body.status as AppointmentItem['status']);
  return ok
    ? NextResponse.json({ success: true }, { headers: NO_STORE })
    : NextResponse.json({ success: false, error: 'Randevu bulunamadı.' }, { status: 404 });
}
