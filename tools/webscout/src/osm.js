// OpenStreetMap (Overpass API) üzerinden ülke + şehir (+ isteğe bağlı ilçe/mahalle) + kategoriye göre
// işletme listesi çeker. Açık veri (ODbL). Google Maps scraping yapmıyoruz: hem ToS'a aykırı hem kırılgan.
//
// Web sitesi OLMAYAN işletmeler de alınır (website = null): bunlar "yeni site teklifi" adayıdır.
// Dikkat: OSM'de site kaydı olmaması, işletmenin sitesi olmadığını kanıtlamaz; ziyaret öncesi elle bakılır.

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const UA = process.env.WEBSCOUT_UA || 'WebScout/0.2 (local business survey)';

// Ülkeler. Pilot: Almanya. Tarama kontrolleri (Impressum, Datenschutz) Almanca konuşulan ülkelere göredir.
export const COUNTRIES = {
  DE: { label: 'Almanya', pilot: true, cities: ['Duisburg', 'Essen', 'Düsseldorf', 'Oberhausen', 'Mülheim an der Ruhr', 'Gelsenkirchen', 'Bochum', 'Dortmund', 'Krefeld', 'Köln'] },
  AT: { label: 'Avusturya', cities: ['Wien', 'Graz', 'Linz', 'Salzburg'] },
  CH: { label: 'İsviçre', cities: ['Zürich', 'Basel', 'Bern'] },
};

// Müşteri adayı (prospect) kategorileri
export const LEAD_CATEGORIES = {
  friseur: { label: 'Berber / Kuaför / Güzellik', filter: '["shop"~"^(hairdresser|beauty)$"]' },
  gastro: { label: 'Lokanta / Kafe / İmbiss / Bar', filter: '["amenity"~"^(restaurant|cafe|fast_food|bar)$"]' },
  handwerk: { label: 'Zanaatkâr / Usta (Handwerk)', filter: '["craft"]' },
  arzt: { label: 'Doktor / Diş hekimi', filter: '["amenity"~"^(doctors|dentist)$"]' },
  kfz: { label: 'Oto tamir / Galeri', filter: '["shop"~"^(car_repair|car|tyres)$"]' },
  baeckerei: { label: 'Fırın / Pastane / Kasap', filter: '["shop"~"^(bakery|pastry|butcher|confectionery)$"]' },
  einzelhandel: { label: 'Mağaza (giyim, çiçek, kuyum, optik...)', filter: '["shop"~"^(clothes|shoes|florist|jewelry|optician|gift|furniture|bicycle|electronics|kiosk|convenience|greengrocer)$"]' },
  dienstleistung: { label: 'Hizmet (terzi, kuru temizleme, sürücü kursu...)', filter: '[~"^(shop|amenity)$"~"^(tailor|laundry|dry_cleaning|driving_school|travel_agency|locksmith|copyshop)$"]' },
  gesundheit: { label: 'Sağlık (fizyoterapi, eczane, veteriner...)', filter: '[~"^(healthcare|amenity)$"~"^(physiotherapist|alternative|podiatrist|pharmacy|veterinary)$"]' },
  immobilien: { label: 'Emlak / Sigorta / Büro', filter: '["office"~"^(estate_agent|insurance|architect|financial_advisor)$"]' },
  hotel: { label: 'Otel / Pansiyon', filter: '["tourism"~"^(hotel|guest_house|hostel|apartment)$"]' },
};

// İş birliği (aracı) kategorileri
export const PARTNER_CATEGORIES = {
  steuerberater: { label: 'Mali müşavir (Steuerberater)', filter: '["office"~"^(tax_advisor|accountant)$"]' },
  anwalt: { label: 'Avukat', filter: '["office"="lawyer"]' },
  verband: { label: 'Dernek / Oda / Innung', filter: '["office"~"^(association|guild|ngo)$"]' },
};

export const DEFAULT_COUNTRY = 'DE';
export const DEFAULT_CITIES = ['Duisburg', 'Essen', 'Düsseldorf'];

const NAME_RE = /^[\p{L}\p{N} .,'()/-]{2,80}$/u;

export function assertPlaceName(name, what = 'şehir') {
  if (typeof name !== 'string' || !NAME_RE.test(name)) throw new Error(`Geçersiz ${what} adı: ${name}`);
  return name;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpass(query) {
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    const endpoint = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'user-agent': UA,
          accept: 'application/json',
        },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(120000),
      });
      if (res.status === 429 || res.status === 504 || res.status === 502) {
        lastErr = new Error(`Overpass ${res.status}`);
        await sleep(8000 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Overpass geçersiz yanıt: ${text.slice(0, 80)}`);
      }
      // Sunucu aşırı yüklüyken HTTP 200 + boş sonuç + remark döner: bunu "0 kayıt" sayma
      if (data.remark && /error|timed out|out of memory|too busy/i.test(data.remark)) {
        throw new Error(`Overpass: ${data.remark.slice(0, 120)}`);
      }
      return data;
    } catch (e) {
      lastErr = e;
      await sleep(8000 * (attempt + 1));
    }
  }
  throw lastErr;
}

const areaRef = (relId) => `area:${3600000000 + Number(relId)}`;

/**
 * Şehir adını ülke içinde bir OSM idari sınırına çözer ve `areas` tablosunda saklar.
 * Aynı adda birden çok sınır varsa en küçük birim (en yüksek admin_level) seçilir:
 * Zürich için kanton (4) değil şehir (8); Duisburg için kreisfreie Stadt (6).
 */
export async function resolveCity(db, country, city) {
  if (!COUNTRIES[country]) throw new Error(`Desteklenmeyen ülke: ${country}`);
  assertPlaceName(city);
  const cached = db.prepare("SELECT * FROM areas WHERE kind='city' AND country=? AND city=?").get(country, city);
  if (cached) return cached;

  const data = await overpass(`[out:json][timeout:60];
area["ISO3166-1"="${country}"]["admin_level"="2"]->.c;
rel["boundary"="administrative"]["name"="${city}"]["admin_level"~"^(4|6|7|8)$"](area.c);
out tags;`);
  const rels = (data.elements ?? []).filter((e) => e.type === 'relation');
  if (!rels.length) throw new Error(`"${city}" ${COUNTRIES[country].label} içinde idari sınır olarak bulunamadı (yerel dildeki adı yazın, örn. Köln)`);
  rels.sort((a, b) => Number(b.tags.admin_level) - Number(a.tags.admin_level));
  const best = rels[0];
  db.prepare("INSERT OR REPLACE INTO areas (id, kind, country, city, name, admin_level) VALUES (?, 'city', ?, ?, ?, ?)")
    .run(best.id, country, city, city, Number(best.tags.admin_level));
  return db.prepare('SELECT * FROM areas WHERE id=?').get(best.id);
}

/** Şehrin altındaki ilçe (Stadtbezirk) ve mahalleleri (Stadtteil) listeler; sonucu saklar. */
export async function listDistricts(db, country, city, { refresh = false } = {}) {
  const cityArea = await resolveCity(db, country, city);
  const select = db.prepare("SELECT id, name, admin_level FROM areas WHERE kind='district' AND country=? AND city=? ORDER BY admin_level, name");
  if (!refresh) {
    const cached = select.all(country, city);
    if (cached.length) return cached;
  }
  const data = await overpass(`[out:json][timeout:60];
rel["boundary"="administrative"]["admin_level"~"^(9|10|11)$"]["name"](${areaRef(cityArea.id)});
out tags;`);
  const insert = db.prepare("INSERT OR REPLACE INTO areas (id, kind, country, city, name, admin_level) VALUES (?, 'district', ?, ?, ?, ?)");
  for (const el of data.elements ?? []) {
    if (el.type !== 'relation' || el.id === cityArea.id) continue;
    insert.run(el.id, country, city, el.tags.name, Number(el.tags.admin_level));
  }
  return select.all(country, city);
}

export function normalizeUrl(raw) {
  if (!raw) return null;
  let u = String(raw).split(';')[0].trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
  try {
    const parsed = new URL(u);
    if (!parsed.hostname.includes('.')) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * @param {object} area   areas tablosundan bir satır (şehir ya da ilçe/mahalle)
 * @param {string} categoryKey
 * @returns işletmeler; `website` yoksa null
 */
export async function fetchPlaces(area, categoryKey) {
  const cat = LEAD_CATEGORIES[categoryKey] ?? PARTNER_CATEGORIES[categoryKey];
  if (!cat) throw new Error(`Bilinmeyen kategori: ${categoryKey}`);
  const data = await overpass(`[out:json][timeout:90];
nwr${cat.filter}["name"](${areaRef(area.id)});
out center tags;`);
  const out = [];
  for (const el of data.elements ?? []) {
    const t = el.tags ?? {};
    if (!t.name) continue;
    // Kalıcı kapanmış / terk edilmiş yerleri alma
    if (t['disused:shop'] || t['disused:amenity'] || t.abandoned === 'yes') continue;
    const street = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ');
    const place = [t['addr:postcode'], t['addr:city'] || area.city].filter(Boolean).join(' ');
    out.push({
      osm_id: `${el.type}/${el.id}`,
      name: t.name,
      country: area.country,
      city: area.city,
      category: categoryKey,
      address: [street, place].filter(Boolean).join(', '),
      postcode: t['addr:postcode'] || null,
      suburb: t['addr:suburb'] || null,
      website: normalizeUrl(t.website || t['contact:website'] || t.url),
      phone: t.phone || t['contact:phone'] || t['contact:mobile'] || null,
      // Zincir/franchise şubesi (ör. fırın zinciri, fast-food markası): site kararı merkezde verilir
      brand: t.brand || t['brand:wikidata'] || null,
      // Ziyaret rotası için: kapalı günü atlamak, uygun saati önermek
      hours: t.opening_hours || null,
      lat: el.lat ?? el.center?.lat ?? null,
      lon: el.lon ?? el.center?.lon ?? null,
    });
  }
  return out;
}

/**
 * Kayıtlı işletmelerin güncel opening_hours etiketini toplu okur (yeniden çekim gerekmez).
 * @param {string[]} osmIds  "node/123" | "way/45" | "relation/6"
 * @returns {Map<string, string|null>}
 */
export async function fetchOpeningHours(osmIds) {
  const by = { node: [], way: [], relation: [] };
  for (const id of osmIds) {
    const [type, num] = String(id).split('/');
    if (by[type] && /^\d+$/.test(num ?? '')) by[type].push(num);
  }
  const parts = Object.entries(by).filter(([, ids]) => ids.length).map(([type, ids]) => `${type}(id:${ids.join(',')});`);
  const out = new Map();
  if (!parts.length) return out;
  const data = await overpass(`[out:json][timeout:90];
(${parts.join('')});
out tags;`);
  for (const el of data.elements ?? []) out.set(`${el.type}/${el.id}`, el.tags?.opening_hours ?? null);
  return out;
}
