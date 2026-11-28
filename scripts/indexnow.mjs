#!/usr/bin/env node
// IndexNow toplu gönderim: canlı site haritasındaki tüm URL'leri (hreflang alternatifleriyle) Bing, Yandex ve
// diğer IndexNow motorlarına bildirir. Deploy sonrası çalıştırın:
//   node scripts/indexnow.mjs                       (https://ysnsoft.com)
//   node scripts/indexnow.mjs --only=/hizmetler,/projeler/dmyacht
//   node scripts/indexnow.mjs --dry                 (göndermeden listeler)
// Anahtar src/lib/seo.ts → INDEXNOW_KEY ile aynı olmalı; canlıda /indexnow-key.txt adresinden doğrulanır.
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const site = String(args.site || process.env.SITE_URL || 'https://ysnsoft.com').replace(/\/$/, '');
const key = process.env.INDEXNOW_KEY || 'd44c3105fd3f2509efff977ae1519b9d';
const host = new URL(site).host;

const live = await fetch(`${site}/indexnow-key.txt`).then((r) => (r.ok ? r.text() : '')).catch(() => '');
if (live.trim() !== key) {
  console.error(`Anahtar doğrulanamadı: ${site}/indexnow-key.txt → "${live.trim().slice(0, 40)}" (beklenen ${key}). Önce siteyi yayınlayın.`);
  process.exit(1);
}

let urls;
if (args.only) {
  urls = String(args.only).split(',').map((p) => p.trim()).filter(Boolean).map((p) => `${site}${p.startsWith('/') ? p : `/${p}`}`);
} else {
  const xml = await fetch(`${site}/sitemap.xml`).then((r) => r.text());
  urls = [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>|href="([^"]+)"/g)].map((m) => (m[1] || m[2]).replace(/&amp;/g, '&')))].filter((u) => u.startsWith(site));
}
console.log(`${urls.length} URL · ${host}`);
if (args.dry) { console.log(urls.join('\n')); process.exit(0); }

for (let i = 0; i < urls.length; i += 10000) {
  const urlList = urls.slice(i, i + 10000);
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key, keyLocation: `${site}/indexnow-key.txt`, urlList }),
  });
  console.log(`IndexNow ${res.status} ${res.statusText} — ${urlList.length} URL`);
  if (res.status >= 400) { console.error(await res.text()); process.exitCode = 1; }
}
