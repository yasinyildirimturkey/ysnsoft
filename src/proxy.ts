import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/admin-auth';

/**
 * /admin sayfalarını oturumsuz ziyaretçilere kapatır.
 * API rotaları ayrıca kendi içinde `requireAdmin` ile korunur; bu dosya
 * yalnızca sayfa yönlendirmesi içindir, tek başına güvenlik sınırı değildir.
 */
export function proxy(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const isLoginPage = request.nextUrl.pathname === '/admin/login';
  // Davet bağlantısı oturumsuz açılır; belirteç sunucuda /api/admin/invite ile doğrulanır
  if (request.nextUrl.pathname === '/admin/davet') return NextResponse.next();

  if (isLoginPage) {
    return session ? NextResponse.redirect(new URL('/admin', request.url)) : NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
