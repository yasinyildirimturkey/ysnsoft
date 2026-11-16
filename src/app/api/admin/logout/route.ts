import { NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/admin-auth';

export async function POST() {
  const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
  return response;
}
