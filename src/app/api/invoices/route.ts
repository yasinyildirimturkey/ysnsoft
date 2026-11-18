import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/admin-auth';
import { getRealInvoices, nextInvoiceNo, saveInvoice, updateInvoiceStatus, type InvoiceItem } from '@/lib/server-db';

/**
 * Panelin "Muhasebe & Finans" sekmesi: İÇ fatura / tahsilat kayıtları.
 * Resmi e-Fatura / e-Arşiv DEĞİLDİR; GİB'e bir şey gönderilmez. Eskiden "e-fatura oluşturuldu ve GİB portalına iletildi"
 * deniyor, rastgele ETTN üretiliyordu; panel ise bu rotayı hiç kullanmıyor, tarayıcıdaki 5 uydurma faturayı gösteriyordu.
 */
const NO_STORE = { 'Cache-Control': 'no-store' };
const STATUSES = ['paid', 'pending', 'overdue', 'cancelled'] as const;
const PAYMENT_TYPES = ['Havale / EFT', 'Sanal POS', 'Çek', 'Nakit'] as const;
const TAX_RATES = [0, 1, 7, 10, 19, 20];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const today = () => new Date().toISOString().slice(0, 10);

export async function GET(request: Request) {
  const denied = requireRole(request, 'muhasebe', 'read');
  if (denied) return denied;
  const invoices = getRealInvoices();
  const sum = (st: InvoiceItem['status']) => invoices.filter((i) => i.status === st).reduce((a, i) => a + i.totalAmount, 0);
  return NextResponse.json({
    success: true,
    stats: { paid: sum('paid'), pending: sum('pending'), overdue: sum('overdue'), count: invoices.length },
    data: invoices,
  }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const denied = requireRole(request, 'muhasebe', 'write');
  if (denied) return denied;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Geçersiz istek.' }, { status: 400 }); }

  const client = clip(body.client, 200);
  const amount = Number(body.amount);
  const taxRate = Number(body.taxRate ?? 20);
  if (!client) return NextResponse.json({ success: false, error: 'Müşteri adı zorunludur.' }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e9) return NextResponse.json({ success: false, error: 'Geçerli bir net tutar girin.' }, { status: 400 });
  if (!TAX_RATES.includes(taxRate)) return NextResponse.json({ success: false, error: 'Geçersiz KDV oranı.' }, { status: 400 });

  const issueDate = DATE_RE.test(String(body.issueDate)) ? String(body.issueDate) : today();
  const dueDate = DATE_RE.test(String(body.dueDate)) ? String(body.dueDate) : issueDate;
  const status = STATUSES.includes(body.status as (typeof STATUSES)[number]) ? (body.status as InvoiceItem['status']) : 'pending';
  const paymentType = PAYMENT_TYPES.includes(body.paymentType as (typeof PAYMENT_TYPES)[number]) ? (body.paymentType as InvoiceItem['paymentType']) : 'Havale / EFT';
  const net = Math.round(amount * 100) / 100;

  const invoice: InvoiceItem = {
    id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    invoiceNo: nextInvoiceNo(Number(issueDate.slice(0, 4))),
    client,
    taxNumber: clip(body.taxNumber, 20),
    product: clip(body.product, 200) || 'Yazılım hizmeti',
    amount: net,
    taxRate,
    totalAmount: Math.round(net * (1 + taxRate / 100) * 100) / 100,
    status,
    issueDate,
    dueDate,
    paymentType,
    createdAt: new Date().toISOString(),
  };
  try {
    saveInvoice(invoice);
  } catch {
    return NextResponse.json({ success: false, error: 'Kayıt yazılamadı.' }, { status: 500 });
  }
  return NextResponse.json({ success: true, message: `${invoice.invoiceNo} numaralı kayıt eklendi.`, invoice }, { status: 201, headers: NO_STORE });
}

export async function PATCH(request: Request) {
  const denied = requireRole(request, 'muhasebe', 'write');
  if (denied) return denied;
  let body: { id?: unknown; status?: unknown } = {};
  try { body = await request.json(); } catch { /* aşağıda reddedilir */ }
  if (typeof body.id !== 'string' || !STATUSES.includes(body.status as (typeof STATUSES)[number])) {
    return NextResponse.json({ success: false, error: 'Geçersiz istek.' }, { status: 400 });
  }
  return updateInvoiceStatus(body.id, body.status as InvoiceItem['status'])
    ? NextResponse.json({ success: true }, { headers: NO_STORE })
    : NextResponse.json({ success: false, error: 'Kayıt bulunamadı.' }, { status: 404 });
}
