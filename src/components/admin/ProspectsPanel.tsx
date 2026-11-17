'use client';

/**
 * Müşteri Adayları (Prospects) — bölge + işletme türü seçip teklif verilebilecek işletmeleri bulur.
 *
 * Prospect = BİZİM gideceğimiz işletme (WebScout bulur). Siteden gelen talepler ("leads") ayrıdır.
 * İki teklif türü vardır: sitesi olmayanlara YENİ SİTE, sitesi kötü olanlara YENİLEME.
 *
 * Kanal kuralı: soğuk e-posta YOK (Almanya UWG §7). Bu ekran bilerek e-posta adresi göstermez,
 * "e-posta gönder" düğmesi içermez; kanal yüz yüze ziyaret ve aracı ortaklardır.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Download,
  ExternalLink,
  Globe,
  LayoutTemplate,
  Eye,
  List,
  Map as MapIcon,
  MapPin,
  Phone,
  Printer,
  RefreshCw,
  ScanSearch,
  Search,
} from 'lucide-react';
import ProspectOffer from './ProspectOffer';
import ProspectFunnel from './ProspectFunnel';
import ProspectMap from './ProspectMap';
import ProspectPhotos from './ProspectPhotos';
import ProspectVisits from './ProspectVisits';
import ProspectProfile from './ProspectProfile';

type Kind = 'no_site' | 'redesign' | 'unscanned' | 'ok' | 'chain';

interface Finding {
  code: string;
  points: number;
  de: string;
  tr: string;
  /** Seviye 2 doğrulaması (varsa): confirmed | partial | refuted | unverified */
  verified?: string;
}

interface Prospect {
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
  /** Kayıtlı web adresi başka bir firmanın sitesine gidiyorsa (devralma/yanlış kayıt): taslak üretilmez */
  site_mismatch?: { host: string; owner: string | null } | null;
  demo_last_view?: string | null;
}

/** "dün 21:40", "bugün 09:12", "12.11. 18:05" */
function whenShort(iso: string) {
  const d = new Date(iso);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(new Date()) - day(d)) / 86400000);
  const t = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  if (diff === 0) return `bugün ${t}`;
  if (diff === 1) return `dün ${t}`;
  return `${d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })} ${t}`;
}

interface District {
  id: number;
  country: string;
  city: string;
  name: string;
  admin_level: number;
}

interface Job {
  state: 'running' | 'done' | 'error';
  step: string;
  message: string;
  progress?: { done: number; total: number };
  errors?: string[];
}

interface Meta {
  countries: { code: string; label: string; pilot: boolean; cities: string[] }[];
  categories: { key: string; label: string }[];
  statuses: { key: string; label: string }[];
  cities: { country: string; city: string; total: number }[];
  districts: District[];
  job: Job | null;
}

interface Summary {
  total: number;
  no_site: number;
  redesign: number;
  unscanned: number;
  ok: number;
  chain: number;
  drafts?: number;
  viewed?: number;
}

interface Breakdown {
  city: string;
  category: string;
  total: number;
  no_site: number;
  redesign: number;
  unscanned: number;
}

const KIND_META: Record<Kind, { label: string; cls: string }> = {
  no_site: { label: 'Yeni site', cls: 'bg-[#0071E3]/10 text-[#0058B0]' },
  redesign: { label: 'Yenileme', cls: 'bg-amber-100 text-amber-800' },
  unscanned: { label: 'Taranmadı', cls: 'bg-black/[0.06] text-[#515154]' },
  ok: { label: 'Site iyi', cls: 'bg-emerald-100 text-emerald-800' },
  chain: { label: 'Zincir', cls: 'bg-black/[0.06] text-[#515154]' },
};

const KIND_FILTERS: { id: string; label: string }[] = [
  { id: 'offer', label: 'Teklif verilebilir' },
  { id: 'no_site', label: 'Sitesi yok' },
  { id: 'redesign', label: 'Yenileme adayı' },
  { id: 'unscanned', label: 'Taranmadı' },
  { id: 'draft', label: 'Taslak hazır' },
  { id: 'viewed', label: 'Demo açıldı' },
  { id: 'all', label: 'Tümü' },
];

const ACTIVITY_META = {
  active_likely: { label: 'Muhtemelen açık', cls: 'bg-emerald-100 text-emerald-800' },
  closed_suspected: { label: 'Kapanmış olabilir', cls: 'bg-red-100 text-red-800' },
  unknown: { label: 'Profil var', cls: 'bg-black/[0.06] text-[#515154]' },
} as const;

/** Bölge taramasından sonra derin profili otomatik çıkarılacak aday sayısı (Seviye 2). */
const AUTO_ENRICH_TOP = 10;

const inputCls =
  'w-full px-3 py-2 text-xs bg-[#F5F5F7] rounded-xl border border-black/[0.08] text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]';
const labelCls = 'block text-[11px] font-semibold text-[#6E6E73] mb-1.5';

function scoreCls(score: number) {
  if (score >= 70) return 'bg-red-600 text-white';
  if (score >= 45) return 'bg-amber-500 text-white';
  return 'bg-emerald-600 text-white';
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.success === false) {
    throw new Error(json?.error || `İstek başarısız (HTTP ${res.status})`);
  }
  return json as T;
}

export default function ProspectsPanel({ notify }: { notify: (message: string) => void }) {
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [job, setJob] = useState<Job | null>(null);

  // Bölge + tür seçimi (hem taramayı hem listeyi yönlendirir)
  const [country, setCountry] = useState('DE');
  const [city, setCity] = useState('Duisburg');
  const [areaId, setAreaId] = useState('');
  const [cats, setCats] = useState<string[]>([]);
  const [withScan, setWithScan] = useState(true);
  const [autoEnrich, setAutoEnrich] = useState(true);
  const [profileRefresh, setProfileRefresh] = useState(0);
  const [districtsLoading, setDistrictsLoading] = useState(false);

  // Liste süzgeçleri
  const [kind, setKind] = useState('offer');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [status, setStatus] = useState('');
  const [minScore, setMinScore] = useState(40);
  const [q, setQ] = useState('');

  const [rows, setRows] = useState<Prospect[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown[]>([]);
  const [matched, setMatched] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Prospect | null>(null);
  const [draftNotes, setDraftNotes] = useState('');
  const [draftSite, setDraftSite] = useState('');
  const [offerFor, setOfferFor] = useState<Prospect | null>(null);

  const cityTrim = city.trim();
  const catLabel = useMemo(
    () => Object.fromEntries((meta?.categories ?? []).map((c) => [c.key, c.label])),
    [meta]
  );
  const statusLabel = useMemo(
    () => Object.fromEntries((meta?.statuses ?? []).map((s) => [s.key, s.label])),
    [meta]
  );
  const cityDistricts = useMemo(
    () => (meta?.districts ?? []).filter((d) => d.country === country && d.city === cityTrim),
    [meta, country, cityTrim]
  );
  const citySuggestions = useMemo(() => {
    const preset = meta?.countries.find((c) => c.code === country)?.cities ?? [];
    const known = (meta?.cities ?? []).filter((c) => c.country === country).map((c) => c.city);
    return Array.from(new Set([...known, ...preset]));
  }, [meta, country]);

  const loadMeta = useCallback(async () => {
    try {
      const res = await api<Meta & { available: boolean; reason?: string }>('/api/admin/prospects?view=meta');
      if (!res.available) {
        setUnavailable(res.reason ?? 'WebScout kullanılamıyor.');
        return;
      }
      setUnavailable(null);
      setMeta(res);
      setJob(res.job);
    } catch (e) {
      setUnavailable(e instanceof Error ? e.message : 'WebScout kullanılamıyor.');
    }
  }, []);

  const regionQuery = useCallback(() => {
    const p = new URLSearchParams();
    p.set('country', country);
    if (cityTrim) p.set('city', cityTrim);
    if (areaId) p.set('area', areaId);
    if (cats.length) p.set('category', cats.join(','));
    return p;
  }, [country, cityTrim, areaId, cats]);

  const requestSeq = useRef(0);
  const loadList = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const p = regionQuery();
      p.set('kind', kind);
      if (status) p.set('status', status);
      p.set('minScore', String(minScore));
      if (q.trim()) p.set('q', q.trim());
      if (view === 'map') p.set('limit', '2000');
      const res = await api<{ available: boolean; rows: Prospect[]; summary: Summary; breakdown: Breakdown[]; matched: number }>(
        `/api/admin/prospects?${p.toString()}`
      );
      if (seq !== requestSeq.current || !res.available) return;
      setRows(res.rows);
      // Açık detay penceresi de güncel satırı göstersin (ör. taslak üretildikten sonra bağlantı belirir)
      setSelected((s) => (s ? res.rows.find((r) => r.id === s.id) ?? s : s));
      setSummary(res.summary);
      setBreakdown(res.breakdown);
      setMatched(res.matched);
      setListError(null);
    } catch (e) {
      if (seq === requestSeq.current) setListError(e instanceof Error ? e.message : 'Liste yüklenemedi.');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [regionQuery, kind, status, minScore, q, view]);

  useEffect(() => {
    const t = setTimeout(loadMeta, 0);
    return () => clearTimeout(t);
  }, [loadMeta]);

  // Süzgeç değişince listeyi yenile (yazarken her tuşta istek atmamak için kısa gecikme)
  useEffect(() => {
    if (unavailable || !meta) return;
    const t = setTimeout(loadList, 300);
    return () => clearTimeout(t);
  }, [loadList, unavailable, meta]);

  // Çalışan iş varken ilerlemeyi izle; bitince listeyi ve bölge bilgisini yenile
  const jobRunning = job?.state === 'running';
  useEffect(() => {
    if (!jobRunning) return;
    const t = setInterval(async () => {
      try {
        const res = await api<{ job: Job | null }>('/api/admin/prospects?view=job');
        setJob(res.job);
        if (res.job?.state !== 'running') {
          notify(res.job?.state === 'error' ? `Tarama hatası: ${res.job.message}` : (res.job?.message ?? 'Tarama tamamlandı.'));
          loadMeta();
          loadList();
          setProfileRefresh((n) => n + 1);
        }
      } catch {
        // geçici ağ hatası: bir sonraki turda yeniden dene
      }
    }, 2500);
    return () => clearInterval(t);
  }, [jobRunning, loadMeta, loadList, notify]);

  const loadDistricts = async (refresh = false) => {
    if (!cityTrim) {
      notify('Lütfen önce şehir yazın.');
      return;
    }
    setDistrictsLoading(true);
    try {
      const p = new URLSearchParams({ view: 'districts', country, city: cityTrim });
      if (refresh) p.set('refresh', '1');
      const res = await api<{ districts: { id: number; name: string; admin_level: number }[] }>(`/api/admin/prospects?${p.toString()}`);
      setMeta((m) =>
        m
          ? {
              ...m,
              districts: [
                ...m.districts.filter((d) => !(d.country === country && d.city === cityTrim)),
                ...res.districts.map((d) => ({ ...d, country, city: cityTrim })),
              ],
            }
          : m
      );
      notify(res.districts.length ? `${cityTrim}: ${res.districts.length} ilçe/mahalle yüklendi.` : `${cityTrim} için ilçe/mahalle sınırı bulunamadı.`);
    } catch (e) {
      notify(`Hata: ${e instanceof Error ? e.message : 'İlçe/mahalle listesi alınamadı.'}`);
    } finally {
      setDistrictsLoading(false);
    }
  };

  const startScan = async () => {
    if (!cityTrim) return notify('Lütfen şehir yazın.');
    if (!cats.length) return notify('Lütfen en az bir işletme türü seçin.');
    try {
      await api('/api/admin/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', country, city: cityTrim, area: areaId || undefined, category: cats.join(','), scan: withScan, enrichTop: withScan && autoEnrich ? AUTO_ENRICH_TOP : 0 }),
      });
      setJob({ state: 'running', step: 'resolve', message: `${cityTrim} için tarama başlatıldı…`, progress: { done: 0, total: cats.length } });
    } catch (e) {
      notify(`Hata: ${e instanceof Error ? e.message : 'Tarama başlatılamadı.'}`);
    }
  };

  /** Seviye 2: tek aday (id) ya da geçerli süzgeçteki en iyi adaylar için derin profil işi başlatır. */
  const startEnrich = async (id?: number) => {
    try {
      const body = id
        ? { action: 'enrich', ids: [id] }
        : { action: 'enrich', top: AUTO_ENRICH_TOP, minScore, country, city: cityTrim || undefined, area: areaId || undefined, category: cats.join(',') || undefined };
      await api('/api/admin/prospects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setJob({ state: 'running', step: 'enrich', message: 'Derin profil başlıyor…', progress: { done: 0, total: id ? 1 : AUTO_ENRICH_TOP } });
    } catch (e) {
      notify(`Hata: ${e instanceof Error ? e.message : 'Derin profil başlatılamadı.'}`);
    }
  };

  /** Seviye 3: tek aday için şablon taslağı (gizli demo sayfası) üretir ya da yeniler. */
  const startDraft = async (id: number) => {
    try {
      await api('/api/admin/prospects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'draft', id }) });
      setJob({ state: 'running', step: 'draft', message: 'Şablon taslağı başlıyor…', progress: { done: 0, total: 1 } });
    } catch (e) {
      notify(`Hata: ${e instanceof Error ? e.message : 'Şablon taslağı başlatılamadı.'}`);
    }
  };

  /** Seviye 3 toplu: geçerli süzgeçteki en iyi adaylara taslak üretir (bitince "Taslak hazır" süzgecine geçer). */
  const startDraftTop = async () => {
    try {
      await api('/api/admin/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'draft', top: AUTO_ENRICH_TOP, minScore, country, city: cityTrim || undefined, area: areaId || undefined, category: cats.join(',') || undefined }),
      });
      setJob({ state: 'running', step: 'draft', message: 'Toplu taslak başlıyor…', progress: { done: 0, total: AUTO_ENRICH_TOP } });
      setKind('draft');
    } catch (e) {
      notify(`Hata: ${e instanceof Error ? e.message : 'Toplu taslak başlatılamadı.'}`);
    }
  };

  const copyDraftLink = async (token: string) => {
    const url = `${window.location.origin}/demo/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      notify('Taslak bağlantısı kopyalandı.');
    } catch {
      notify(url);
    }
  };

  const updateProspect = async (id: number, patch: { status?: string; notes?: string; website?: string }, okMessage?: string) => {
    try {
      await api('/api/admin/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id, ...patch }),
      });
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...(patch.status ? { status: patch.status } : {}), ...(patch.notes !== undefined ? { notes: patch.notes } : {}) } : r)));
      setSelected((s) => (s && s.id === id ? { ...s, ...(patch.status ? { status: patch.status } : {}), ...(patch.notes !== undefined ? { notes: patch.notes } : {}) } : s));
      if (patch.website !== undefined) loadList();
      if (okMessage) notify(okMessage);
    } catch (e) {
      notify(`Hata: ${e instanceof Error ? e.message : 'Kayıt güncellenemedi.'}`);
    }
  };

  const openDetail = (p: Prospect) => {
    setSelected(p);
    setDraftNotes(p.notes ?? '');
    setDraftSite(p.website ?? '');
  };

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  /** Listede olmayan adayı (ör. hatırlatmadan) tek başına çekip detayını açar. */
  const openById = async (id: number) => {
    const inList = rows.find((r) => r.id === id);
    if (inList) { openDetail(inList); return; }
    try {
      const res = await api<{ rows: Prospect[] }>(`/api/admin/prospects?kind=all&id=${id}`);
      if (res.rows?.[0]) openDetail(res.rows[0]);
      else notify('Aday bulunamadı.');
    } catch (e) {
      notify(`Hata: ${e instanceof Error ? e.message : 'Aday açılamadı.'}`);
    }
  };

  const exportCsv = () => {
    const cell = (v: unknown) => {
      const s = String(v ?? '');
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['id', 'teklif_turu', 'puan', 'isletme', 'tur', 'sehir', 'bolge', 'adres', 'telefon', 'website', 'durum', 'bulgular_de', 'not'];
    const lines = rows.map((r) =>
      [
        r.id, KIND_META[r.kind].label, r.score ?? '', r.name, catLabel[r.category] ?? r.category, r.city, r.districts ?? r.suburb ?? '',
        r.address ?? '', r.phone ?? '', r.website ?? '', statusLabel[r.status] ?? r.status, r.findings.map((f) => f.de).join(' | '), r.notes.trim(),
      ].map(cell).join(';')
    );
    // BOM: Excel Türkçe/Almanca karakterleri doğru açsın
    const blob = new Blob(['﻿' + [header.join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `musteri_adaylari_${cityTrim || 'tum'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (unavailable) {
    return (
      <div className="apple-card bg-white border border-black/[0.07] p-8 text-center animate-in fade-in duration-200">
        <AlertCircle className="w-6 h-6 text-[#6E6E73] mx-auto mb-3" aria-hidden="true" />
        <h3 className="text-base font-bold text-[#1D1D1F] mb-1">Müşteri adayı aracı burada çalışmıyor</h3>
        <p className="text-xs text-[#6E6E73] max-w-md mx-auto leading-relaxed">{unavailable}</p>
      </div>
    );
  }

  if (!meta) {
    return <div className="apple-card bg-white border border-black/[0.07] p-8 text-center text-xs text-[#6E6E73]">Yükleniyor…</div>;
  }

  const pct = job?.progress?.total ? Math.round((job.progress.done / job.progress.total) * 100) : 0;
  const bezirke = cityDistricts.filter((d) => d.admin_level <= 9);
  const stadtteile = cityDistricts.filter((d) => d.admin_level > 9);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1) Bölge + işletme türü seçimi */}
      <div className="apple-card bg-white border border-black/[0.07] p-5 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="pr-country" className={labelCls}>Ülke</label>
            <select
              id="pr-country"
              value={country}
              onChange={(e) => { setCountry(e.target.value); setCity(''); setAreaId(''); }}
              className={inputCls}
            >
              {meta.countries.map((c) => (
                <option key={c.code} value={c.code}>{c.label}{c.pilot ? ' (pilot)' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pr-city" className={labelCls}>Şehir (yerel adıyla, örn. Köln)</label>
            <input
              id="pr-city"
              list="pr-city-list"
              value={city}
              onChange={(e) => { setCity(e.target.value); setAreaId(''); }}
              placeholder="Tüm şehirler"
              autoComplete="off"
              className={inputCls}
            />
            <datalist id="pr-city-list">
              {citySuggestions.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label htmlFor="pr-area" className={labelCls}>İlçe / Mahalle (isteğe bağlı)</label>
            <div className="flex gap-2">
              <select
                id="pr-area"
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                disabled={!cityDistricts.length}
                className={`${inputCls} disabled:opacity-60`}
              >
                <option value="">{cityDistricts.length ? 'Tüm şehir' : 'Liste yüklenmedi'}</option>
                {bezirke.length > 0 && (
                  <optgroup label="İlçe (Stadtbezirk)">
                    {bezirke.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </optgroup>
                )}
                {stadtteile.length > 0 && (
                  <optgroup label="Mahalle (Stadtteil)">
                    {stadtteile.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </optgroup>
                )}
              </select>
              <button
                type="button"
                onClick={() => loadDistricts(cityDistricts.length > 0)}
                disabled={districtsLoading || !cityTrim}
                title="İlçe/mahalle listesini OpenStreetMap'ten getir"
                className="apple-pill-btn-secondary shrink-0 px-3 py-2 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${districtsLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span>{cityDistricts.length ? 'Yenile' : 'Getir'}</span>
              </button>
            </div>
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className={labelCls}>İşletme türü {cats.length === 0 && <span className="font-normal">— seçim yoksa listede tümü gösterilir</span>}</legend>
          <div className="flex flex-wrap gap-2">
            {meta.categories.map((c) => {
              const on = cats.includes(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCats((prev) => (on ? prev.filter((k) => k !== c.key) : [...prev, c.key]))}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    on ? 'bg-[#1D1D1F] text-white border-[#1D1D1F]' : 'bg-white text-[#515154] border-black/[0.1] hover:bg-black/[0.04]'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-5 pt-4 border-t border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs text-[#515154] cursor-pointer">
              <input type="checkbox" checked={withScan} onChange={(e) => setWithScan(e.target.checked)} className="w-4 h-4 accent-[#0071E3]" />
              <span>Bulunan web sitelerini de tara ve puanla</span>
            </label>
            <label className={`flex items-center gap-2 text-xs text-[#515154] ${withScan ? 'cursor-pointer' : 'opacity-50'}`}>
              <input type="checkbox" checked={withScan && autoEnrich} disabled={!withScan} onChange={(e) => setAutoEnrich(e.target.checked)} className="w-4 h-4 accent-[#0071E3]" />
              <span>Ardından en iyi {AUTO_ENRICH_TOP} adayın derin profilini çıkar (doğrulama, yetkili, açık/kapalı)</span>
            </label>
          </div>
          <button
            type="button"
            onClick={startScan}
            disabled={jobRunning}
            className="apple-pill-btn px-5 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{jobRunning ? 'Tarama sürüyor…' : 'Bu bölgede işletmeleri bul'}</span>
          </button>
        </div>

        {job && (jobRunning || job.state === 'error' || (job.errors?.length ?? 0) > 0) && (
          <div
            role="status"
            className={`mt-4 p-3.5 rounded-xl border text-xs ${
              job.state === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-[#F5F5F7] border-black/[0.06] text-[#1D1D1F]'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold">{job.message}</span>
              {jobRunning && job.progress && (
                <span className="tabular text-[#6E6E73] shrink-0">{job.progress.done}/{job.progress.total}</span>
              )}
            </div>
            {jobRunning && (
              <div className="mt-2 h-1.5 rounded-full bg-black/[0.08] overflow-hidden">
                <div className="h-full bg-[#0071E3] transition-all duration-500" style={{ width: `${Math.max(4, pct)}%` }} />
              </div>
            )}
            {(job.errors?.length ?? 0) > 0 && (
              <ul className="mt-2 space-y-0.5 text-[11px] text-red-700">
                {job.errors!.map((er) => <li key={er}>{er}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* 2) Özet */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Bulunan işletme', value: summary.total, hint: summary.chain ? `${summary.chain.toLocaleString('tr-TR')} zincir şubesi hariç tutulur` : 'Seçili bölge ve türlerde' },
            { label: 'Sitesi yok', value: summary.no_site, hint: 'Yeni site teklifi' },
            { label: 'Yenileme adayı', value: summary.redesign, hint: `Sorun puanı ≥ ${minScore}` },
            { label: 'Henüz taranmadı', value: summary.unscanned, hint: 'Sitesi var, puanı yok' },
          ].map((s) => (
            <div key={s.label} className="apple-card p-5 bg-white border border-black/[0.07]">
              <span className="text-xs font-medium text-[#6E6E73]">{s.label}</span>
              <div className="text-2xl font-semibold text-[#1D1D1F] mt-1 tabular">{s.value.toLocaleString('tr-TR')}</div>
              <span className="text-[11px] text-[#6E6E73]">{s.hint}</span>
            </div>
          ))}
        </div>
      )}

      {/* 2b) Satış hunisi + yapılacaklar */}
      {summary && <ProspectFunnel query={regionQuery().toString()} stamp={summary} onOpen={openById} />}

      {/* 3) Süzgeçler */}
      <div className="apple-card p-4 sm:p-5 bg-white border border-black/[0.07] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Teklif türü">
          {KIND_FILTERS.map((k) => (
            <button
              key={k.id}
              type="button"
              aria-pressed={kind === k.id}
              onClick={() => setKind(k.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                kind === k.id ? 'bg-[#0071E3] text-white' : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-black/[0.06]'
              }`}
            >
              {k.label}
              {k.id === 'draft' && summary?.drafts ? <span className="ml-1 tabular opacity-80">({summary.drafts.toLocaleString('tr-TR')})</span> : null}
              {k.id === 'viewed' && summary?.viewed ? <span className="ml-1 tabular opacity-80">({summary.viewed.toLocaleString('tr-TR')})</span> : null}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-52">
            <input
              type="text"
              aria-label="İşletme, adres veya site ara"
              placeholder="İşletme, adres, site ara…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={`${inputCls} pl-9`}
            />
            <Search className="w-4 h-4 text-[#6E6E73] absolute left-3 top-2" aria-hidden="true" />
          </div>
          <select aria-label="Durum" value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} !w-auto font-medium`}>
            <option value="">Tüm durumlar</option>
            {meta.statuses.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-[#515154]">
            <span>Min. puan</span>
            <input
              type="number"
              min={0}
              max={100}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className={`${inputCls} !w-16 tabular`}
            />
          </label>
          <button
            type="button"
            onClick={() => startEnrich()}
            disabled={jobRunning}
            title={`Bu süzgeçte puanı en yüksek, henüz derin profili olmayan ${AUTO_ENRICH_TOP} yenileme adayını derin tarar`}
            className="apple-pill-btn-secondary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            <ScanSearch className="w-3.5 h-3.5" aria-hidden="true" />
            <span>İlk {AUTO_ENRICH_TOP}’u derin tara</span>
          </button>
          <button
            type="button"
            onClick={startDraftTop}
            disabled={jobRunning}
            title={`Bu süzgeçte puanı en yüksek, sitesi olan ve henüz taslağı olmayan ${AUTO_ENRICH_TOP} yenileme adayına örnek site üretir (gerekirse önce derin tarar; aday başına ~1 dk)`}
            className="apple-pill-btn-secondary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            <LayoutTemplate className="w-3.5 h-3.5" aria-hidden="true" />
            <span>İlk {AUTO_ENRICH_TOP}’a taslak üret</span>
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!rows.length}
            className="apple-pill-btn-secondary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Ziyaret listesi (CSV)</span>
          </button>
        </div>
      </div>

      {/* 4) Liste */}
      <div className="apple-card bg-white border border-black/[0.07] overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between text-xs text-[#6E6E73]">
          <span>
            {loading ? 'Yükleniyor…' : `${matched.toLocaleString('tr-TR')} aday`}
            {!loading && matched > rows.length && ` — ilk ${rows.length} gösteriliyor, süzgeçle daraltın`}
          </span>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline">{view === 'map' ? 'Aynı bölgedekileri tek rotada toplayın' : 'Puan yüksek = sitede daha çok sorun = daha güçlü yenileme adayı'}</span>
            <a href="/admin/saha" className="font-semibold text-[#0071E3] hover:underline whitespace-nowrap">Saha listesi</a>
            <div className="flex rounded-lg bg-[#F5F5F7] p-0.5" role="group" aria-label="Görünüm">
              {([['list', 'Liste', List], ['map', 'Harita', MapIcon]] as const).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={view === id}
                  onClick={() => setView(id)}
                  className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 ${view === id ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-[#6E6E73] hover:text-[#1D1D1F]'}`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {listError ? (
          <p className="p-8 text-center text-xs text-red-700">{listError}</p>
        ) : rows.length === 0 && !loading ? (
          <p className="p-8 text-center text-xs text-[#6E6E73] leading-relaxed">
            Bu seçimde aday yok. Yukarıdan şehir ve işletme türü seçip <strong className="text-[#1D1D1F]">“Bu bölgede işletmeleri bul”</strong> ile tarama başlatın
            ya da süzgeci <strong className="text-[#1D1D1F]">Tümü</strong> yapın.
          </p>
        ) : view === 'map' ? (
          <ProspectMap
            rows={rows}
            onOpen={(id) => {
              const p = rows.find((r) => r.id === id);
              if (p) openDetail(p);
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F5F7] border-b border-black/[0.06] text-[#6E6E73]">
                <tr>
                  <th className="p-4 font-semibold">Teklif</th>
                  <th className="p-4 font-semibold">İşletme</th>
                  <th className="p-4 font-semibold">Web sitesi</th>
                  <th className="p-4 font-semibold">Adres / Telefon</th>
                  <th className="p-4 font-semibold">Bulgular</th>
                  <th className="p-4 font-semibold">Durum</th>
                  <th className="p-4 font-semibold text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F5F5F7]/50 transition-colors align-top">
                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${KIND_META[r.kind].cls}`}>{KIND_META[r.kind].label}</span>
                      {r.score !== null && r.kind !== 'no_site' && (
                        <span className={`ml-1.5 inline-block min-w-7 text-center px-1.5 py-0.5 rounded-md text-[11px] font-bold tabular ${scoreCls(r.score)}`}>{r.score}</span>
                      )}
                    </td>
                    <td className="p-4 min-w-44">
                      <div className="font-bold text-[#1D1D1F]">{r.name}</div>
                      <span className="text-[#6E6E73] text-[11px]">
                        {catLabel[r.category] ?? r.category} · {r.city}
                        {(r.districts || r.suburb) && ` · ${r.districts ?? r.suburb}`}
                      </span>
                      {r.activity && (
                        <span className={`mt-1 block w-fit px-1.5 py-0.5 rounded-md text-[10px] font-bold ${ACTIVITY_META[r.activity].cls}`} title="Derin profil çıkarıldı (Detay’da)">
                          {ACTIVITY_META[r.activity].label}
                        </span>
                      )}
                      {r.draft_token && (
                        <a
                          href={`/demo/${r.draft_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 w-fit px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center gap-1"
                          title="Örnek siteyi yeni sekmede aç"
                        >
                          <LayoutTemplate className="w-3 h-3" aria-hidden="true" /> Taslak hazır
                        </a>
                      )}
                      {r.site_mismatch && (
                        <span
                          className="mt-1 w-fit px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-800 flex items-center gap-1"
                          title={`Kayıtlı adres ${r.site_mismatch.host} sitesine gidiyor; bu site başka bir firmaya ait görünüyor`}
                        >
                          <AlertCircle className="w-3 h-3" aria-hidden="true" /> Site başka firmaya gidiyor
                        </span>
                      )}
                      {r.demo_views && r.demo_last_view ? (
                        <span
                          className="mt-1 w-fit px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1"
                          title="Müşteri demoyu açtı (panele girişli kullanıcılar ve bağlantı önizlemeleri sayılmaz)"
                        >
                          <Eye className="w-3 h-3" aria-hidden="true" /> {r.demo_views}× açıldı · {whenShort(r.demo_last_view)}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-4 max-w-52">
                      {r.website ? (
                        <a href={r.final_url || r.website} target="_blank" rel="noopener noreferrer" className="text-[#0071E3] font-semibold hover:underline break-all">
                          {r.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                        </a>
                      ) : (
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(`${r.name} ${r.city}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#515154] hover:text-[#0071E3] inline-flex items-center gap-1"
                          title="OpenStreetMap'te site kaydı yok. Ziyaretten önce Google'da doğrulayın."
                        >
                          <span>Kayıtlı site yok · Google’da bak</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      )}
                      {r.tech && <span className="block text-[#6E6E73] text-[11px] mt-0.5">{r.tech}</span>}
                    </td>
                    <td className="p-4 min-w-44">
                      <div className="text-[#1D1D1F]">{r.address || '—'}</div>
                      {r.phone && <a href={`tel:${r.phone.replace(/[^+\d]/g, '')}`} className="text-[#6E6E73] text-[11px] hover:text-[#0071E3]">{r.phone}</a>}
                    </td>
                    <td className="p-4 max-w-64">
                      {r.findings.length ? (
                        <div className="flex flex-wrap gap-1">
                          {/* Derin taramanın çürüttüğü bulgular listede gösterilmez (Detay'da üstü çizili durur) */}
                          {r.findings.filter((f) => f.verified !== 'refuted').slice(0, 4).map((f) => (
                            <span key={f.code} title={f.de} className="px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#515154] text-[11px]">{f.tr}</span>
                          ))}
                          {r.findings.filter((f) => f.verified !== 'refuted').length > 4 && (
                            <span className="text-[11px] text-[#6E6E73] self-center">+{r.findings.filter((f) => f.verified !== 'refuted').length - 4}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#6E6E73]">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <select
                        aria-label={`${r.name} durumu`}
                        value={r.status}
                        onChange={(e) => updateProspect(r.id, { status: e.target.value })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border-0 cursor-pointer ${
                          r.status === 'new' ? 'bg-blue-100 text-blue-700'
                            : r.status === 'won' ? 'bg-emerald-100 text-emerald-700'
                            : r.status === 'lost' || r.status === 'do_not_contact' ? 'bg-black/[0.06] text-[#515154]'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {meta.statuses.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(r.kind === 'no_site' || r.kind === 'redesign') && (
                          <button
                            type="button"
                            onClick={() => setOfferFor(r)}
                            className="text-xs font-semibold text-[#10B981] hover:underline flex items-center gap-1 whitespace-nowrap"
                          >
                            <Printer className="w-3 h-3" aria-hidden="true" />
                            <span>Teklif</span>
                          </button>
                        )}
                        <button type="button" onClick={() => openDetail(r)} className="apple-pill-btn-secondary px-3 py-1.5 text-xs font-semibold">
                          Detay
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5) Şehir × tür dağılımı */}
      {breakdown.length > 0 && (
        <div className="apple-card bg-white border border-black/[0.07] overflow-hidden">
          <h3 className="px-4 pt-4 pb-3 text-sm font-bold text-[#1D1D1F]">Şehir ve türe göre dağılım</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F5F7] border-y border-black/[0.06] text-[#6E6E73]">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Şehir</th>
                  <th className="px-4 py-2.5 font-semibold">Tür</th>
                  <th className="px-4 py-2.5 font-semibold text-right">İşletme</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Sitesi yok</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Yenileme adayı</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Taranmadı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {breakdown.map((b) => (
                  <tr key={`${b.city}-${b.category}`}>
                    <td className="px-4 py-2.5 font-semibold text-[#1D1D1F]">{b.city}</td>
                    <td className="px-4 py-2.5 text-[#515154]">{catLabel[b.category] ?? b.category}</td>
                    <td className="px-4 py-2.5 text-right tabular">{b.total}</td>
                    <td className="px-4 py-2.5 text-right tabular">{b.no_site}</td>
                    <td className="px-4 py-2.5 text-right tabular">{b.redesign}</td>
                    <td className="px-4 py-2.5 text-right tabular">{b.unscanned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[11px] text-[#6E6E73] leading-relaxed max-w-3xl">
        <strong className="text-[#515154]">Kanal kuralı:</strong> Almanya’da işletmelere izinsiz reklam e-postası yasaktır (UWG §7); bu liste yalnızca yüz yüze ziyaret ve aracı
        ortaklar içindir. Bulgular otomatik teknik göstergedir, hukuki değerlendirme değildir: müşteriye “hukuka aykırı” değil “kontrol edilmeli” denir.
        “Sitesi yok” OpenStreetMap kaydına dayanır; ziyaretten önce elle doğrulayın. Veri © OpenStreetMap katkıcıları (ODbL).
      </p>

      {offerFor && <ProspectOffer prospect={offerFor} onClose={() => setOfferFor(null)} />}

      {/* Detay penceresi */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Aday detayı"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
          className="admin-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div className="apple-card bg-white p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto border border-black/[0.1] shadow-2xl relative">
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-black/[0.06] mb-5">
              <div className="min-w-0">
                <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${KIND_META[selected.kind].cls}`}>
                  {KIND_META[selected.kind].label}{selected.kind === 'no_site' || selected.kind === 'redesign' ? ' teklifi' : ''}
                </span>
                <h4 className="text-lg font-bold text-[#1D1D1F] mt-1">{selected.name}</h4>
                <span className="text-xs text-[#6E6E73]">{catLabel[selected.category] ?? selected.category} · {selected.city}</span>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Kapat" className="admin-close">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[#6E6E73] flex items-center gap-1"><MapPin className="w-3 h-3" aria-hidden="true" /> Adres</span>
                  <strong className="text-[#1D1D1F]">{selected.address || '—'}</strong>
                  {selected.lat !== null && selected.lon !== null && (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${selected.lat}&mlon=${selected.lon}#map=18/${selected.lat}/${selected.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[#0071E3] font-semibold hover:underline mt-0.5"
                    >
                      Haritada aç
                    </a>
                  )}
                </div>
                <div>
                  <span className="text-[#6E6E73] flex items-center gap-1"><Phone className="w-3 h-3" aria-hidden="true" /> Telefon</span>
                  {selected.phone ? (
                    <a href={`tel:${selected.phone.replace(/[^+\d]/g, '')}`} className="text-[#0071E3] font-semibold underline">{selected.phone}</a>
                  ) : (
                    <strong className="text-[#1D1D1F]">—</strong>
                  )}
                </div>
              </div>

              <div>
                {selected.site_mismatch && (
                  <p role="alert" className="mb-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs leading-relaxed flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      Kayıtlı web adresi <b>{selected.site_mismatch.host}</b> sitesine gidiyor
                      {selected.site_mismatch.owner ? <> (Impressum: <b>{selected.site_mismatch.owner}</b>)</> : null}; sitede bu işletmenin adı geçmiyor.
                      Firma devredilmiş ya da kayıt yanlış olabilir — sahada kontrol edin, doğru adresi aşağıya yazın. O zamana kadar taslak üretilmez.
                    </span>
                  </p>
                )}
                <label htmlFor="pr-site" className="text-[#6E6E73] flex items-center gap-1 mb-1">
                  <Globe className="w-3 h-3" aria-hidden="true" /> Web sitesi {selected.website ? '' : '(kayıtlı değil — sahada/Google’da bulduysanız yazın)'}
                </label>
                <div className="flex gap-2">
                  <input id="pr-site" value={draftSite} onChange={(e) => setDraftSite(e.target.value)} placeholder="ornek.de" className={inputCls} />
                  <button
                    type="button"
                    disabled={draftSite.trim() === (selected.website ?? '')}
                    onClick={() => { updateProspect(selected.id, { website: draftSite.trim() }, 'Web adresi kaydedildi.'); setSelected(null); }}
                    className="apple-pill-btn-secondary shrink-0 px-3 py-2 text-xs font-semibold disabled:opacity-50"
                  >
                    Kaydet
                  </button>
                </div>
              </div>

              {selected.findings.length > 0 && (
                <div className="p-3.5 bg-[#F5F5F7] rounded-xl border border-black/[0.04]">
                  <span className="text-[#6E6E73] block mb-2">
                    Teknik bulgular{selected.score !== null && selected.kind !== 'no_site' ? ` — sorun puanı ${selected.score}/100` : ''}
                    {selected.score !== null && selected.raw_score !== null && selected.raw_score !== selected.score && (
                      <span> (ilk tarama {selected.raw_score}; yanlış alarmlar düşüldü)</span>
                    )}
                  </span>
                  <ul className="space-y-1.5">
                    {selected.findings.map((f) => {
                      const refuted = f.verified === 'refuted';
                      return (
                        <li key={f.code} className={`flex items-start justify-between gap-3 ${refuted ? 'opacity-60' : ''}`}>
                          <span>
                            <span className={`text-[#1D1D1F] font-semibold ${refuted ? 'line-through' : ''}`}>{f.tr}</span>
                            {refuted && <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-red-100 text-red-800 text-[10px] font-bold">Yanlış alarm</span>}
                            <span className="block text-[#6E6E73] text-[11px]" lang="de">{f.de}</span>
                          </span>
                          <span className={`tabular text-[#6E6E73] shrink-0 ${refuted ? 'line-through' : ''}`}>+{f.points}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-[11px] text-[#6E6E73] mt-2.5">Görüşmede “hukuka aykırı” demeyin; “kontrol edilmeli” deyin.</p>
                </div>
              )}

              <ProspectProfile
                prospect={selected}
                findings={selected.findings}
                jobRunning={jobRunning}
                refreshKey={profileRefresh}
                onEnrich={startEnrich}
              />

              {/* Seviye 3: şablon taslağı */}
              <div className="p-3.5 rounded-xl border border-black/[0.08]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <strong className="text-[#1D1D1F] flex items-center gap-1.5">
                    <LayoutTemplate className="w-3.5 h-3.5" aria-hidden="true" /> Şablon taslağı
                  </strong>
                  {selected.draft_token ? (
                    <span className="block text-[11px] text-[#6E6E73] mt-0.5">
                      Hazır · {selected.draft_expires ? `${new Date(selected.draft_expires).toLocaleDateString('tr-TR')} tarihine kadar açık` : 'süreli'} · arama motorlarına kapalı gizli adres
                    </span>
                  ) : (
                    <span className="block text-[11px] text-[#6E6E73] mt-0.5 leading-relaxed">
                      İşletmenin adı, adresi, saatleri, logosu ve kendi görselleriyle telefon ve masaüstü uyumlu örnek site (yaklaşık 1 dk).
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selected.draft_token && (
                    <>
                      <a
                        href={`/demo/${selected.draft_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="apple-pill-btn px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <span>Taslağı aç</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                      <button type="button" onClick={() => copyDraftLink(selected.draft_token!)} className="apple-pill-btn-secondary px-3 py-1.5 text-xs font-semibold">
                        Bağlantıyı kopyala
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    disabled={jobRunning}
                    onClick={() => startDraft(selected.id)}
                    className="apple-pill-btn-secondary px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    {jobRunning ? 'Çalışıyor…' : selected.draft_token ? 'Yeniden üret' : 'Taslak oluştur'}
                  </button>
                </div>
              </div>
              <ProspectPhotos key={selected.id} id={selected.id} />
              </div>

              <div>
                <span className="text-[#6E6E73] block mb-1">Durum</span>
                <div className="flex flex-wrap gap-2">
                  {meta.statuses.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      aria-pressed={selected.status === s.key}
                      onClick={() => updateProspect(selected.id, { status: s.key })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        selected.status === s.key ? 'bg-[#0071E3] text-white shadow-xs' : 'bg-[#F5F5F7] text-[#1D1D1F]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <ProspectVisits key={`v${selected.id}`} id={selected.id} />

              <div>
                <label htmlFor="pr-notes" className="text-[#6E6E73] block mb-1">Ziyaret notları</label>
                <textarea
                  id="pr-notes"
                  rows={4}
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="Kiminle görüşüldü, ne dendi, ne zaman tekrar gidilecek…"
                  className={`${inputCls} resize-y leading-relaxed`}
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-black/[0.06] flex flex-wrap items-center justify-end gap-2">
              {(selected.kind === 'no_site' || selected.kind === 'redesign') && (
                <button
                  type="button"
                  onClick={() => { setOfferFor(selected); setSelected(null); }}
                  className="apple-pill-btn-secondary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 mr-auto"
                >
                  <Printer className="w-3.5 h-3.5 text-[#10B981]" aria-hidden="true" />
                  <span>Almanca teklif sayfası</span>
                </button>
              )}
              <button type="button" onClick={() => setSelected(null)} className="apple-pill-btn-secondary px-4 py-2 text-xs font-semibold">Kapat</button>
              <button
                type="button"
                disabled={draftNotes === (selected.notes ?? '')}
                onClick={() => updateProspect(selected.id, { notes: draftNotes }, 'Not kaydedildi.')}
                className="apple-pill-btn px-5 py-2 text-xs font-semibold disabled:opacity-50"
              >
                Notu kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
