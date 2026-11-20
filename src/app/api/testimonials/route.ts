import { NextResponse } from 'next/server';
import { publicTestimonials } from '@/lib/testimonials';

/** Ana sayfa: yalnız müşterinin izin verdiği ve panelde onaylanan yorumlar. */
export async function GET() {
  return NextResponse.json({ success: true, data: publicTestimonials() }, { headers: { 'Cache-Control': 'no-store' } });
}
