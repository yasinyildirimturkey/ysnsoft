import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/admin-auth';
import { decideTestimonial, readTestimonials } from '@/lib/testimonials';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  const denied = requireRole(request, 'settings', 'read');
  if (denied) return denied;
  return NextResponse.json({ success: true, data: readTestimonials() }, { headers: NO_STORE });
}

/** Onay / ret / geri al: { id, status: 'approved' | 'rejected' | 'pending' } */
export async function PATCH(request: Request) {
  const denied = requireRole(request, 'settings', 'write');
  if (denied) return denied;
  let body: { id?: unknown; status?: unknown } = {};
  try { body = await request.json(); } catch { /* aşağıda reddedilir */ }
  if (typeof body.id !== 'string' || !['approved', 'rejected', 'pending'].includes(String(body.status))) {
    return NextResponse.json({ success: false, error: 'Geçersiz istek.' }, { status: 400 });
  }
  return decideTestimonial(body.id, body.status as 'approved' | 'rejected' | 'pending')
    ? NextResponse.json({ success: true }, { headers: NO_STORE })
    : NextResponse.json({ success: false, error: 'Yorum bulunamadı.' }, { status: 404 });
}
