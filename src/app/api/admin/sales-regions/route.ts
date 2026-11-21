import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/admin-auth';
import { audit, loadUsers } from '@/lib/admin-users';
import { cleanRegion, readRegions, regionOf, saveRegion } from '@/lib/sales-regions';

const NO_STORE = { 'Cache-Control': 'no-store' };

/** GET → (ayar yetkisi) etkin kullanıcılar + bölgeleri; ?me=1 → (aday yetkisi) yalnız kendi bölgem */
export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get('me') === '1') {
    const denied = requireRole(request, 'prospects', 'read');
    if (denied) return denied;
    const me = getAdminSession(request);
    return NextResponse.json({ success: true, region: me ? regionOf(me.id) : null }, { headers: NO_STORE });
  }
  const denied = requireRole(request, 'settings', 'read');
  if (denied) return denied;
  const regions = readRegions();
  const users = loadUsers().filter((u) => u.status === 'active').map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, region: regions[u.id] ?? { cities: [], plz: [] } }));
  return NextResponse.json({ success: true, users }, { headers: NO_STORE });
}

/** PUT { userId, cities, plz } — boş liste bölgeyi kaldırır (kısıt yok) */
export async function PUT(request: Request) {
  const denied = requireRole(request, 'settings', 'write');
  if (denied) return denied;
  let b: { userId?: unknown; cities?: unknown; plz?: unknown } = {};
  try { b = await request.json(); } catch { /* aşağıda reddedilir */ }
  const user = loadUsers().find((u) => u.id === b.userId);
  if (!user) return NextResponse.json({ success: false, error: 'Kullanıcı bulunamadı.' }, { status: 404 });
  const region = cleanRegion(b);
  saveRegion(user.id, region);
  const who = getAdminSession(request);
  audit(who?.email ?? '?', 'sales-region', { user: user.email, ...region });
  return NextResponse.json({ success: true, region }, { headers: NO_STORE });
}
