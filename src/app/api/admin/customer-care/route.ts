import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/admin-auth';
import { buildReport, gbpDone, GBP_TASKS, PERIOD_RE, reportsOf, setGbpTask, type GbpTask } from '@/lib/customer-care';
import { runWebscout } from '@/lib/webscout';

const NO_STORE = { 'Cache-Control': 'no-store' };
const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

/** GET ?id=&period=YYYY-MM → GBP iş listesi + o müşterinin raporları */
export async function GET(request: Request) {
  const denied = requireRole(request, 'prospects', 'read');
  if (denied) return denied;
  const u = new URL(request.url);
  const id = Number(u.searchParams.get('id'));
  const period = u.searchParams.get('period') ?? '';
  if (!Number.isInteger(id) || id <= 0 || !PERIOD_RE.test(period)) return fail('Geçersiz istek.');
  return NextResponse.json({ success: true, tasks: GBP_TASKS, done: gbpDone(id, period), reports: reportsOf(id) }, { headers: NO_STORE });
}

/** POST { id, period, task, done } → GBP işini işaretle · { id, period, action: 'report' } → raporu şimdi üret */
export async function POST(request: Request) {
  const denied = requireRole(request, 'prospects', 'write');
  if (denied) return denied;
  let b: { id?: unknown; period?: unknown; task?: unknown; done?: unknown; action?: unknown } = {};
  try { b = await request.json(); } catch { /* aşağıda reddedilir */ }
  const id = Number(b.id);
  const period = String(b.period ?? '');
  if (!Number.isInteger(id) || id <= 0 || !PERIOD_RE.test(period)) return fail('Geçersiz istek.');

  if (b.action === 'report') {
    const res = await runWebscout<{ rows?: { status: string; website?: string | null; final_url?: string | null }[] }>(['query', '--id', String(id), '--min-score', '0', '--limit', '1']);
    const p = res.rows?.[0];
    if (!p) return fail('Aday bulunamadı.', 404);
    if (p.status !== 'won') return fail('Rapor yalnız kazanılan müşteri için.');
    const report = await buildReport(id, period, p.website || p.final_url || null);
    return NextResponse.json({ success: true, report }, { headers: NO_STORE });
  }

  if (!GBP_TASKS.some((t) => t.key === b.task) || typeof b.done !== 'boolean') return fail('Geçersiz iş.');
  setGbpTask(id, period, b.task as GbpTask, b.done);
  return NextResponse.json({ success: true, done: gbpDone(id, period) }, { headers: NO_STORE });
}
