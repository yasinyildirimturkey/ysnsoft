import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';

export async function GET(request: Request) {
  const session = getAdminSession(request);
  return NextResponse.json(
    session
      ? { authenticated: true, user: { email: session.email, name: session.name, role: session.role } }
      : { authenticated: false },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
