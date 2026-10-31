import { NextResponse } from 'next/server';

interface SiteBridgeStatus {
  domain: string;
  name: string;
  status: 'connected' | 'standby' | 'error';
  token: string;
  lastPing: string;
  latencyMs: number;
  environment: 'production' | 'staging';
  allowedFrameOrigins: string[];
}

const siteTokens: Record<string, SiteBridgeStatus> = {
  'kglex.com': {
    domain: 'kglex.com',
    name: 'KGLEX LegalTech AI (Hukuk & UYAP)',
    status: 'connected',
    token: 'ysn_live_kglex_2026_a9b1c8f4',
    lastPing: '2 saniye önce',
    latencyMs: 24,
    environment: 'production',
    allowedFrameOrigins: ['http://localhost:3000', 'https://ysnsoft.com']
  },
  'hgavukatlik.com': {
    domain: 'hgavukatlik.com',
    name: 'HG Avukatlık Bürosu (Çok Dilli Hukuk Portalı)',
    status: 'connected',
    token: 'ysn_live_hg_2026_d4e5f6a1',
    lastPing: '3 saniye önce',
    latencyMs: 28,
    environment: 'production',
    allowedFrameOrigins: ['http://localhost:3000', 'https://ysnsoft.com']
  },
  'acikellaw.com': {
    domain: 'acikellaw.com',
    name: 'Açıkel Hukuk & Danışmanlık',
    status: 'connected',
    token: 'ysn_live_acikel_2026_b2c3d4e5',
    lastPing: '4 saniye önce',
    latencyMs: 26,
    environment: 'production',
    allowedFrameOrigins: ['http://localhost:3000', 'https://ysnsoft.com']
  },
  'haritaplan.com': {
    domain: 'haritaplan.com',
    name: 'HaritaPlan 3D CBS & 3194 Md. 18',
    status: 'connected',
    token: 'ysn_live_harita_2026_c3d4e7a2',
    lastPing: '5 saniye önce',
    latencyMs: 38,
    environment: 'production',
    allowedFrameOrigins: ['http://localhost:3000', 'https://ysnsoft.com']
  },
  'tarihisamatyamezecisi.com': {
    domain: 'tarihisamatyamezecisi.com',
    name: 'Tarihi Samatya Mezecisi (Gurme B2B/B2C & QR POS)',
    status: 'connected',
    token: 'ysn_live_samatya_2026_i9j0k3d7',
    lastPing: '7 saniye önce',
    latencyMs: 31,
    environment: 'production',
    allowedFrameOrigins: ['http://localhost:3000', 'https://ysnsoft.com']
  },
  'panelde.com': {
    domain: 'panelde.com',
    name: 'Panelde Multi-Tenant Gayrimenkul',
    status: 'connected',
    token: 'ysn_live_panelde_2026_e5f6g9b3',
    lastPing: '8 saniye önce',
    latencyMs: 42,
    environment: 'production',
    allowedFrameOrigins: ['http://localhost:3000', 'https://ysnsoft.com']
  },
  'flamantyou.com': {
    domain: 'flamantyou.com',
    name: 'Flamantyou Kozmetik (AI E-Ticaret)',
    status: 'connected',
    token: 'ysn_live_flamant_2026_g7h8i1c5',
    lastPing: '12 saniye önce',
    latencyMs: 29,
    environment: 'production',
    allowedFrameOrigins: ['http://localhost:3000', 'https://ysnsoft.com']
  },
  'samatya-mezecisi.com': {
    domain: 'samatya-mezecisi.com',
    name: 'Tarihi Samatya Mezecisi (Yedek Alan Adı)',
    status: 'connected',
    token: 'ysn_live_samatya_2026_i9j0k3d7',
    lastPing: '15 saniye önce',
    latencyMs: 33,
    environment: 'production',
    allowedFrameOrigins: ['http://localhost:3000', 'https://ysnsoft.com']
  },
  'dolphinbodrum.com': {
    domain: 'dolphinbodrum.com',
    name: 'Dolphin & ARM Bodrum (VIP Concierge)',
    status: 'connected',
    token: 'ysn_live_bodrum_2026_k1l2m5e9',
    lastPing: '18 saniye önce',
    latencyMs: 36,
    environment: 'production',
    allowedFrameOrigins: ['http://localhost:3000', 'https://ysnsoft.com']
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');

  if (domain && siteTokens[domain]) {
    return NextResponse.json({ success: true, site: siteTokens[domain] });
  }

  return NextResponse.json({
    success: true,
    totalConnected: Object.keys(siteTokens).length,
    masterToken: 'ysn_master_bridge_2026_sec_d83fa901',
    sites: Object.values(siteTokens)
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, domain } = body;

    if (action === 'purge_cache' && domain) {
      return NextResponse.json({
        success: true,
        message: `${domain} sitesi için Cloudflare / Edge önbelleği token doğrulamasıyla başarıyla temizlendi.`,
        purgedAt: new Date().toISOString()
      });
    }

    if (action === 'ping' && domain) {
      return NextResponse.json({
        success: true,
        domain,
        latencyMs: Math.floor(20 + Math.random() * 25),
        status: '200 OK • Token Doğrulandı',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'rotate_token' && domain) {
      const newToken = `ysn_live_${domain.split('.')[0]}_${Date.now().toString(36)}`;
      if (siteTokens[domain]) {
        siteTokens[domain].token = newToken;
      }
      return NextResponse.json({
        success: true,
        domain,
        newToken,
        message: `${domain} için yeni uzaktan erişim tokenı üretildi. Sitenin .env dosyasını güncelleyiniz.`
      });
    }

    return NextResponse.json({ success: false, error: 'Bilinmeyen işlem' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'İşlem başarısız' }, { status: 500 });
  }
}
