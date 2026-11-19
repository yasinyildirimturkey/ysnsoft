'use client';

/**
 * Teklif talepleri ve randevular — tarayıcı tarafı. Eskiden panel bunları yalnız KENDİ tarayıcısında (localStorage) tutuyordu:
 * sitedeki gerçek talepler sunucuya yazılıyor ama panelde hiç görünmüyordu; panel 4 uydurma örnek gösteriyordu.
 * Artık tek kaynak sunucudur (data/leads.json, data/appointments.json); panel oradan okur, durum değişikliği oraya yazılır.
 */
import type { Appointment, InvoiceRecord, Lead, SystemSettings } from '@/lib/store';
import { PRODUCTS, type Product } from '@/data/products';

interface ServerLead { id: string; name: string; email: string; phone?: string; company?: string; budget?: string; projectType: string; message?: string; createdAt: string; status?: 'new' | 'contacted' | 'proposal_sent' | 'closed' }
interface ServerAppointment { id: string; name: string; email: string; phone?: string; date: string; time: string; projectFocus: string; notes?: string; status: 'confirmed' | 'pending' | 'completed' | 'cancelled'; createdAt: string }

const LEAD_STATUS: Record<NonNullable<ServerLead['status']>, Lead['status']> = { new: 'Yeni', contacted: 'İnceleniyor', proposal_sent: 'Teklif Gönderildi', closed: 'Tamamlandı' };
const LEAD_STATUS_REV = Object.fromEntries(Object.entries(LEAD_STATUS).map(([k, v]) => [v, k])) as Record<Lead['status'], ServerLead['status']>;
const APT_STATUS: Record<ServerAppointment['status'], Appointment['status']> = { pending: 'Beklemede', confirmed: 'Onaylandı', completed: 'Tamamlandı', cancelled: 'Beklemede' };
const APT_STATUS_REV: Record<Appointment['status'], ServerAppointment['status']> = { Beklemede: 'pending', Onaylandı: 'confirmed', Tamamlandı: 'completed' };

const fmt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

async function json<T>(res: Response): Promise<T> {
  const j = await res.json().catch(() => null);
  if (!res.ok || !j || j.success === false) throw new Error(j?.error || `İstek başarısız (HTTP ${res.status})`);
  return j as T;
}

export async function fetchLeads(): Promise<Lead[]> {
  const j = await json<{ data: ServerLead[] }>(await fetch('/api/leads', { cache: 'no-store' }));
  return j.data.map((l) => ({
    id: l.id, name: l.name, company: l.company ?? '', email: l.email, phone: l.phone ?? '', product: l.projectType,
    budget: l.budget ?? '', message: l.message ?? '', status: LEAD_STATUS[l.status ?? 'new'] ?? 'Yeni', date: fmt(l.createdAt),
  }));
}

export async function fetchAppointments(): Promise<Appointment[]> {
  const j = await json<{ data: ServerAppointment[] }>(await fetch('/api/appointments', { cache: 'no-store' }));
  return j.data.map((a) => ({
    id: a.id, name: a.name, company: a.notes ?? '', email: a.email, topic: a.projectFocus,
    dateStr: a.date, timeStr: a.time, status: APT_STATUS[a.status] ?? 'Beklemede',
  }));
}

export async function setLeadStatus(id: string, status: Lead['status']) {
  await json(await fetch('/api/leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: LEAD_STATUS_REV[status] }) }));
}
export async function setAppointmentStatus(id: string, status: Appointment['status']) {
  await json(await fetch('/api/appointments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: APT_STATUS_REV[status] }) }));
}

/** Sitedeki teklif formu: yalnız sunucu kabul ederse başarılı sayılır. */
export async function submitLead(lead: { name: string; company: string; email: string; phone: string; product: string; budget: string; message: string }) {
  return json<{ message: string }>(await fetch('/api/leads', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: lead.name, email: lead.email, phone: lead.phone, company: lead.company, budget: lead.budget, projectType: lead.product, message: lead.message, source: 'Web sitesi formu' }),
  }));
}

/** Sitedeki randevu formu: yalnız sunucu kabul ederse başarılı sayılır. */
export async function submitAppointment(apt: { name: string; company: string; email: string; topic: string; dateStr: string; timeStr: string }) {
  return json<{ message: string }>(await fetch('/api/appointments', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: apt.name, email: apt.email, date: apt.dateStr, time: apt.timeStr, projectFocus: apt.topic, notes: apt.company }),
  }));
}

// ── İç fatura / tahsilat kayıtları (Muhasebe sekmesi) ─────────────────────
// Resmi e-Fatura değildir; eskiden tarayıcıda 5 uydurma "GİB onaylı" fatura duruyordu.

interface ServerInvoice {
  id: string; invoiceNo: string; client: string; taxNumber: string; product: string; amount: number; taxRate: number; totalAmount: number;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled'; issueDate: string; dueDate: string; paymentType: InvoiceRecord['paymentType']; createdAt: string; currency?: 'TRY' | 'EUR';
}
const INV_STATUS: Record<ServerInvoice['status'], InvoiceRecord['status']> = { paid: 'Ödendi', pending: 'Beklemede', overdue: 'Vadesi Geçti', cancelled: 'İptal' };
const INV_STATUS_REV = Object.fromEntries(Object.entries(INV_STATUS).map(([k, v]) => [v, k])) as Record<InvoiceRecord['status'], ServerInvoice['status']>;
const trDate = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : iso);

const toRecord = (i: ServerInvoice): InvoiceRecord => ({
  id: i.id, invoiceNo: i.invoiceNo, client: i.client, taxNumber: i.taxNumber, product: i.product, amount: i.amount, taxRate: i.taxRate,
  totalAmount: i.totalAmount, status: INV_STATUS[i.status] ?? 'Beklemede', issueDate: trDate(i.issueDate), dueDate: trDate(i.dueDate), paymentType: i.paymentType, currency: i.currency ?? 'TRY',
});

export async function fetchInvoices(): Promise<InvoiceRecord[]> {
  const j = await json<{ data: ServerInvoice[] }>(await fetch('/api/invoices', { cache: 'no-store' }));
  return j.data.map(toRecord);
}

export async function createInvoice(inv: { client: string; taxNumber: string; product: string; amount: number; taxRate: number; paymentType: InvoiceRecord['paymentType']; status: InvoiceRecord['status']; issueDate: string; dueDate: string }) {
  const j = await json<{ invoice: ServerInvoice; message: string }>(await fetch('/api/invoices', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...inv, status: INV_STATUS_REV[inv.status] }),
  }));
  return { record: toRecord(j.invoice), message: j.message };
}

export async function setInvoiceStatus(id: string, status: InvoiceRecord['status']) {
  await json(await fetch('/api/invoices', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: INV_STATUS_REV[status] }) }));
}

// ── Site listesi (Site Kontrol Merkezi) ──────────────────────────────────
// Eskiden panelden eklenen site yalnız o tarayıcıya yazılıyordu; sitedeki vitrin ise sunucudaki listeyi okuyor.
interface ServerSite { id: string; name: string; tagline?: string; category?: string; domain: string; liveUrl?: string; status?: string; features?: string[]; description?: string }

/** Sunucudaki siteler, vitrindeki (LiveSiteShowcase) eşleştirmeyle aynı şekilde ürün kartına çevrilir. */
export async function fetchSites(): Promise<Product[]> {
  const j = await json<{ data: ServerSite[] }>(await fetch('/api/sites', { cache: 'no-store' }));
  const fromServer = j.data.map((s): Product => {
    const existing = PRODUCTS.find((p) => p.displayDomain === s.domain || p.id === s.id);
    if (existing) return { ...existing, displayDomain: s.domain, liveUrl: s.liveUrl || existing.liveUrl };
    return {
      id: s.id, name: s.name, tagline: s.tagline || s.name, category: 'saas', categoryLabel: s.category || 'Web & SaaS',
      badge: s.status === 'active' ? 'Canlıda' : 'Geliştiriliyor', shortDesc: s.description || s.tagline || '', longDesc: s.description || s.tagline || '',
      metrics: [], features: s.features || [], techStack: [], accentColor: '#0071E3', previewType: 'portal',
      liveUrl: s.liveUrl || `https://${s.domain}`, displayDomain: s.domain,
    };
  });
  // Statik ürünlerden sunucuda olmayanlar da listede kalır (vitrin de onları gösteriyor)
  const missing = PRODUCTS.filter((p) => !fromServer.some((s) => s.displayDomain === p.displayDomain));
  return [...fromServer, ...missing];
}

export async function addSite(site: { name: string; domain: string; liveUrl: string; category: string; tagline: string; description: string; features: string[] }) {
  return json<{ message: string }>(await fetch('/api/sites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(site) }));
}

export async function removeSite(id: string) {
  return json<{ message: string }>(await fetch(`/api/sites?id=${encodeURIComponent(id)}`, { method: 'DELETE' }));
}

// ── Şirket ayarları (teklif belgesi) ──────────────────────────────────────
export async function fetchSettings(): Promise<SystemSettings> {
  return (await json<{ data: SystemSettings }>(await fetch('/api/admin/settings', { cache: 'no-store' }))).data;
}
export async function saveSettings(s: SystemSettings): Promise<SystemSettings> {
  return (await json<{ data: SystemSettings }>(await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) }))).data;
}
