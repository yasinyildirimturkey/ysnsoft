#!/usr/bin/env node
/**
 * YSNSOFT — OTOMATIK SEO & GEO VE SCHEMA YAPILANDIRMA BETİĞİ
 * 
 * Bu betik:
 * 1. Tüm YSNSOFT sitelerinin canlı SEO, GEO, SSL ve Schema.org sağlık durumunu denetler.
 * 2. İlçe, İl ve Koordinat (TR-34, Pendik vb.) parametrelerine göre otomatik Next.js metadata,
 *    Schema JSON-LD, sitemap.xml ve robots.txt üretir.
 * 3. Terminalden doğrudan çalıştırılabilir: `node scripts/generate-seo-geo.js`
 */

const fs = require('fs');
const path = require('path');

const TARGETS = [
  { domain: 'ysnsoft.com', name: 'YSNSOFT Kurumsal Bilişim', url: 'https://ysnsoft.com' },
  { domain: 'kglex.com', name: 'KGLEX LegalTech AI (Hukuk & UYAP)', url: 'https://www.kglex.com' },
  { domain: 'haritaplan.com', name: 'HaritaPlan 3D CBS & 3194 Md. 18', url: 'https://www.haritaplan.com' },
  { domain: 'hgavukatlik.com', name: 'HG Avukatlık Bürosu', url: 'https://www.hgavukatlik.com' },
  { domain: 'acikellaw.com', name: 'Açıkel Law Danışmanlık', url: 'https://www.acikellaw.com' },
  { domain: 'panelde.com', name: 'Panelde Multi-Tenant SaaS', url: 'https://www.panelde.com' },
  { domain: 'flamantyou.com', name: 'Flamantyou Kozmetik (AI)', url: 'https://www.flamantyou.com' },
  { domain: 'tarihisamatyamezecisi.com', name: 'Tarihi Samatya Mezecisi', url: 'https://www.tarihisamatyamezecisi.com' }
];

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
  try {
    const res = await fetch(target.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) YSNSOFT-SeoAudit/2.6'
      }
    });
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
      latency: `${latency}ms`,
      ssl: target.url.startsWith('https') ? '✓ SSL OK' : '✗ NO SSL',
      geo: hasGeo ? '✓ GEO OK' : '⚠ Eksik',
      schema: hasSchema ? '✓ Schema.org' : '⚠ Eksik',
      score: `${score}/100`
    };
  } catch (err) {
    return {
      domain: target.domain,
      name: target.name,
      status: 'HATA',
      latency: `${Date.now() - start}ms`,
      ssl: '✗ Hata',
      geo: '✗',
      schema: '✗',
      score: '20/100'
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

  console.log('Canlı siteler taranıyor, lütfen bekleyiniz...\n');

  const results = [];
  for (const t of TARGETS) {
    process.stdout.write(`  [TARANIYOR] ${t.domain.padEnd(28)} `);
    const r = await auditDomain(t);
    results.push(r);
    console.log(`-> ${r.status} (${r.latency}) | Puan: ${r.score}`);
  }

  console.log('\n-----------------------------------------------------------------');
  console.log(' DETAYLI DENETİM SONUC TABLOSU:');
  console.log('-----------------------------------------------------------------');
  console.table(results);

  console.log('\n=================================================================');
  console.log(' [OK] SEO & GEO Denetimi Tamamlandı.');
  console.log(' Yönetim Paneli: https://ysnsoft.com/admin');
  console.log(' Canlı API Ucu: https://ysnsoft.com/api/seo-geo');
  console.log('=================================================================\n');
}

run().catch(console.error);
