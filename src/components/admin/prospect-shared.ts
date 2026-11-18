/**
 * Müşteri adayları listesi (ProspectsPanel) ile aday sayfasının (/admin/adaylar/[id]) ortak tipleri ve yardımcıları.
 */
import type { DraftQuality } from './DraftChecklist';

export type Kind = 'no_site' | 'redesign' | 'unscanned' | 'ok' | 'chain';

export interface Finding {
  code: string;
  points: number;
  de: string;
  tr: string;
  /** Seviye 2 doğrulaması (varsa): confirmed | partial | refuted | unverified */
  verified?: string;
}

export interface Prospect {
  id: number;
  name: string;
  category: string;
  country: string;
  city: string;
  address: string | null;
  website: string | null;
  phone: string | null;
  status: string;
  notes: string;
  lat: number | null;
  lon: number | null;
  /** Geçerli puan: derin tarama yapıldıysa yanlış alarmlar düşülmüş hâli */
  score: number | null;
  /** İlk tarama puanı (doğrulamadan önce) */
  raw_score: number | null;
  final_url: string | null;
  scanned_at: string | null;
  kind: Kind;
  districts: string | null;
  suburb: string | null;
  findings: Finding[];
  tech: string | null;
  /** Seviye 2 derin profil çıkarıldıysa: işletmenin açık olup olmadığına dair tahmin */
  activity: 'active_likely' | 'closed_suspected' | 'unknown' | null;
  enriched_at: string | null;
  /** Seviye 3 şablon taslağı üretildiyse gizli demo adresinin belirteci (/demo/<token>) */
  draft_token: string | null;
  draft_expires: string | null;
  /** Müşterinin demoyu kaç kez açtığı (biz/botlar hariç) ve en son ne zaman */
  demo_views?: number;
  demo_last_view?: string | null;
  /** Kayıtlı web adresi başka bir firmanın sitesine gidiyorsa (devralma/yanlış kayıt): taslak üretilmez */
  site_mismatch?: { host: string; owner: string | null } | null;
  /** Demonun eksik/tahmini kısımları (örnek foto, öneri metin, logo, saat…): sahada tamamlanacaklar */
  draft_quality?: DraftQuality | null;
  /** Verilen teklif (tam euro); kazanılınca anlaşma değeri */
  offer_package?: string | null;
  offer_setup?: number | null;
  offer_monthly?: number | null;
  offer_at?: string | null;
}

export interface PricingPackage { key: string; name: string; setup: number; monthly: number; features: string[] }
export interface Pricing { vatNote: string; packages: PricingPackage[] }

/** 1190 → "1.190 €" */
export const euro = (n: number | null | undefined) => `${(n ?? 0).toLocaleString('de-DE')} €`;

export interface Job {
  state: 'running' | 'done' | 'error';
  step: string;
  message: string;
  progress?: { done: number; total: number };
  errors?: string[];
}

export const KIND_META: Record<Kind, { label: string; cls: string }> = {
  no_site: { label: 'Yeni site', cls: 'bg-[#0071E3]/10 text-[#0058B0]' },
  redesign: { label: 'Yenileme', cls: 'bg-amber-100 text-amber-800' },
  unscanned: { label: 'Taranmadı', cls: 'bg-black/[0.06] text-[#515154]' },
  ok: { label: 'Site iyi', cls: 'bg-emerald-100 text-emerald-800' },
  chain: { label: 'Zincir', cls: 'bg-black/[0.06] text-[#515154]' },
};

export const ACTIVITY_META = {
  active_likely: { label: 'Muhtemelen açık', cls: 'bg-emerald-100 text-emerald-800' },
  closed_suspected: { label: 'Kapanmış olabilir', cls: 'bg-red-100 text-red-800' },
  unknown: { label: 'Profil var', cls: 'bg-black/[0.06] text-[#515154]' },
} as const;

/** Aday durumları (WebScout BUSINESS_STATUSES ile aynı sıra ve etiketler). */
export const PROSPECT_STATUSES = [
  { key: 'new', label: 'Yeni' },
  { key: 'visit_planned', label: 'Ziyaret planlandı' },
  { key: 'visited', label: 'Ziyaret edildi' },
  { key: 'offer_sent', label: 'Teklif verildi' },
  { key: 'won', label: 'Kazanıldı' },
  { key: 'lost', label: 'Kaybedildi' },
  { key: 'do_not_contact', label: 'İletişime geçme' },
] as const;

export const inputCls =
  'w-full px-3 py-2 text-xs bg-[#F5F5F7] rounded-xl border border-black/[0.08] text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]';

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.success === false) {
    throw new Error(json?.error || `İstek başarısız (HTTP ${res.status})`);
  }
  return json as T;
}

/** Aday sayfasının adresi. */
export const prospectHref = (id: number) => `/admin/adaylar/${id}`;
/** Müşteri adayları listesinin adresi (yönetim panelinde ilgili menü açık). */
export const PROSPECT_LIST_HREF = '/admin?m=prospects';

// ── Liste hafızası (KGLEX deseni: sessionStorage; sekme kapanınca biter) ──
export const LIST_STATE_KEY = 'prospects:list-state';
export const LIST_IDS_KEY = 'prospects:list-ids';
export const LIST_SCROLL_KEY = 'prospects:list-scroll';
// Listenin son satırları: aday sayfası bunları anında gösterir, sunucudan günceli gelince değiştirir
const LIST_ROWS_KEY = 'prospects:list-rows';

export function cacheListRows(rows: Prospect[]) {
  try { sessionStorage.setItem(LIST_ROWS_KEY, JSON.stringify(rows)); } catch {
    // Kota dolduysa (çok büyük liste) eski önbelleği bırakma: yanlış/eksik veri göstermesin
    try { sessionStorage.removeItem(LIST_ROWS_KEY); } catch { /* yok say */ }
  }
}
export function cachedRow(id: number): Prospect | null {
  return readSession<Prospect[]>(LIST_ROWS_KEY)?.find((r) => r.id === id) ?? null;
}
/** Aday sayfasında yapılan değişiklik (durum, not) listeye dönülünce de görünsün. */
export function patchCachedRow(id: number, patch: Partial<Prospect>) {
  const rows = readSession<Prospect[]>(LIST_ROWS_KEY);
  if (rows?.some((r) => r.id === id)) cacheListRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
}

export function readSession<T>(key: string): T | null {
  try {
    const v = sessionStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
export function writeSession(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* gizli pencere, kota */ }
}

// Aday sayfası listeden mi açıldı? (Evetse "← Müşteri Adayları" tarayıcıda geri gider; süzgeç ve konum korunur.
// Hayırsa — paylaşılan bağlantı, yeni sekme — listeyi açar.) Sekmeye özgü: sessionStorage.
const FROM_LIST_KEY = 'prospects:from-list';
/** @param source  geri düğmesinde görünecek ad ("Müşteri Adayları", "Saha listesi") */
export const markFromSource = (source: string) => { try { sessionStorage.setItem(FROM_LIST_KEY, source); } catch { /* yok say */ } };
export const markFromList = () => markFromSource('Müşteri Adayları');
export const markFromField = () => markFromSource('Saha listesi');
/** Açan sayfanın adı (yoksa null: bağlantı doğrudan açıldı). */
export const cameFromList = (): string | null => { try { return sessionStorage.getItem(FROM_LIST_KEY); } catch { return null; } };
export const clearFromList = () => { try { sessionStorage.removeItem(FROM_LIST_KEY); } catch { /* yok say */ } };

// Tarayıcının Geri/İleri tuşu ile mi gelindi? (yalnızca o zaman liste konumu geri yüklenir; menüden açılınca baştan)
let lastPopState = 0;
if (typeof window !== 'undefined') window.addEventListener('popstate', () => { lastPopState = Date.now(); });
/** Uygulama içi "Geri" düğmesi de aynı işareti koyar. */
export const markBackNavigation = () => { lastPopState = Date.now(); };
export const cameBackRecently = (ms = 5000) => Date.now() - lastPopState < ms;
