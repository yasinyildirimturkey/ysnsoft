/**
 * Aday "kazanıldı" olunca Muhasebe'de BEKLEMEDE bir iç kayıt açar (teklif kurulum tutarı, €, %19 KDV).
 * Aynı aday için ikinci kayıt açılmaz. Teklif tutarı girilmemişse kayıt açılmaz, zile "elle açın" notu düşer.
 * Resmi fatura değildir; yalnız tahsilat takibi içindir.
 */
import { notify } from '@/lib/notifications';
import { getRealInvoices, nextInvoiceNo, saveInvoice, type InvoiceItem } from '@/lib/server-db';
import { runWebscout } from '@/lib/webscout';

interface ProspectRow { id: number; name: string; city?: string | null; offer_package?: string | null; offer_setup?: number | null; offer_monthly?: number | null }

const PACKAGE_LABEL: Record<string, string> = { start: 'Start', business: 'Business', premium: 'Premium' };
const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function recordWonInvoice(prospectId: number): Promise<'created' | 'exists' | 'no-offer' | 'error'> {
  try {
    if (getRealInvoices().some((i) => i.prospectId === prospectId && i.kind !== 'monthly')) return 'exists';
    const res = await runWebscout<{ rows?: ProspectRow[] }>(['query', '--id', String(prospectId), '--min-score', '0', '--limit', '1']);
    const p = res.rows?.[0];
    if (!p) return 'error';
    const setup = Number(p.offer_setup);
    if (!Number.isFinite(setup) || setup <= 0) {
      await notify({ kind: 'won', title: 'Kazanıldı — teklif tutarı yok', body: `${p.name}: teklif girilmediği için muhasebe kaydı açılmadı; elle ekleyin.`, url: '/admin?m=muhasebe' }).catch(() => {});
      return 'no-offer';
    }
    const pkg = PACKAGE_LABEL[p.offer_package ?? ''] ?? p.offer_package ?? 'Web sitesi';
    const monthlyFee = Number(p.offer_monthly) > 0 ? Number(p.offer_monthly) : 0;
    const monthly = monthlyFee ? ` + ${monthlyFee} €/ay bakım (her ay ayrı kayıt)` : '';
    const now = new Date();
    const issueDate = iso(now);
    const item: InvoiceItem = {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      invoiceNo: nextInvoiceNo(now.getFullYear()),
      client: `${p.name}${p.city ? ` (${p.city})` : ''}`,
      taxNumber: '',
      product: `Web sitesi ${pkg} — kurulum${monthly}`,
      amount: setup,
      taxRate: 19,
      totalAmount: Math.round(setup * 1.19 * 100) / 100,
      status: 'pending',
      issueDate,
      dueDate: iso(new Date(now.getTime() + 14 * 86_400_000)),
      paymentType: 'Havale / EFT',
      createdAt: now.toISOString(),
      currency: 'EUR',
      prospectId,
      kind: 'setup',
      ...(monthlyFee ? { monthly: monthlyFee } : {}),
    };
    saveInvoice(item);
    await notify({ kind: 'won', title: 'Kazanıldı 🎉', body: `${p.name}: ${item.invoiceNo} numaralı tahsilat kaydı açıldı (${setup} € + KDV).`, url: '/admin?m=muhasebe' }).catch(() => {});
    return 'created';
  } catch {
    return 'error';
  }
}

/**
 * Aylık bakım: kurulum kaydı olan ve aylık bedeli > 0 olan her müşteri için, kazanıldığı aydan SONRAKİ her ay
 * bir kez beklemede kayıt açar (dönem = YYYY-AA). Zamanlayıcı her gün çağırır; aynı dönem için ikinci kayıt açılmaz,
 * böylece sunucu ayın ilk günü kapalı olsa bile kayıt kaçmaz. İptal edilmiş kurulum kaydının bakımı açılmaz.
 */
export async function createMonthlyRecords(day: string): Promise<{ created: number; customers: number }> {
  const period = day.slice(0, 7);
  const all = getRealInvoices();
  const setups = all.filter((i) => i.kind === 'setup' && i.prospectId && (i.monthly ?? 0) > 0 && i.status !== 'cancelled' && i.issueDate.slice(0, 7) < period);
  let created = 0;
  for (const s of setups) {
    if (all.some((i) => i.kind === 'monthly' && i.prospectId === s.prospectId && i.period === period)) continue;
    const fee = s.monthly as number;
    const issue = new Date(`${day}T12:00:00Z`);
    const item: InvoiceItem = {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      invoiceNo: nextInvoiceNo(issue.getUTCFullYear()),
      client: s.client,
      taxNumber: s.taxNumber,
      product: `Aylık bakım ${period}`,
      amount: fee,
      taxRate: s.taxRate,
      totalAmount: Math.round(fee * (1 + s.taxRate / 100) * 100) / 100,
      status: 'pending',
      issueDate: day,
      dueDate: iso(new Date(issue.getTime() + 14 * 86_400_000)),
      paymentType: s.paymentType,
      createdAt: new Date().toISOString(),
      currency: s.currency ?? 'EUR',
      prospectId: s.prospectId,
      kind: 'monthly',
      period,
    };
    saveInvoice(item);
    all.push(item);
    created++;
  }
  if (created) {
    await notify({ kind: 'monthly', title: 'Aylık bakım kayıtları', body: `${period} için ${created} bakım kaydı açıldı.`, url: '/admin?m=muhasebe' }).catch(() => {});
  }
  return { created, customers: setups.length };
}
