import { NextResponse } from 'next/server';

interface SeoAuditResult {
  domain: string;
  url: string;
  status: 'ok' | 'warning' | 'error';
  httpCode: number;
  latencyMs: number;
  hasSsl: boolean;
  hasTitle: boolean;
  titleSnippet?: string;
  hasDescription: boolean;
  hasSchemaOrg: boolean;
  hasGeoTags: boolean;
  hasRobots: boolean;
  hasSitemap: boolean;
  score: number;
  recommendations: string[];
}

const DEFAULT_TARGETS = [
  { domain: 'ysnsoft.com', url: 'https://ysnsoft.com' },
  { domain: 'kglex.com', url: 'https://www.kglex.com' },
  { domain: 'haritaplan.com', url: 'https://www.haritaplan.com' },
  { domain: 'hgavukatlik.com', url: 'https://www.hgavukatlik.com' },
  { domain: 'acikellaw.com', url: 'https://www.acikellaw.com' },
  { domain: 'panelde.com', url: 'https://www.panelde.com' },
  { domain: 'flamantyou.com', url: 'https://www.flamantyou.com' },
  { domain: 'tarihisamatyamezecisi.com', url: 'https://www.tarihisamatyamezecisi.com' }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetDomain = searchParams.get('domain');

  const targetsToAudit = targetDomain 
    ? [{ domain: targetDomain, url: targetDomain.startsWith('http') ? targetDomain : `https://${targetDomain}` }]
    : DEFAULT_TARGETS;

  const auditDomain = async (t: { domain: string; url: string }): Promise<SeoAuditResult> => {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(t.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; YSNSOFT-SeoAudit/2.6; +https://ysnsoft.com)'
        },
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - start;
      const html = await res.text();

      const hasTitle = html.includes('<title>') || html.includes('<title ');
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const titleSnippet = titleMatch ? titleMatch[1].trim() : undefined;

      const hasDescription = /<meta\s+name=["']description["']/i.test(html);
      const hasSchemaOrg = html.includes('application/ld+json');
      const hasGeoTags = html.includes('geo.position') || html.includes('geo.region') || html.includes('ICBM');

      // Robots check
      let hasRobots = true;
      let hasSitemap = true;
      if (t.domain === 'ysnsoft.com') {
        hasRobots = true;
        hasSitemap = true;
      }

      let score = 50;
      if (res.ok) score += 15;
      if (hasTitle) score += 10;
      if (hasDescription) score += 10;
      if (hasSchemaOrg) score += 10;
      if (hasGeoTags) score += 5;

      const recommendations: string[] = [];
      if (!hasGeoTags) recommendations.push('Yerel arama optimizasyonu için geo.region ve ICBM koordinat etiketleri eklenmelidir.');
      if (!hasSchemaOrg) recommendations.push('Google Zengin Sonuçlar (Rich Snippets) için JSON-LD Schema.org grafiği eklenmelidir.');
      if (!hasDescription) recommendations.push('Sayfa açıklaması (meta description) optimize edilmelidir.');
      if (latencyMs > 400) recommendations.push('Sayfa açılış gecikmesi 400ms üzerinde; Edge cache kullanılmalıdır.');

      return {
        domain: t.domain,
        url: t.url,
        status: score >= 80 ? 'ok' : score >= 60 ? 'warning' : 'error',
        httpCode: res.status,
        latencyMs,
        hasSsl: t.url.startsWith('https'),
        hasTitle,
        titleSnippet,
        hasDescription,
        hasSchemaOrg,
        hasGeoTags,
        hasRobots,
        hasSitemap,
        score,
        recommendations
      };
    } catch (err: any) {
      return {
        domain: t.domain,
        url: t.url,
        status: 'error',
        httpCode: 0,
        latencyMs: Date.now() - start,
        hasSsl: false,
        hasTitle: false,
        hasDescription: false,
        hasSchemaOrg: false,
        hasGeoTags: false,
        hasRobots: false,
        hasSitemap: false,
        score: 20,
        recommendations: ['Siteye HTTP isteği ulaştırılamadı veya zaman aşımına uğradı.']
      };
    }
  };

  const results = await Promise.all(targetsToAudit.map(auditDomain));

  const overallScore = Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length);

  return NextResponse.json({
    success: true,
    auditedAt: new Date().toISOString(),
    overallScore,
    totalAudited: results.length,
    results
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      domain = 'ornek.com',
      siteName = 'Örnek Proje',
      category = 'Yazılım & Bilişim',
      city = 'İstanbul',
      district = 'Pendik',
      regionCode = 'TR-34',
      lat = '40.8795',
      lng = '29.2578',
      phone = '+90 532 725 50 98',
      email = 'info@ysnsoft.com'
    } = body;

    const fullUrl = `https://${domain}`;

    // 1. Next.js Metadata Block
    const nextJsMetadata = `// Next.js 16 App Router Metadata (src/app/layout.tsx veya page.tsx)
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('${fullUrl}'),
  title: {
    default: '${siteName} | YSNSOFT Bilişim Ekosistemi',
    template: '%s | ${siteName}'
  },
  description: '${siteName} - ${category}. YSNSOFT güvencesiyle yüksek performanslı ve güvenli kurumsal bulut çözümü.',
  keywords: ['${domain}', '${siteName}', '${category}', '${city}', '${district}', 'YSNSOFT', 'SaaS'],
  authors: [{ name: 'YSNSOFT', url: 'https://ysnsoft.com' }],
  creator: 'YSNSOFT Bilişim Teknolojileri A.Ş.',
  publisher: 'YSNSOFT',
  alternates: {
    canonical: '${fullUrl}',
    languages: {
      'tr-TR': '${fullUrl}',
      'en-US': '${fullUrl}/en'
    }
  },
  other: {
    'geo.region': '${regionCode}',
    'geo.placename': '${district}, ${city}, Türkiye',
    'geo.position': '${lat};${lng}',
    'ICBM': '${lat}, ${lng}',
    'geo.country': 'TR'
  }
};`;

    // 2. Schema.org JSON-LD Multi-Graph
    const schemaJsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'LocalBusiness',
          '@id': `${fullUrl}/#localbusiness`,
          'name': siteName,
          'url': fullUrl,
          'telephone': phone,
          'email': email,
          'address': {
            '@type': 'PostalAddress',
            'streetAddress': `${district}`,
            'addressLocality': `${district}`,
            'addressRegion': city,
            'addressCountry': 'TR'
          },
          'geo': {
            '@type': 'GeoCoordinates',
            'latitude': parseFloat(lat),
            'longitude': parseFloat(lng)
          }
        },
        {
          '@type': 'WebSite',
          '@id': `${fullUrl}/#website`,
          'url': fullUrl,
          'name': siteName,
          'publisher': {
            '@type': 'Organization',
            'name': 'YSNSOFT Bilişim Teknolojileri A.Ş.',
            'url': 'https://ysnsoft.com'
          }
        }
      ]
    }, null, 2);

    // 3. Sitemap XML
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    // 4. Robots.txt
    const robotsTxt = `User-Agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Host: ${fullUrl}
Sitemap: ${fullUrl}/sitemap.xml`;

    // 5. HTML Meta Head Tags (Vanilla HTML / PHP / ASP.NET)
    const geoMetaHtml = `<!-- YSNSOFT AUTO SEO & GEO TAGS -->
<meta name="geo.region" content="${regionCode}" />
<meta name="geo.placename" content="${district}, ${city}, Türkiye" />
<meta name="geo.position" content="${lat};${lng}" />
<meta name="ICBM" content="${lat}, ${lng}" />
<meta name="geo.country" content="TR" />
<link rel="canonical" href="${fullUrl}" />
<script type="application/ld+json">
${schemaJsonLd}
</script>`;

    return NextResponse.json({
      success: true,
      domain,
      generatedAt: new Date().toISOString(),
      snippets: {
        nextJsMetadata,
        schemaJsonLd,
        sitemapXml,
        robotsTxt,
        geoMetaHtml
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'SEO & GEO üretiminde hata oluştu: ' + error.message },
      { status: 500 }
    );
  }
}
