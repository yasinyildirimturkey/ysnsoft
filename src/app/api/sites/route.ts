import { NextResponse } from 'next/server';
import { getStoredSites, saveSite, deleteSite, SiteItem } from '@/lib/server-db';

export async function GET() {
  const sites = getStoredSites();
  return NextResponse.json({
    success: true,
    count: sites.length,
    data: sites
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name || !body.domain) {
      return NextResponse.json(
        { success: false, error: 'Proje adı ve alan adı (domain) zorunludur.' },
        { status: 400 }
      );
    }

    const site: SiteItem = {
      id: body.id || body.domain.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
      name: body.name,
      tagline: body.tagline || '',
      category: body.category || 'Web & SaaS',
      domain: body.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''),
      liveUrl: body.liveUrl || `https://${body.domain}`,
      status: body.status || 'active',
      stats: body.stats || { uptime: '%99.9' },
      features: Array.isArray(body.features) ? body.features : [],
      description: body.description || '',
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
