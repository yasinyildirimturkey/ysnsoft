import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/admin-auth';
import { assignments, assignPartner, listPartners, partnerFor, upsertPartner } from '@/lib/partners';

const NO_STORE = { 'Cache-Control': 'no-store' };
const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

/** GET → ortaklar (+ ?id=<aday> o adayın ortağı) */
export async function GET(request: Request) {
  const denied = requireRole(request, 'prospects', 'read');
  if (denied) return denied;
  const id = Number(new URL(request.url).searchParams.get('id'));
  const counts: Record<string, number> = {};
  for (const pid of Object.values(assignments())) counts[pid] = (counts[pid] ?? 0) + 1;
  return NextResponse.json({
    success: true,
    partners: listPartners().map((p) => ({ ...p, prospects: counts[p.id] ?? 0 })),
    ...(Number.isInteger(id) && id > 0 ? { current: partnerFor(id)?.id ?? assignments()[String(id)] ?? null } : {}),
  }, { headers: NO_STORE });
}

/** POST { action: 'save', partner } (ayar yetkisi) · { action: 'assign', id, partnerId|null } (aday yetkisi) */
export async function POST(request: Request) {
  let b: { action?: unknown; partner?: Record<string, unknown>; id?: unknown; partnerId?: unknown } = {};
  try { b = await request.json(); } catch { /* aşağıda reddedilir */ }
  try {
    if (b.action === 'save') {
      const denied = requireRole(request, 'settings', 'write');
      if (denied) return denied;
      return NextResponse.json({ success: true, partner: upsertPartner(b.partner ?? {}) }, { headers: NO_STORE });
    }
    if (b.action === 'assign') {
      const denied = requireRole(request, 'prospects', 'write');
      if (denied) return denied;
      const id = Number(b.id);
      if (!Number.isInteger(id) || id <= 0) return fail('Geçersiz aday.');
      assignPartner(id, typeof b.partnerId === 'string' && b.partnerId ? b.partnerId : null);
      return NextResponse.json({ success: true }, { headers: NO_STORE });
    }
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Kaydedilemedi.');
  }
  return fail('Geçersiz işlem.');
}
