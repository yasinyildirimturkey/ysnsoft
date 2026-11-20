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
  // Ek modüller: teklife tek tek eklenir; tutarlar paket fiyatının üstüne eklenir.
  addons: [
    { key: 'termin', name: 'Online-Terminbuchung', setup: 290, monthly: 10, desc: 'Kundinnen und Kunden buchen Termine direkt auf der Website.' },
    { key: 'speisekarte', name: 'Digitale Speisekarte', setup: 190, monthly: 5, desc: 'Speise- und Getränkekarte als Webseite, auch per QR-Code am Tisch.' },
    { key: 'sprache', name: 'Weitere Sprache', setup: 250, monthly: 0, desc: 'Alle Inhalte zusätzlich in einer weiteren Sprache.' },
    { key: 'gbp', name: 'Google-Unternehmensprofil-Pflege', setup: 0, monthly: 29, desc: 'Monatlich: Öffnungszeiten und Angaben prüfen, ein Beitrag, Antworten auf Bewertungen.' },
    { key: 'bewertung', name: 'Bewertungs-Aufsteller mit QR-Code', setup: 49, monthly: 0, desc: 'Gedruckter Aufsteller für die Theke: Kundschaft gelangt direkt zur Google-Bewertung.' },
  ],
  // Sektör paketleri: aday kategorisine göre önerilen paket + ek modüller + sektöre özel maddeler
  sectors: [
    { key: 'gastro', name: 'Gastronomie', package: 'business', addons: ['speisekarte', 'gbp'], features: ['Speisekarte immer aktuell', 'Tischreservierung per Formular'] },
    { key: 'friseur', name: 'Friseur & Kosmetik', package: 'business', addons: ['termin', 'bewertung'], features: ['Preisliste der Leistungen', 'Online-Termin rund um die Uhr'] },
    { key: 'handwerk', name: 'Handwerk', package: 'business', addons: ['gbp'], features: ['Referenzen mit eigenen Fotos', 'Anfrageformular mit Foto-Upload'] },
    { key: 'baeckerei', name: 'Bäckerei & Café', package: 'start', addons: ['gbp', 'bewertung'], features: ['Sortiment und Filialen', 'Öffnungszeiten an Feiertagen'] },
    { key: 'kfz', name: 'Kfz-Werkstatt', package: 'business', addons: ['termin'], features: ['Leistungen und Preise (z. B. Inspektion, Reifenwechsel)', 'Terminanfrage für die Werkstatt'] },
    { key: 'einzelhandel', name: 'Einzelhandel', package: 'start', addons: ['gbp'], features: ['Sortiment und Marken', 'Anfahrt und Parkmöglichkeiten'] },
    { key: 'gesundheit', name: 'Gesundheit & Therapie', package: 'business', addons: ['termin'], features: ['Leistungen und Team', 'Terminanfrage'] },
    { key: 'arzt', name: 'Arztpraxis', package: 'business', addons: ['sprache'], features: ['Sprechzeiten und Vertretung', 'Leistungen und Team'] },
    { key: 'hotel', name: 'Hotel & Pension', package: 'premium', addons: ['gbp'], features: ['Zimmer mit eigenen Fotos', 'Anfrageformular für Buchungen'] },
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
  const aKeys = new Set();
  const addons = [].concat(p.addons ?? []).slice(0, 15).map((x) => {
    const key = clean(x?.key, 30).toLowerCase();
    if (!KEY_RE.test(key) || aKeys.has(key)) throw new Error(`Geçersiz ya da tekrar eden modül anahtarı: ${key}`);
    aKeys.add(key);
    const setup = Number(x.setup), monthly = Number(x.monthly);
    if (![setup, monthly].every((v) => Number.isInteger(v) && v >= 0 && v <= 1_000_000)) throw new Error(`${key}: fiyatlar tam euro olmalı`);
    const name = clean(x.name, 60);
    if (!name) throw new Error(`${key}: ad boş`);
    return { key, name, setup, monthly, desc: clean(x.desc, 200) };
  });
  const sectors = [].concat(p.sectors ?? []).slice(0, 20).map((x) => ({
    key: clean(x?.key, 30).toLowerCase(),
    name: clean(x?.name, 40),
    package: keys.has(clean(x?.package, 30)) ? clean(x.package, 30) : packages[0].key,
    addons: [].concat(x?.addons ?? []).map((a) => clean(a, 30)).filter((a) => aKeys.has(a)).slice(0, 5),
    features: [].concat(x?.features ?? []).map((f) => clean(f, 160)).filter(Boolean).slice(0, 5),
  })).filter((x) => KEY_RE.test(x.key) && x.name);
  return { vatNote: clean(p.vatNote, 160), packages, addons, sectors };
}

export function readPricing() {
  try {
    if (existsSync(FILE)) {
      const raw = JSON.parse(readFileSync(FILE, 'utf8'));
      // Eski kayıtta modül/sektör yoksa varsayılanlar eklenir
      if (raw && !Array.isArray(raw.addons)) raw.addons = DEFAULT_PRICING.addons;
      if (raw && !Array.isArray(raw.sectors)) raw.sectors = DEFAULT_PRICING.sectors;
      return validatePricing(raw);
    }
  } catch { /* bozuk dosya: varsayılan */ }
  return DEFAULT_PRICING;
}

export function writePricing(p) {
  const v = validatePricing(p);
  const tmp = `${FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(v, null, 1), 'utf8');
  renameSync(tmp, FILE);
  return v;
}
