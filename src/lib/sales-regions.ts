/**
 * Satışçı bölgeleri: her saha kullanıcısına şehir(ler) ve/veya posta kodu başları atanır.
 * Gün önerisi yalnız o bölgeden durak seçer; atama yoksa kısıt yok (tek satışçı dönemi gibi).
 * data/sales-regions.json (deploy paketi ezmez). Anahtar: kullanıcı id.
 */
import fs from 'node:fs';
import path from 'node:path';

export interface SalesRegion { cities: string[]; plz: string[] }
const FILE = path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'sales-regions.json');

export function readRegions(): Record<string, SalesRegion> {
  try { const j = JSON.parse(fs.readFileSync(FILE, 'utf8')); return j && typeof j === 'object' ? j : {}; } catch { return {}; }
}

export function regionOf(userId: string): SalesRegion | null {
  const r = readRegions()[userId];
  return r && (r.cities.length || r.plz.length) ? r : null;
}

export function cleanRegion(input: { cities?: unknown; plz?: unknown }): SalesRegion {
  const list = (v: unknown) => (Array.isArray(v) ? v : String(v ?? '').split(',')).map((x) => String(x).trim()).filter(Boolean);
  return {
    cities: [...new Set(list(input.cities).map((c) => c.slice(0, 60)).filter((c) => !c.startsWith('-')))].slice(0, 20),
    plz: [...new Set(list(input.plz).filter((p) => /^\d{1,5}$/.test(p)))].slice(0, 30),
  };
}

export function saveRegion(userId: string, region: SalesRegion) {
  const all = readRegions();
  if (region.cities.length || region.plz.length) all[userId] = region; else delete all[userId];
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(all, null, 1));
  fs.renameSync(`${FILE}.tmp`, FILE);
}

/** suggest-day için CLI argümanları */
export function regionArgs(r: SalesRegion | null): string[] {
  if (!r) return [];
  return [
    ...(r.cities.length ? ['--cities-b64', Buffer.from(JSON.stringify(r.cities), 'utf8').toString('base64')] : []),
    ...(r.plz.length ? ['--plz', r.plz.join(',')] : []),
  ];
}
