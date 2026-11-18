import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { requireRole } from '@/lib/admin-auth';
import { publicHttpsUrl } from '@/lib/public-host';

// Eskiden her site için sabit "connected / 2 saniye önce / 24 ms" yazıyordu; bunlar ölçüm değildi.
// Gerçek durum yalnız "ping" işlemiyle (siteye gerçek HTTPS isteği) öğrenilir.
interface SiteBridgeStatus {
  domain: string;
  name: string;
  environment: 'production' | 'staging';
  allowedFrameOrigins: string[];
}

const SITES: Record<string, SiteBridgeStatus> = {
  'kglex.com': {
    domain: 'kglex.com',
    name: 'KGLEX LegalTech AI (Hukuk & UYAP)',
    environment: 'production',
    allowedFrameOrigins: ['http://localhost:3000', 'https://ysnsoft.com']
  },
  'hgavukatlik.com': {
    domain: 'hgavukatlik.com',
    name: 'HG Avukatlık Bürosu (Çok Dilli Hukuk Portalı)',
    environment: 'production',
    allowedFrameOrigins: ['http://localhost:3000', 'https://ysnsoft.com']
  },
  'acikellaw.com': {
    domain: 'acikellaw.com',
    name: 'Açıkel Hukuk & Danışmanlık',
    environment: 'production',
    allowedFrameOrigins: ['http://localhost:3000', 'https://ysnsoft.com']
  },
  'haritaplan.com': {
    domain: 'haritaplan.com',
    name: 'HaritaPlan 3D CBS & 3194 Md. 18',
    environment: 'production',
    allowedFrameOrigins: ['http://localhost:3000', 'https://ysnsoft.com']
  },
  'tarihisamatyamezecisi.com': {
    domain: 'tarihisamatyamezecisi.com',
    name: 'Tarihi Samatya Mezecisi (Gurme B2B/B2C & QR POS)',
    environment: 'production',
    allowedFrameOrigins: ['http://localhost:3000', 'https://ysnsoft.com']
  },
  'panelde.com': {
    domain: 'panelde.com',
    name: 'Panelde Multi-Tenant Gayrimenkul',
    environment: 'production',
    allowedFrameOrigins: ['http://localhost:3000', 'https://ysnsoft.com']
  },
  'flamantyou.com': {
    domain: 'flamantyou.com',
    name: 'Flamantyou Kozmetik (AI E-Ticaret)',
    environment: 'production',
    allowedFrameOrigins: ['http://localhost:3000', 'https://ysnsoft.com']
  },
  'samatya-mezecisi.com': {
    domain: 'samatya-mezecisi.com',
    name: 'Tarihi Samatya Mezecisi (Yedek Alan Adı)',
    environment: 'production',
    allowedFrameOrigins: ['http://localhost:3000', 'https://ysnsoft.com']
  },
  'dolphinbodrum.com': {
    domain: 'dolphinbodrum.com',
    name: 'Dolphin & ARM Bodrum (VIP Concierge)',
    environment: 'production',
    allowedFrameOrigins: ['http://localhost:3000', 'https://ysnsoft.com']
  }
};

/**
 * Belirteçler kaynak kodda tutulmaz; ortam değişkenlerinden okunur:
 *   YSN_MANAGEMENT_MASTER_TOKEN   ana yönetim belirteci
 *   YSN_BRIDGE_TOKENS             {"alanadi.com":"belirteç", ...} biçiminde JSON
 * Çalışma anında döndürülen (rotate_token) belirteçler süreç yeniden başlayana dek geçerlidir.
 */
const rotatedTokens: Record<string, string> = {};

function envTokens(): Record<string, string> {
  try {
    const parsed = JSON.parse(process.env.YSN_BRIDGE_TOKENS || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function tokenFor(domain: string): string {
  return rotatedTokens[domain] ?? envTokens()[domain] ?? '';
}

function withToken(site: SiteBridgeStatus) {
  return { ...site, token: tokenFor(site.domain) };
}

export async function GET(request: Request) {
  const denied = requireRole(request, 'domains', 'write');
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');

  if (domain && SITES[domain]) {
    return NextResponse.json({ success: true, site: withToken(SITES[domain]) }, { headers: { 'Cache-Control': 'no-store' } });
  }

  return NextResponse.json({
    success: true,
    totalSites: Object.keys(SITES).length,
    masterToken: process.env.YSN_MANAGEMENT_MASTER_TOKEN || '',
    sites: Object.values(SITES).map(withToken)
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const denied = requireRole(request, 'domains', 'write');
  if (denied) return denied;

  try {
    const body = await request.json();
    const { action, domain } = body;

    // Önceki "purge_cache" hiçbir CDN'e bağlı değildi ama "temizlendi" diyordu; kaldırıldı.

    if (action === 'ping' && typeof domain === 'string') {
      // Gerçek ölçüm: bu sunucudan siteye HTTPS isteği. Sertifika geçersizse fetch hata verir.
      const url = publicHttpsUrl(domain);
      if (!url) return NextResponse.json({ success: false, error: 'Geçersiz alan adı.' }, { status: 400 });
      url.protocol = 'https:';
      const started = Date.now();
      try {
        const res = await fetch(url.href, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YSNSOFT-SiteCheck; +https://ysnsoft.com)' },
          redirect: 'follow',
          signal: AbortSignal.timeout(10_000),
          cache: 'no-store',
        });
        void res.body?.cancel();
        return NextResponse.json({
          success: true,
          domain,
          ok: res.ok,
          httpStatus: res.status,
          latencyMs: Date.now() - started,
          finalUrl: res.url,
          checkedAt: new Date().toISOString(),
        }, { headers: { 'Cache-Control': 'no-store' } });
      } catch (err) {
        const cause = (err as { cause?: { code?: string } })?.cause?.code;
        return NextResponse.json({
          success: true,
          domain,
          ok: false,
          httpStatus: 0,
          latencyMs: Date.now() - started,
          error: cause ? `Bağlantı hatası (${cause})` : err instanceof Error && err.name === 'TimeoutError' ? '10 sn içinde yanıt yok' : 'Bağlantı hatası',
          checkedAt: new Date().toISOString(),
        }, { headers: { 'Cache-Control': 'no-store' } });
      }
    }

    if (action === 'rotate_token' && domain) {
      // Tahmin edilemez olmalı: zaman damgası değil, kriptografik rastgele değer
      const newToken = `ysn_live_${randomBytes(24).toString('base64url')}`;
      if (SITES[domain]) {
        rotatedTokens[domain] = newToken;
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
