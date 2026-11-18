import { NextResponse } from 'next/server';
import { clientKey, requireRole } from '@/lib/admin-auth';
import { notify } from '@/lib/notifications';
import { rateLimit } from '@/lib/rate-limit';
import { getRealLeads, saveLead, updateLeadStatus, type LeadItem } from '@/lib/server-db';

/**
 * Sitedeki teklif formunun talepleri. Herkes POST edebilir (form); okuma ve durum değişikliği yalnız panel yetkisiyle.
 * Güvenlik: istemcinin gönderdiği id/durum/tarih YOK SAYILIR (eskiden aynı id ile gerçek bir talebin üstüne yazılabiliyordu);
 * alan uzunlukları sınırlıdır; IP başına 10 dakikada en çok 5 talep.
 */
const NO_STORE = { 'Cache-Control': 'no-store' };
const STATUSES = ['new', 'contacted', 'proposal_sent', 'closed'] as const;
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export async function GET(request: Request) {
  const denied = requireRole(request, 'leads', 'read');
  if (denied) return denied;
  const leads = getRealLeads();
  return NextResponse.json({ success: true, count: leads.length, data: leads }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const wait = rateLimit('lead', clientKey(request), 5, 10 * 60_000);
  if (wait) {
    return NextResponse.json({ success: false, error: 'Çok fazla deneme. Lütfen birkaç dakika sonra tekrar deneyin.' }, { status: 429, headers: { 'Retry-After': String(wait) } });
  }
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Geçersiz istek.' }, { status: 400 }); }

  const name = clip(body.name, 120);
  const email = clip(body.email, 200);
  const projectType = clip(body.projectType, 120);
  if (!name || !email || !projectType) return NextResponse.json({ success: false, error: 'İsim, e-posta ve proje tipi zorunludur.' }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ success: false, error: 'Geçerli bir e-posta adresi girin.' }, { status: 400 });

  const lead: LeadItem = {
    id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name, email, projectType,
    phone: clip(body.phone, 40),
    company: clip(body.company, 160),
    budget: clip(body.budget, 60) || 'Belirtilmedi',
    message: clip(body.message, 4000),
    source: clip(body.source, 60) || 'Web sitesi',
    createdAt: new Date().toISOString(),
    status: 'new',
  };
  try {
    saveLead(lead);
  } catch {
    return NextResponse.json({ success: false, error: 'Talep kaydedilemedi. Lütfen telefonla ulaşın.' }, { status: 500 });
  }
  // Ekibe anında haber (zil + telefon). Formun yanıtını bekletmez.
  void notify({ kind: 'lead', title: 'Yeni teklif talebi', body: `${name}${lead.company ? ` · ${lead.company}` : ''} — ${projectType}`, url: '/admin?m=leads' }).catch(() => {});
  return NextResponse.json({ success: true, message: 'Talebiniz alındı. En kısa sürede sizinle iletişime geçeceğiz.' }, { status: 201, headers: NO_STORE });
}

/** Panel: talebin durumunu değiştirir (tüm adminler aynı durumu görür). */
export async function PATCH(request: Request) {
  const denied = requireRole(request, 'leads', 'write');
  if (denied) return denied;
  let body: { id?: unknown; status?: unknown } = {};
  try { body = await request.json(); } catch { /* aşağıda reddedilir */ }
  if (typeof body.id !== 'string' || !STATUSES.includes(body.status as (typeof STATUSES)[number])) {
    return NextResponse.json({ success: false, error: 'Geçersiz istek.' }, { status: 400 });
  }
  const ok = updateLeadStatus(body.id, body.status as LeadItem['status']);
  return ok
    ? NextResponse.json({ success: true }, { headers: NO_STORE })
    : NextResponse.json({ success: false, error: 'Talep bulunamadı.' }, { status: 404 });
}
