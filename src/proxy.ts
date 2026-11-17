import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { OWN_DEVICE_COOKIE, ownDeviceCookieOptions, SESSION_COOKIE, verifySessionToken } from '@/lib/admin-auth';

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

  // Zaten girişli cihazlar da işaretlensin (yalnızca girişte değil): demo açılışları bizden sayılmaz
  const response = NextResponse.next();
  if (request.cookies.get(OWN_DEVICE_COOKIE)?.value !== '1') {
    response.cookies.set(OWN_DEVICE_COOKIE, '1', ownDeviceCookieOptions);
  }
  return response;
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
