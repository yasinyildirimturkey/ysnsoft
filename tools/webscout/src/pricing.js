// Teklif paketleri ve fiyatlar. Panelden düzenlenir; data/pricing.json'da saklanır (yoksa aşağıdaki varsayılanlar).
// Tutarlar tam euro. Müşteriye giden metinler Almanca.
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR } from './db.js';

const FILE = join(DATA_DIR, 'pricing.json');

export const DEFAULT_PRICING = {
  vatNote: 'Alle Preise zzgl. gesetzlicher MwSt.',
  packages: [
    {
      key: 'start', name: 'Start', setup: 690, monthly: 19,
      features: [
        'Moderne Website auf einer Seite: Leistungen, Öffnungszeiten, Anfahrt',
        'Für Smartphone optimiert, verschlüsselt (HTTPS), schnell',
        'Anruf- und Routen-Button, Karte',
        'Hosting, Domain-Verwaltung und technische Wartung',
      ],
    },
    {
      key: 'business', name: 'Business', setup: 1190, monthly: 29,
      features: [
        'Alles aus „Start“',
        'Bis zu 5 Unterseiten (z. B. Leistungen, Über uns, Galerie, Kontakt)',
        'Online-Terminanfrage bzw. Reservierungsformular',
        'Einrichtung des Google-Unternehmensprofils, Basis-Suchmaschinenoptimierung',
      ],
    },
    {
      key: 'premium', name: 'Premium', setup: 1890, monthly: 49,
      features: [
        'Alles aus „Business“',
        'Mehrsprachig (z. B. Deutsch, Englisch, Türkisch)',
        'Inhaltliche Änderungen inklusive (bis 1 Stunde pro Monat)',
        'Persönliche Ansprechperson, Antwort innerhalb eines Werktags',
      ],
    },
  ],
};

const KEY_RE = /^[a-z0-9_-]{1,30}$/;
const clean = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

/** Gelen ayarı doğrular; hatalıysa Error fırlatır. */
export function validatePricing(p) {
  if (!p || !Array.isArray(p.packages) || p.packages.length < 1 || p.packages.length > 6) throw new Error('1–6 paket olmalı');
  const keys = new Set();
  const packages = p.packages.map((x) => {
    const key = clean(x?.key, 30).toLowerCase();
    if (!KEY_RE.test(key) || keys.has(key)) throw new Error(`Geçersiz ya da tekrar eden paket anahtarı: ${key}`);
    keys.add(key);
    const setup = Number(x.setup), monthly = Number(x.monthly);
    if (![setup, monthly].every((v) => Number.isInteger(v) && v >= 0 && v <= 1_000_000)) throw new Error(`${key}: fiyatlar tam euro olmalı`);
    const name = clean(x.name, 40);
    if (!name) throw new Error(`${key}: ad boş`);
    const features = [].concat(x.features ?? []).map((f) => clean(f, 160)).filter(Boolean).slice(0, 10);
    return { key, name, setup, monthly, features };
  });
  return { vatNote: clean(p.vatNote, 160), packages };
}

export function readPricing() {
  try { if (existsSync(FILE)) return validatePricing(JSON.parse(readFileSync(FILE, 'utf8'))); } catch { /* bozuk dosya: varsayılan */ }
  return DEFAULT_PRICING;
}

export function writePricing(p) {
  const v = validatePricing(p);
  const tmp = `${FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(v, null, 1), 'utf8');
  renameSync(tmp, FILE);
  return v;
}
