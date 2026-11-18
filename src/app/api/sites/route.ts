import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/admin-auth';
import { getStoredSites, saveSite, deleteSite, SiteItem } from '@/lib/server-db';
import { publicHttpsUrl } from '@/lib/public-host';

export async function GET() {
  // Herkese açık yanıt: eski kayıtlardaki ölçülmemiş "stats" (500+ büro, %99.98 uptime…) gönderilmez
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sites = getStoredSites().map(({ stats, ...rest }) => rest);
  return NextResponse.json({
    success: true,
    count: sites.length,
    data: sites
  });
}

export async function POST(request: Request) {
  const denied = requireRole(request, 'domains', 'write');
  if (denied) return denied;

  try {
    const body = await request.json();
    const host = typeof body.domain === 'string' ? publicHttpsUrl(body.domain)?.hostname : undefined;
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
    if (!name || !host) {
      return NextResponse.json(
        { success: false, error: 'Proje adı ve geçerli bir alan adı (domain) zorunludur.' },
        { status: 400 }
      );
    }
    const text = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

    const site: SiteItem = {
      id: host.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
      name,
      tagline: text(body.tagline, 200),
      category: text(body.category, 60) || 'Web & SaaS',
      domain: host,
      liveUrl: (typeof body.liveUrl === 'string' && body.liveUrl.trim() && publicHttpsUrl(body.liveUrl)?.href) || `https://${host}`,
      status: ['active', 'in-progress', 'planned'].includes(body.status) ? body.status : 'active',
      // Eskiden ölçülmeyen "%99.9 uptime" varsayılanı yazılıyordu
      stats: {},
      features: Array.isArray(body.features) ? body.features.filter((f: unknown) => typeof f === 'string').slice(0, 12).map((f: string) => f.slice(0, 80)) : [],
      description: text(body.description, 600),
      bridgeEnabled: body.bridgeEnabled ?? true
    };

    const updated = saveSite(site);
    return NextResponse.json({
      success: true,
      message: `${site.name} başarıyla kaydedildi.`,
      site,
      allSites: updated
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Sunucu hatası' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const denied = requireRole(request, 'domains', 'write');
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const domain = searchParams.get('domain');

  const target = id || domain;
  if (!target) {
    return NextResponse.json(
      { success: false, error: 'Silinecek site için id veya domain parametresi gereklidir.' },
      { status: 400 }
    );
  }

  const updated = deleteSite(target);
  return NextResponse.json({
    success: true,
    message: `${target} başarıyla kaldırıldı.`,
    allSites: updated
  });
}
