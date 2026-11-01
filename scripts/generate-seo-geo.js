#!/usr/bin/env node
/**
 * YSNSOFT — OTOMATIK SEO & GEO VE SCHEMA YAPILANDIRMA BETİĞİ
 * 
 * Bu betik:
 * 1. data/sites.json ve varsayılan YSNSOFT portföyünü dinamik olarak okur.
 * 2. Eşzamanlı (concurrent) olarak tüm siteleri pingler, SSL, Meta Başlık, GEO ve Schema.org durumunu denetler.
 * 3. data/seo-reports/ klasörüne JSON formatında denetim raporu kaydeder.
 * 4. Terminalden doğrudan çalıştırılabilir: `node scripts/generate-seo-geo.js`
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_TARGETS = [
  { domain: 'ysnsoft.com', name: 'YSNSOFT Kurumsal Bilişim', url: 'https://ysnsoft.com' },
  { domain: 'kglex.com', name: 'KGLEX LegalTech AI (Hukuk & UYAP)', url: 'https://www.kglex.com' },
  { domain: 'haritaplan.com', name: 'HaritaPlan 3D CBS & 3194 Md. 18', url: 'https://www.haritaplan.com' },
  { domain: 'hgavukatlik.com', name: 'HG Avukatlık Bürosu', url: 'https://www.hgavukatlik.com' },
  { domain: 'acikellaw.com', name: 'Açıkel Law Danışmanlık', url: 'https://www.acikellaw.com' },
  { domain: 'panelde.com', name: 'Panelde Multi-Tenant SaaS', url: 'https://www.panelde.com' },
  { domain: 'flamantyou.com', name: 'Flamantyou Kozmetik (AI)', url: 'https://www.flamantyou.com' },
  { domain: 'tarihisamatyamezecisi.com', name: 'Tarihi Samatya Mezecisi', url: 'https://www.tarihisamatyamezecisi.com' }
];

function getDynamicTargets() {
  const sitesPath = path.join(__dirname, '..', 'data', 'sites.json');
  if (fs.existsSync(sitesPath)) {
    try {
      const sites = JSON.parse(fs.readFileSync(sitesPath, 'utf-8'));
      if (Array.isArray(sites) && sites.length > 0) {
        const combined = [
          { domain: 'ysnsoft.com', name: 'YSNSOFT Kurumsal Bilişim', url: 'https://ysnsoft.com' },
          ...sites.map(s => ({
            domain: s.domain,
            name: s.name,
            url: s.liveUrl || `https://${s.domain}`
          }))
        ];
        const seen = new Set();
        return combined.filter(t => {
          if (seen.has(t.domain)) return false;
          seen.add(t.domain);
          return true;
        });
      }
    } catch (e) {
      // fallback
    }
  }
  return DEFAULT_TARGETS;
}

const GEO_CONFIG = {
  city: 'İstanbul',
  district: 'Pendik',
  regionCode: 'TR-34',
  position: '40.8795;29.2578',
  icbm: '40.8795, 29.2578',
  postalCode: '34890',
  phone: '+90 532 725 50 98',
  email: 'info@ysnsoft.com'
};

async function auditDomain(target) {
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(target.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) YSNSOFT-SeoAudit/2.6'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const latency = Date.now() - start;
    const html = await res.text();

    const hasTitle = /<title[^>]*>([^<]+)<\/title>/i.test(html);
    const hasDesc = /<meta\s+name=["']description["']/i.test(html);
    const hasSchema = html.includes('application/ld+json');
    const hasGeo = html.includes('geo.position') || html.includes('geo.region') || html.includes('ICBM');

    let score = 50;
    if (res.ok) score += 15;
    if (hasTitle) score += 10;
    if (hasDesc) score += 10;
    if (hasSchema) score += 10;
    if (hasGeo) score += 5;

    return {
      domain: target.domain,
      name: target.name,
      status: res.status,
      latencyMs: latency,
      latency: `${latency}ms`,
      ssl: target.url.startsWith('https') ? '✓ SSL OK' : '✗ NO SSL',
      geo: hasGeo ? '✓ GEO OK' : '⚠ Eksik',
      schema: hasSchema ? '✓ Schema.org' : '⚠ Eksik',
      score: `${score}/100`,
      scoreNum: score
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      domain: target.domain,
      name: target.name,
      status: 'HATA',
      latencyMs: Date.now() - start,
      latency: `${Date.now() - start}ms`,
      ssl: '✗ Hata',
      geo: '✗',
      schema: '✗',
      score: '20/100',
      scoreNum: 20
    };
  }
}

async function run() {
  console.log('\n=================================================================');
  console.log(' YSNSOFT — OTOMATIK SEO & GEO VE SAGLIK DENETIMI');
  console.log(' Tarih:', new Date().toLocaleString('tr-TR'));
  console.log(' Geo Bölge:', `${GEO_CONFIG.district} / ${GEO_CONFIG.city} (${GEO_CONFIG.regionCode})`);
  console.log(' Koordinat:', GEO_CONFIG.icbm);
  console.log('=================================================================\n');

  const targets = getDynamicTargets();
  console.log(`Toplam ${targets.length} site eşzamanlı taranıyor...\n`);

  const results = await Promise.all(targets.map(async (t) => {
    const r = await auditDomain(t);
    console.log(`  [OK] ${t.domain.padEnd(28)} -> ${r.status} (${r.latency}) | Puan: ${r.score}`);
    return r;
  }));

  console.log('\n-----------------------------------------------------------------');
  console.log(' DETAYLI DENETİM SONUÇ TABLOSU:');
  console.log('-----------------------------------------------------------------');
  console.table(results.map(r => ({
    Domain: r.domain,
    HTTP: r.status,
    Gecikme: r.latency,
    SSL: r.ssl,
    GEO: r.geo,
    Schema: r.schema,
    Puan: r.score
  })));

  // Save report to data/seo-reports/
  try {
    const reportDir = path.join(__dirname, '..', 'data', 'seo-reports');
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

    const avgScore = Math.round(results.reduce((acc, r) => acc + r.scoreNum, 0) / results.length);
    const reportData = {
      auditedAt: new Date().toISOString(),
      averageScore: avgScore,
      totalSites: results.length,
      sites: results
    };
    const reportFile = path.join(reportDir, 'latest-audit.json');
    fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2), 'utf-8');
    console.log(`[RAPOR KAYDEDİLDİ] -> ${reportFile}`);
  } catch (e) {
    // Ignore report save error
  }

  console.log('\n=================================================================');
  console.log(' [OK] SEO & GEO Otomasyonu Başarıyla Tamamlandı.');
  console.log(' Yönetim Paneli: https://ysnsoft.com/admin');
  console.log(' Canlı API Ucu: https://ysnsoft.com/api/seo-geo');
  console.log('=================================================================\n');
}

run().catch(console.error);
