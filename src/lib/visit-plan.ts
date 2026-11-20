/**
 * Saha ziyareti planı: açılış saatleri + sektöre göre uygun ziyaret saati + yol süresi.
 *
 * Harita (rota kurma) ve telefondaki saha sayfası aynı hesabı kullanır. Saatler WebScout'tan
 * haftalık dakika aralıkları olarak gelir (Pazartesi = 0); bilinmiyorsa null.
 * Süreler kaba tahmindir (kuş uçuşu × 1,4, şehir içi ~25 km/s); amaç sırayı ve kapalı günü yakalamak.
 */

export type Week = number[][][] | null;

export interface PlanInput {
  id: number;
  lat: number;
  lon: number;
  category?: string | null;
  week?: Week;
  appointment?: boolean;
}

export type SlotState = 'ok' | 'outside' | 'unknown' | 'appointment' | 'closed' | 'late';

export interface PlannedStop<T extends PlanInput> {
  stop: T;
  /** Tahmini varış (dakika, gün başından); kapalı/sığmayan durakta null */
  eta: number | null;
  /** O gün için önerilen ziyaret aralıkları (gösterim için) */
  windows: number[][];
  state: SlotState;
}

export const VISIT_MIN = 20;
const ROAD_FACTOR = 1.4;
const SPEED_KMH = 25;
const PARK_MIN = 4;

/**
 * Sahibine/yetkiliye denk gelme ve işi bölmeme açısından iyi saatler (deneyime dayalı varsayım).
 * Lokanta: öğle ve akşam yoğunluğu dışında; zanaatkâr: şantiyeye çıkmadan önce / döndükten sonra.
 */
const PREF: Record<string, number[][]> = {
  gastro: [[600, 690], [870, 1020]],
  baeckerei: [[570, 660], [840, 960]],
  handwerk: [[450, 540], [930, 1050]],
  arzt: [[690, 780], [990, 1080]],
  gesundheit: [[690, 780], [990, 1080]],
  friseur: [[540, 660], [840, 960]],
  kfz: [[510, 660], [840, 990]],
  einzelhandel: [[600, 720], [840, 990]],
  dienstleistung: [[600, 720], [840, 990]],
  immobilien: [[600, 720], [840, 960]],
  hotel: [[600, 720], [840, 960]],
};
const PREF_DEFAULT = [[600, 720], [840, 990]];

export const PREF_HINT: Record<string, string> = {
  gastro: 'öğle ve akşam yoğunluğu dışında',
  baeckerei: 'sabah kalabalığından sonra',
  handwerk: 'işe çıkmadan önce ya da dönüşte',
  arzt: 'muayene aralarına yakın',
  gesundheit: 'muayene aralarına yakın',
  friseur: 'hafta içi sakin saatler',
};

export function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export const travelMin = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) =>
  Math.round((km(a, b) * ROAD_FACTOR / SPEED_KMH) * 60 + PARK_MIN);

/** Pazartesi = 0 */
export const weekdayOf = (isoDate: string) => (new Date(`${isoDate}T12:00:00`).getDay() + 6) % 7;

export const fmtMin = (m: number) => {
  const v = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
};

export const fmtRanges = (rs: number[][]) => rs.map(([a, b]) => `${fmtMin(a)}–${fmtMin(b)}`).join(', ');

function intersect(a: number[][], b: number[][]) {
  const out: number[][] = [];
  for (const [a1, a2] of a) for (const [b1, b2] of b) {
    const s = Math.max(a1, b1), e = Math.min(a2, b2);
    if (e - s >= VISIT_MIN) out.push([s, e]);
  }
  return out.sort((x, y) => x[0] - y[0]);
}

/** Bir durağın o günkü durumu ve önerilen ziyaret aralıkları. */
export function dayWindows(s: PlanInput, day: number): { state: SlotState; windows: number[][]; open: number[][] | null } {
  const pref = PREF[s.category ?? ''] ?? PREF_DEFAULT;
  const open = s.week ? s.week[day] ?? [] : null;
  if (!open) return { state: s.appointment ? 'appointment' : 'unknown', windows: pref, open: null };
  if (!open.length) return { state: 'closed', windows: [], open };
  // Açılıştan sonraki ve kapanıştan önceki 15 dk ziyarete uygun değil
  const usable = open.map(([a, b]) => [a + 15, b - 15]).filter(([a, b]) => b - a >= VISIT_MIN);
  const best = intersect(usable, pref);
  if (best.length) return { state: 'ok', windows: best, open };
  return { state: usable.length ? 'outside' : 'closed', windows: usable, open };
}

/** Şu an açık mı (saat biliniyorsa)? */
export function openNow(s: PlanInput, day: number, minute: number): boolean | null {
  if (!s.week) return null;
  const open = s.week[day] ?? [];
  // Önceki günden gece yarısını aşan aralık
  const prev = s.week[(day + 6) % 7] ?? [];
  return open.some(([a, b]) => minute >= a && minute < b) || prev.some(([, b]) => b > 1440 && minute < b - 1440);
}

/**
 * Zamanı hesaba katan açgözlü sıralama: her adımda (yol + bekleme) en az olan, o gün açık durağa gidilir.
 * Kapalı ve güne sığmayan duraklar sona, işaretli olarak eklenir.
 */
export function planDay<T extends PlanInput>(
  stops: T[],
  isoDate: string,
  startMin: number,
  /** Başlangıç konumu (sahada "bulunduğum yerden"); verilmezse ilk durağa yol süresi sayılmaz */
  from?: { lat: number; lon: number } | null,
): PlannedStop<T>[] {
  const day = weekdayOf(isoDate);
  const info = new Map(stops.map((s) => [s.id, dayWindows(s, day)]));
  const rest = stops.filter((s) => info.get(s.id)!.state !== 'closed');
  const closed = stops.filter((s) => info.get(s.id)!.state === 'closed');
  const out: PlannedStop<T>[] = [];
  const late: T[] = [];
  let t = startMin;
  let pos: { lat: number; lon: number } | null = from ?? null;

  while (rest.length) {
    let pick = -1, pickStart = 0, pickCost = Infinity, pickTravel = Infinity;
    for (let i = 0; i < rest.length; i++) {
      const s = rest[i];
      const w = info.get(s.id)!;
      const travel = pos ? travelMin(pos, s) : 0;
      const arrive = t + travel;
      // Uygun aralık: varıştan sonra ziyareti sığdıran ilk aralık
      const win = w.windows.find(([, e]) => Math.max(arrive, 0) + VISIT_MIN <= e);
      if (!win) continue;
      const start = Math.max(arrive, win[0]);
      const cost = (start - t) + (w.state === 'outside' ? 20 : 0);
      // Eşitlikte (ör. hepsi aynı saatte açılıyor, beklerken yol fark etmiyor) yakın olan seçilir
      if (cost < pickCost || (cost === pickCost && travel < pickTravel)) { pick = i; pickStart = start; pickCost = cost; pickTravel = travel; }
    }
    if (pick < 0) { late.push(...rest.splice(0)); break; }
    const s = rest.splice(pick, 1)[0];
    const w = info.get(s.id)!;
    out.push({ stop: s, eta: pickStart, windows: w.windows, state: w.state });
    t = pickStart + VISIT_MIN;
    pos = s;
  }
  // Güne sığmayan ve kapalı duraklar da rastgele değil, en yakın komşu sırasıyla dizilir
  // (gün bitmişse ya da saatler bilinmiyorsa bile en kısa yol sırası çıkar)
  const byDistance = (list: T[]) => {
    const left = list.slice();
    const sorted: T[] = [];
    while (left.length) {
      let best = 0;
      if (pos) {
        let bestKm = Infinity;
        left.forEach((s, i) => { const d = km(pos!, s); if (d < bestKm) { bestKm = d; best = i; } });
      }
      const s = left.splice(best, 1)[0];
      sorted.push(s);
      pos = s;
    }
    return sorted;
  };
  for (const s of byDistance(late)) out.push({ stop: s, eta: null, windows: info.get(s.id)!.windows, state: 'late' });
  for (const s of byDistance(closed)) out.push({ stop: s, eta: null, windows: [], state: 'closed' });
  return out;
}

export const STATE_LABEL: Record<SlotState, string> = {
  ok: 'Uygun saat',
  outside: 'Uygun saat dışı ama açık',
  unknown: 'Saat bilinmiyor',
  appointment: 'Randevuyla çalışıyor — önce arayın',
  closed: 'O gün kapalı',
  late: 'Bu güne sığmıyor',
};

/** YYYY-MM-DD (yerel saat) */
export function isoDay(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

/** Sahadaki ziyaret sonucu (WebScout VISIT_OUTCOMES ile aynı anahtarlar) */
export const VISIT_OUTCOME_LABEL: Record<string, string> = {
  talked: 'Görüşüldü',
  demo_shown: 'Demo gösterildi',
  offer_requested: 'Teklif istedi',
  come_back: 'Tekrar gel',
  closed: 'Kapalıydı',
  not_interested: 'İlgilenmedi',
  won: 'Anlaştık',
  demo_sent: 'Demo WhatsApp ile gönderildi',
};
/** "İlgilenmedi" nedenleri (WebScout LOSS_REASONS ile aynı anahtarlar) */
export const LOSS_REASON_LABEL: Record<string, string> = {
  price: 'Fiyat yüksek',
  has_site: 'Zaten sitesi var / yaptırıyor',
  no_time: 'Şu an zamanı yok',
  no_trust: 'Güvenmedi / tanımıyor',
  not_decider: 'Karar veren yoktu',
  no_need: 'İhtiyaç görmüyor',
  other: 'Diğer',
  unknown: 'Neden girilmedi',
};
/** Bu sonuçlarda bir sonraki ziyaret tarihi istenir */
export const NEEDS_NEXT = new Set(['come_back', 'closed']);

export const CATEGORY_LABEL: Record<string, string> = {
  friseur: 'Kuaför / Güzellik',
  gastro: 'Lokanta / Kafe',
  handwerk: 'Zanaatkâr',
  arzt: 'Doktor / Diş hekimi',
  kfz: 'Oto',
  baeckerei: 'Fırın / Kasap',
  einzelhandel: 'Mağaza',
  dienstleistung: 'Hizmet',
  gesundheit: 'Sağlık',
  immobilien: 'Emlak / Büro',
  hotel: 'Otel',
};

/** WebScout'un UTC "YYYY-MM-DD HH:MM:SS" zamanını yerel güne çevirir. */
export const localDayOf = (utc: string) => isoDay(new Date(`${utc.replace(' ', 'T')}Z`));
