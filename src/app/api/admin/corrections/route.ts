import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/admin-auth';
import { readCorrections, updateCorrection } from '@/lib/corrections';
import { applyChanges } from '@/lib/draft-text';
import { readWebscoutDraft, writeWebscoutDraftHtml } from '@/lib/webscout';

const NO_STORE = { 'Cache-Control': 'no-store' };
const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

/** GET ?id=<aday> → o adayın metin düzeltme talepleri (yeniden eskiye) */
export async function GET(request: Request) {
  const denied = requireRole(request, 'prospects', 'read');
  if (denied) return denied;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return fail('Geçersiz istek.');
  return NextResponse.json({ success: true, data: readCorrections().filter((c) => c.prospectId === id) }, { headers: NO_STORE });
}

/** POST { id, action: 'apply' | 'dismiss' | 'reopen' } — apply: değişiklikleri demoya yazar (Türkçe sürüm silinir) */
export async function POST(request: Request) {
  const denied = requireRole(request, 'prospects', 'write');
  if (denied) return denied;
  let b: { id?: unknown; action?: unknown } = {};
  try { b = await request.json(); } catch { /* aşağıda reddedilir */ }
  const c = readCorrections().find((x) => x.id === b.id);
  if (!c) return fail('Talep bulunamadı.', 404);
  if (b.action === 'dismiss' || b.action === 'reopen') {
    updateCorrection(c.id, { status: b.action === 'dismiss' ? 'dismissed' : 'open' });
    return NextResponse.json({ success: true }, { headers: NO_STORE });
  }
  if (b.action !== 'apply') return fail('Geçersiz işlem.');
  const draft = readWebscoutDraft(c.token);
  if (draft.state !== 'ok') return fail('Demo bulunamadı ya da süresi dolmuş.');
  const { html, replaced } = applyChanges(draft.data.toString('utf8'), c.changes);
  if (replaced && !writeWebscoutDraftHtml(c.token, html)) return fail('Demo yazılamadı.', 500);
  updateCorrection(c.id, { status: 'applied', replaced });
  return NextResponse.json({ success: true, replaced }, { headers: NO_STORE });
}
