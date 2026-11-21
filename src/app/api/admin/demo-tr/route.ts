import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/admin-auth';
import { readTrStatus, readWebscoutDraftTr, runWebscout, startWebscoutJob } from '@/lib/webscout';

/**
 * Demonun Türkçe sürümü: POST { id } arka planda çeviriyi başlatır (ücretsiz model; birkaç dakika),
 * GET ?id= durumu döner. Türkçe sayfa /demo/<kod>?lang=tr adresinde açılır.
 */
const NO_STORE = { 'Cache-Control': 'no-store' };
const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

async function tokenOf(id: number) {
  const res = await runWebscout<{ rows?: { draft_token?: string | null }[] }>(['query', '--id', String(id), '--min-score', '0', '--limit', '1']);
  return res.rows?.[0]?.draft_token ?? null;
}

export async function GET(request: Request) {
  const denied = requireRole(request, 'prospects', 'read');
  if (denied) return denied;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return fail('Geçersiz istek.');
  const token = await tokenOf(id);
  if (!token) return NextResponse.json({ success: true, status: null, ready: false }, { headers: NO_STORE });
  return NextResponse.json({ success: true, status: readTrStatus(token), ready: Boolean(readWebscoutDraftTr(token)) }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const denied = requireRole(request, 'prospects', 'write');
  if (denied) return denied;
  let b: { id?: unknown } = {};
  try { b = await request.json(); } catch { /* aşağıda reddedilir */ }
  const id = Number(b.id);
  if (!Number.isInteger(id) || id <= 0) return fail('Geçersiz istek.');
  const token = await tokenOf(id);
  if (!token) return fail('Bu adayın demosu yok.');
  const st = readTrStatus(token);
  // Aynı demo için ikinci iş başlatılmaz (10 dakikadan eski "running" takılmış sayılır)
  if (st?.state === 'running' && st.at && Date.now() - new Date(st.at).getTime() < 10 * 60_000) return fail('Çeviri zaten sürüyor.');
  startWebscoutJob(['--id', String(id)], 'draft-translate');
  return NextResponse.json({ success: true }, { headers: NO_STORE });
}
