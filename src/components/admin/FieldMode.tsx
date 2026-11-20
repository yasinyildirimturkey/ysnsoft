'use client';

/**
 * Saha listesi (telefon): haritada bir güne kaydedilen ziyaret planı.
 * Her durakta bugünkü açılış saati, "şu an açık mı", önerilen ziyaret saati, yol tarifi / arama / demo
 * ve tek dokunuşla ziyaret sonucu (not + bir sonraki ziyaret tarihi). Sonuç adayın durumunu günceller.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DraftChecklist, { type DraftQuality } from './DraftChecklist';
import { markFromField, prospectHref } from './prospect-shared';
import WhatsAppDemo from './WhatsAppDemo';
import NotificationBell from './NotificationBell';
import VoiceNote from './VoiceNote';
import {
  ArrowLeft, CheckCircle2, Clock, ExternalLink, Loader2, LocateFixed, MapPin, Navigation, Phone, PlayCircle, RefreshCw,
} from 'lucide-react';
import {
  CATEGORY_LABEL, DAY_NAMES, dayWindows, fmtMin, fmtRanges, isoDay, localDayOf, NEEDS_NEXT, openNow, planDay, STATE_LABEL,
  LOSS_REASON_LABEL, VISIT_OUTCOME_LABEL, weekdayOf, type Week,
} from '@/lib/visit-plan';

interface LastVisit { outcome: string; at: string; note: string; next_at: string | null }

interface FieldRow {
  id: number;
  name: string;
  category: string | null;
  address: string | null;
  city: string;
  phone: string | null;
  lat: number | null;
  lon: number | null;
  status: string;
  notes: string;
  visit_date: string | null;
  visit_order: number | null;
  draft_token: string | null;
  week: Week;
  appointment: boolean;
  last_visit: LastVisit | null;
  demo_views?: number;
  demo_last_view?: string | null;
  draft_quality?: DraftQuality | null;
  kind?: string | null;
  findings?: { code: string; points: number; tr?: string; verified?: string }[] | null;
  offer_package?: string | null;
  example?: { name: string; suburb?: string | null; url: string; km?: number | null; sameTrade?: boolean } | null;
}

// Hukuki sonuç doğurabilecek bulgular sahada "kesin" söylenmez: yalnız "kontrol edilmeli" diye geçer
const LEGAL_CODES = new Set(['no_impressum', 'no_datenschutz', 'google_fonts_extern', 'tracking_ohne_consent']);

/** Kapı önünde 30 saniyelik özet: aday verisinden, yapay zekâ kullanmadan (ücretsiz, internetsiz çalışır). */
function briefOf(r: FieldRow): string[] {
  const out: string[] = [];
  if (r.kind === 'no_site') out.push('Kendi sitesi yok (yalnız Google/sosyal medya) → yeni site teklifi.');
  const issues = (r.findings ?? [])
    .filter((f) => f.verified !== 'refuted' && f.tr)
    .sort((a, b) => b.points - a.points)
    .slice(0, 3);
  for (const f of issues) out.push(LEGAL_CODES.has(f.code) ? `${f.tr} — kontrol edilmeli (hukuki değerlendirme değil).` : `${f.tr}.`);
  if (r.demo_views) out.push(`Demoyu ${r.demo_views} kez açtı — ilgili; demoyu birlikte açın.`);
  else if (r.draft_token) out.push('Demo hazır — telefondan gösterin.');
  if (r.offer_package) out.push(`Teklif verildi: ${r.offer_package} paketi.`);
  if (r.last_visit) out.push(`Son görüşme: ${VISIT_OUTCOME_LABEL[r.last_visit.outcome] ?? r.last_visit.outcome}${r.last_visit.note ? ` — "${r.last_visit.note.slice(0, 80)}"` : ''}.`);
  return out.slice(0, 5);
}

const OUTCOME_STYLE: Record<string, string> = {
  talked: 'bg-blue-600',
  demo_shown: 'bg-indigo-600',
  offer_requested: 'bg-emerald-600',
  won: 'bg-green-700',
  come_back: 'bg-amber-500',
  closed: 'bg-slate-500',
  not_interested: 'bg-red-600',
  demo_sent: 'bg-[#25D366]',
};

const telHref = (p: string) => `tel:${p.replace(/[^+\d]/g, '')}`;
const placeOf = (r: FieldRow) => (r.address ? `${r.name}, ${r.address}` : `${r.lat},${r.lon}`);
const navUrl = (r: FieldRow) => `https://www.google.com/maps/dir/?${new URLSearchParams({ api: '1', travelmode: 'driving', destination: placeOf(r) })}`;

function plusDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  // Hafta sonuna denk gelirse pazartesiye
  while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1);
  return isoDay(d);
}

function fmtDay(iso: string) {
  return `${DAY_NAMES[weekdayOf(iso)]} ${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;
}

// ── Çevrimdışı çalışma (telefonda localStorage) ──
// Günün listesi her başarılı yüklemede saklanır; bağlantı koparsa bu kopya gösterilir.
// Bağlantı yokken girilen ziyaret sonuçları kuyruğa alınır, internet gelince sırayla gönderilir.
interface CachedDay { at: string; rows: FieldRow[] }
interface QueuedVisit { id: number; name: string; body: Record<string, unknown>; at: string }
interface TodayReminder { id: number; name: string; city: string; type: string; phone?: string | null; count?: number; at?: string | null }
interface TodaySummary { today: string; today_planned: number; items: TodayReminder[]; total: number }

const DAY_KEY = (d: string) => `saha:day:${d}`;

// Sahada "bulunduğum yerden yeniden sırala": o güne özel, telefonda saklanır (internet gerekmez)
interface LocalOrder { ids: number[]; eta: Record<number, number | null>; at: string }
const ORDER_KEY = (d: string) => `saha:order:${d}`;
function readOrder(d: string): LocalOrder | null {
  try { const o = JSON.parse(localStorage.getItem(ORDER_KEY(d)) || 'null'); return o && Array.isArray(o.ids) ? o : null; } catch { return null; }
}
function writeOrder(d: string, o: LocalOrder | null) {
  try { if (o) localStorage.setItem(ORDER_KEY(d), JSON.stringify(o)); else localStorage.removeItem(ORDER_KEY(d)); } catch { /* yok say */ }
}
function currentPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) { reject(new Error('Bu cihaz konum vermiyor.')); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => reject(new Error(e.code === 1 ? 'Konum izni verilmedi. Tarayıcı ayarlarından bu siteye konum izni verin.' : 'Konum alınamadı; açık alanda tekrar deneyin.')),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  });
}
const QUEUE_KEY = 'saha:queue';

function saveDay(d: string, rows: FieldRow[]) {
  try { localStorage.setItem(DAY_KEY(d), JSON.stringify({ at: new Date().toISOString(), rows } satisfies CachedDay)); } catch { /* kota */ }
}
function readDay(d: string): CachedDay | null {
  try { const v = localStorage.getItem(DAY_KEY(d)); return v ? (JSON.parse(v) as CachedDay) : null; } catch { return null; }
}
function readQueue(): QueuedVisit[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as QueuedVisit[]; } catch { return []; }
}
function writeQueue(q: QueuedVisit[]) {
  try { if (q.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); else localStorage.removeItem(QUEUE_KEY); } catch { /* yok say */ }
}
function enqueue(v: QueuedVisit) { writeQueue([...readQueue(), v]); }

/** Kuyruktakileri sırayla gönderir. Ağ hatasında durur (sonra yeniden denenir); sunucu reddederse o kayıt atılır. */
async function flushQueue(): Promise<{ sent: number; left: number }> {
  let q = readQueue();
  let sent = 0;
  while (q.length) {
    try {
      const res = await fetch('/api/admin/prospects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q[0].body) });
      if (res.status === 401 || res.status === 403) break; // oturum kapalı: girişten sonra gönderilir
      sent += res.ok ? 1 : 0;
    } catch {
      break; // hâlâ bağlantı yok
    }
    q = q.slice(1);
    writeQueue(q);
  }
  return { sent, left: q.length };
}

const isTodayStr = (d: string) => Boolean(d) && d === isoDay();
const REMINDER_TR: Record<string, string> = {
  hot_demo: 'Demo açıldı', missed_visit: 'Ziyaret kaçtı', offer_due: 'Teklif bekliyor', offer_silent: 'Teklif sessiz', stale: 'Hareketsiz',
};

export default function FieldMode() {
  const [date, setDate] = useState('');
  const [rows, setRows] = useState<FieldRow[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState<{ day: string; min: number } | null>(null);

  // Tarih ve saat yalnızca istemcide: sunucu saat dilimi telefonunkinden farklı olabilir
  useEffect(() => {
    const tick = () => { const d = new Date(); setNow({ day: isoDay(d), min: d.getHours() * 60 + d.getMinutes() }); };
    const t = setTimeout(() => {
      tick();
      const q = new URLSearchParams(window.location.search).get('date') ?? '';
      setDate(/^\d{4}-\d{2}-\d{2}$/.test(q) ? q : isoDay());
    }, 0);
    const iv = setInterval(tick, 60_000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, []);

  const [offlineAt, setOfflineAt] = useState<string | null>(null);
  const [queued, setQueued] = useState(0);
  const [today, setToday] = useState<TodaySummary | null>(null);
  const [order, setOrder] = useState<LocalOrder | null>(null);
  const [suggestion, setSuggestion] = useState<{ city: string | null; stops: { id: number; name: string; kind: string; score: number }[] } | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [routeMsg, setRouteMsg] = useState('');

  const load = useCallback(async (d: string) => {
    if (!d) return;
    setLoading(true);
    setError('');
    setSuggestion(null);
    try {
      const res = await fetch(`/api/admin/prospects?view=day&date=${d}`, { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) throw new Error('Oturum kapanmış. Panele yeniden giriş yapın.');
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Liste alınamadı');
      if (j.available === false) throw new Error('Aday aracı bu sunucuda çalışmıyor.');
      setRows(j.rows ?? []);
      setOfflineAt(null);
      setOrder(readOrder(d));
      saveDay(d, j.rows ?? []);
    } catch (e) {
      // Bağlantı yoksa bu gün için telefonda saklanan son liste gösterilir
      const cached = e instanceof TypeError ? readDay(d) : null;
      if (cached) { setRows(cached.rows); setOfflineAt(cached.at); setOrder(readOrder(d)); }
      else setError(e instanceof TypeError ? 'İnternet bağlantısı yok ve bu gün için kayıtlı liste bulunamadı.' : e instanceof Error ? e.message : 'Liste alınamadı');
    } finally {
      setLoading(false);
    }
  }, []);

  /** Çevrimdışıyken girilen sonuçları gönderir; sonra listeyi yeniler. */
  const flush = useCallback(async () => {
    const r = await flushQueue();
    setQueued(r.left);
    if (r.sent) void load(date);
  }, [date, load]);

  useEffect(() => {
    const t = setTimeout(() => {
      void load(date);
      setQueued(readQueue().length);
      if (navigator.onLine) void flush();
    }, 0);
    return () => clearTimeout(t);
  }, [date, load, flush]);

  // Bağlantı gelince kuyruğu gönder; uygulama olarak kurulabilsin diye service worker
  useEffect(() => {
    const onOnline = () => { void flush(); };
    window.addEventListener('online', onOnline);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/saha-sw.js', { scope: '/admin/saha' }).catch(() => { /* desteklenmiyorsa sorun değil */ });
    return () => window.removeEventListener('online', onOnline);
  }, [flush]);

  // Sabah özeti: bugün yapılacaklar (sıcak demolar, kaçan ziyaretler, bekleyen teklifler)
  useEffect(() => {
    if (!isTodayStr(date)) return;
    let alive = true;
    fetch('/api/admin/prospects?view=reminders', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { if (alive && j.success) { setToday(j); try { localStorage.setItem('saha:today', JSON.stringify(j)); } catch { /* yok say */ } } })
      .catch(() => { try { const c = localStorage.getItem('saha:today'); if (alive && c) setToday(JSON.parse(c)); } catch { /* yok say */ } });
    return () => { alive = false; };
  }, [date]);

  const day = date ? weekdayOf(date) : 0;
  const isToday = Boolean(now && date === now.day);
  const doneToday = (r: FieldRow) => Boolean(r.last_visit && localDayOf(r.last_visit.at) === date);

  const list = useMemo(() => {
    const base = (rows ?? []).slice().sort((a, b) => (a.visit_order ?? 999) - (b.visit_order ?? 999));
    if (!order) return base;
    // Yeniden sıralanmış duraklar önce (yeni sırayla), geri kalanlar (yapılanlar, konumsuzlar) planlanan sırayla
    const pos = new Map(order.ids.map((id, i) => [id, i]));
    return base.sort((a, b) => (pos.get(a.id) ?? 1000 + (a.visit_order ?? 999)) - (pos.get(b.id) ?? 1000 + (b.visit_order ?? 999)));
  }, [rows, order]);
  const remaining = list.filter((r) => !doneToday(r) && r.visit_date === date && dayWindows({ ...r, lat: 0, lon: 0 }, day).state !== 'closed');
  const done = list.filter(doneToday).length;

  const remainingRoute = remaining.length
    ? `https://www.google.com/maps/dir/?${new URLSearchParams({
      api: '1',
      travelmode: 'driving',
      destination: placeOf(remaining[remaining.length - 1]),
      ...(remaining.length > 1 ? { waypoints: remaining.slice(0, -1).slice(0, 9).map(placeOf).join('|') } : {}),
    })}`
    : '';

  // Planı olmayan gün için öneri (akşam bildirimi de buraya getirir): onaylanınca o günün planı olarak kaydedilir
  const fetchSuggestion = async () => {
    setSuggesting(true);
    setRouteMsg('');
    try {
      const res = await fetch(`/api/admin/prospects?view=suggest&date=${date}`, { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error || 'Öneri alınamadı');
      setSuggestion({ city: j.city ?? null, stops: j.stops ?? [] });
    } catch (e) {
      setRouteMsg(e instanceof TypeError ? 'İnternet yok; öneri alınamadı.' : e instanceof Error ? e.message : 'Öneri alınamadı');
    } finally {
      setSuggesting(false);
    }
  };
  const approveSuggestion = async () => {
    if (!suggestion?.stops.length) return;
    setSuggesting(true);
    try {
      const res = await fetch('/api/admin/prospects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'plan', date, ids: suggestion.stops.map((s) => s.id) }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.success === false) throw new Error(j.error || 'Plan kaydedilemedi');
      setSuggestion(null);
      await load(date);
      setRouteMsg('Plan kaydedildi. Sahada "Bulunduğum yerden sırala" ile sırayı güncelleyebilirsiniz.');
    } catch (e) {
      setRouteMsg(e instanceof Error ? e.message : 'Plan kaydedilemedi');
    } finally {
      setSuggesting(false);
    }
  };

  // Demosunu son görüşmeden sonra açan adaylar (en sıcak): listenin başında, tek dokunuşla bugünün planına eklenir
  const hot = (today?.items ?? []).filter((it) => it.type === 'hot_demo').slice(0, 5);
  const [adding, setAdding] = useState<number | null>(null);
  const addToToday = async (id: number) => {
    setAdding(id);
    setRouteMsg('');
    try {
      const ids = [...list.filter((r) => r.visit_date === date).map((r) => r.id), id];
      const res = await fetch('/api/admin/prospects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'plan', date, ids }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.success === false) throw new Error(j.error || 'Eklenemedi');
      await load(date);
      setRouteMsg('Aday bugünün planına eklendi; sırayı "Bulunduğum yerden sırala" ile güncelleyebilirsiniz.');
    } catch (e) {
      setRouteMsg(e instanceof TypeError ? 'İnternet yok; aday eklenemedi.' : e instanceof Error ? e.message : 'Eklenemedi');
    } finally {
      setAdding(null);
    }
  };

  /** Kalan durakları telefonun konumundan, şimdiki saatten ve açılış saatlerinden başlayarak yeniden dizer. */
  const reorderFromHere = async () => {
    setRouteMsg('');
    const stops = remaining.filter((r) => r.lat != null && r.lon != null).map((r) => ({ ...r, lat: r.lat as number, lon: r.lon as number }));
    if (stops.length < 2) { setRouteMsg('Sıralanacak en az iki konumlu durak yok.'); return; }
    setLocating(true);
    try {
      const here = await currentPosition();
      const startMin = now?.min ?? new Date().getHours() * 60 + new Date().getMinutes();
      const plan = planDay(stops, date, startMin, here);
      const next: LocalOrder = {
        ids: plan.map((p) => p.stop.id),
        eta: Object.fromEntries(plan.map((p) => [p.stop.id, p.eta])),
        at: new Date().toISOString(),
      };
      setOrder(next);
      writeOrder(date, next);
      const late = plan.filter((p) => p.state === 'late' || p.state === 'closed').length;
      setRouteMsg(`Kalan ${plan.length} durak bulunduğunuz yerden yeniden sıralandı${late ? `; ${late} tanesi bugünkü açılış saatlerine sığmıyor (sonda)` : ''}.`);
    } catch (e) {
      setRouteMsg(e instanceof Error ? e.message : 'Konum alınamadı.');
    } finally {
      setLocating(false);
    }
  };
  const resetOrder = () => { setOrder(null); writeOrder(date, null); setRouteMsg('Planlanan sıraya dönüldü.'); };

  return (
    <main className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-black/[0.06]">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/admin" className="p-2 -ml-2 rounded-full hover:bg-black/[0.05]" aria-label="Panele dön">
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight">Saha listesi</h1>
            <p className="text-xs text-[#6E6E73]">{date ? fmtDay(date) : '…'}{rows ? ` · ${done}/${list.length} ziyaret` : ''}</p>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm border border-black/[0.12] rounded-lg px-2 py-1.5 bg-white"
            aria-label="Gün"
          />
          <NotificationBell />
          <button type="button" onClick={() => load(date)} className="p-2 rounded-full hover:bg-black/[0.05]" aria-label="Yenile">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
        {error && <p role="alert" className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error} {error.startsWith('Oturum') && <Link className="underline font-semibold" href="/admin/login">Giriş</Link>}</p>}
        {offlineAt && (
          <p role="status" className="p-3 rounded-xl bg-amber-50 text-amber-900 text-sm">
            İnternet yok: {new Date(offlineAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} itibarıyla kayıtlı liste gösteriliyor.
          </p>
        )}
        {queued > 0 && (
          <p role="status" className="p-3 rounded-xl bg-blue-50 text-blue-900 text-sm flex items-center justify-between gap-2">
            <span>{queued} ziyaret sonucu telefonda bekliyor; internet gelince gönderilecek.</span>
            <button type="button" onClick={() => void flush()} className="font-semibold underline shrink-0">Şimdi dene</button>
          </p>
        )}

        {isToday && hot.length > 0 && (
          <section aria-label="Sıcak adaylar" className="p-4 rounded-2xl bg-blue-600 text-white shadow-sm">
            <h2 className="text-sm font-bold">🔥 Demosunu açanlar — bugün uğrayın ya da arayın</h2>
            <ul className="mt-2 space-y-2">
              {hot.map((it) => {
                const planned = list.some((r) => r.id === it.id && r.visit_date === date);
                return (
                  <li key={it.id} className="flex items-center gap-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <Link href={prospectHref(it.id)} onClick={markFromField} className="font-semibold underline-offset-2 hover:underline truncate block">{it.name}</Link>
                      <span className="text-[11px] text-blue-100">{it.city}{it.count ? ` · ${it.count}× açıldı` : ''}{it.at ? ` · son ${new Date(it.at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}</span>
                    </div>
                    {it.phone && <a href={telHref(it.phone)} className="px-2.5 py-1.5 rounded-lg bg-white/15 text-xs font-semibold shrink-0">Ara</a>}
                    {planned
                      ? <span className="text-[11px] text-blue-100 shrink-0">Planda</span>
                      : <button type="button" onClick={() => void addToToday(it.id)} disabled={adding === it.id} className="px-2.5 py-1.5 rounded-lg bg-white text-blue-700 text-xs font-semibold shrink-0 disabled:opacity-60">{adding === it.id ? '…' : 'Bugüne ekle'}</button>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {isToday && today && (today.today_planned > 0 || today.total > 0) && (
          <section aria-label="Bugün" className="p-4 rounded-2xl bg-white shadow-sm">
            <h2 className="text-sm font-bold">Günaydın — bugün</h2>
            <p className="text-xs text-[#6E6E73] mt-0.5">
              {today.today_planned} planlı ziyaret{today.total ? ` · ${today.total} hatırlatma` : ''}
            </p>
            {today.items.length > 0 && (
              <ul className="mt-2 space-y-1">
                {today.items.slice(0, 5).map((it) => (
                  <li key={`${it.type}-${it.id}`} className="text-xs flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${it.type === 'hot_demo' ? 'bg-blue-100 text-blue-800' : it.type === 'missed_visit' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'}`}>
                      {REMINDER_TR[it.type] ?? it.type}
                    </span>
                    <Link href={prospectHref(it.id)} onClick={markFromField} className="font-semibold truncate hover:underline">{it.name}</Link>
                    <span className="text-[#6E6E73] shrink-0">{it.city}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {remainingRoute && (
          <a
            href={remainingRoute}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-[#0071E3] text-white font-semibold text-sm shadow-sm"
          >
            <Navigation className="w-4 h-4" aria-hidden="true" /> Kalan {remaining.length} durağı Google Maps&apos;te aç
          </a>
        )}

        {isToday && remaining.length > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void reorderFromHere()}
              disabled={locating}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-[#0071E3]/30 text-[#0071E3] font-semibold text-sm shadow-sm disabled:opacity-60"
            >
              {locating ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <LocateFixed className="w-4 h-4" aria-hidden="true" />}
              {locating ? 'Konum alınıyor…' : 'Bulunduğum yerden sırala'}
            </button>
            {order && (
              <button type="button" onClick={resetOrder} className="px-4 py-3 rounded-2xl bg-white border border-black/[0.08] text-sm font-medium text-[#515154] shadow-sm">
                Plana dön
              </button>
            )}
          </div>
        )}
        {routeMsg && <p role="status" className="text-xs text-[#515154] bg-white rounded-xl px-3 py-2">{routeMsg}</p>}

        {rows && list.length === 0 && !loading && (
          <div className="p-5 rounded-2xl bg-white text-sm text-[#515154] leading-relaxed">
            <MapPin className="w-6 h-6 mx-auto mb-2 text-[#0071E3]" aria-hidden="true" />
            {!suggestion ? (
              <div className="text-center">
                <p>Bu güne planlanmış ziyaret yok.</p>
                <button type="button" onClick={() => void fetchSuggestion()} disabled={suggesting} className="mt-3 px-4 py-2.5 rounded-xl bg-[#0071E3] text-white font-semibold disabled:opacity-60">
                  {suggesting ? 'Hazırlanıyor…' : 'Bu gün için plan öner'}
                </button>
                <p className="mt-2 text-[11px] text-[#6E6E73]">Yakın, puanı yüksek ve o gün açık adaylar; önce demosunu açanlar. Ya da panelde Harita&apos;dan rotayı kendiniz kurun.</p>
              </div>
            ) : suggestion.stops.length === 0 ? (
              <p className="text-center">Bu gün için uygun aday bulunamadı.</p>
            ) : (
              <div>
                <p className="font-semibold text-[#1D1D1F]">Öneri: {suggestion.city} · {suggestion.stops.length} durak</p>
                <ol className="mt-2 space-y-1 list-decimal pl-5 text-[13px]">
                  {suggestion.stops.map((s) => (
                    <li key={s.id}>
                      <Link href={prospectHref(s.id)} onClick={markFromField} className="hover:underline">{s.name}</Link>
                      <span className="text-[11px] text-[#6E6E73]"> · {s.kind === 'hot' ? 'demosunu açtı' : s.kind === 'no_site' ? 'sitesi yok' : `site puanı ${s.score}`}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => void approveSuggestion()} disabled={suggesting} className="flex-1 px-4 py-2.5 rounded-xl bg-[#0071E3] text-white font-semibold disabled:opacity-60">Bu planı onayla</button>
                  <button type="button" onClick={() => setSuggestion(null)} className="px-4 py-2.5 rounded-xl border border-black/[0.1] font-medium">Vazgeç</button>
                </div>
              </div>
            )}
          </div>
        )}

        {!rows && loading && (
          <div className="p-8 text-center text-[#6E6E73]"><Loader2 className="w-6 h-6 animate-spin mx-auto" aria-hidden="true" /></div>
        )}

        {list.map((r, i) => (
          <StopCard
            key={r.id}
            row={r}
            n={i + 1}
            date={date}
            day={day}
            nowMin={isToday && now ? now.min : null}
            eta={order && !doneToday(r) ? order.eta[r.id] : undefined}
            done={doneToday(r)}
            onSaved={() => load(date)}
            onQueued={() => setQueued(readQueue().length)}
          />
        ))}

        <p className="text-[11px] text-[#6E6E73] text-center leading-relaxed pt-2">
          Önerilen saatler sektöre göre tahmindir; açılış saatleri OpenStreetMap&apos;ten gelir ve eksik olabilir.
        </p>
      </div>
    </main>
  );
}

function StopCard({ row: r, n, date, day, nowMin, eta, done, onSaved, onQueued }: {
  /** Yeniden sıralamada hesaplanan tahmini varış (dakika); null = bugüne sığmıyor, undefined = sıralanmadı */
  eta?: number | null;
  row: FieldRow; n: number; date: string; day: number; nowMin: number | null; done: boolean; onSaved: () => void; onQueued: () => void;
}) {
  const [outcome, setOutcome] = useState('');
  const [note, setNote] = useState('');
  const [next, setNext] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(!done);
  // Görüşme olduysa kayıttan hemen sonra teşekkür mesajı önerilir (izinli, kendi telefonundan; soğuk mesaj değil)
  const [thanks, setThanks] = useState(false);

  const info = dayWindows({ ...r, lat: 0, lon: 0 }, day);
  const brief = briefOf(r);
  const isOpen = nowMin !== null ? openNow({ ...r, lat: 0, lon: 0 }, day, nowMin) : null;
  const postponed = r.visit_date !== date; // tekrar gel ile başka güne alınmış

  const choose = (o: string) => {
    setOutcome(o);
    setErr('');
    if (NEEDS_NEXT.has(o) && !next) setNext(plusDays(date, o === 'closed' ? 1 : 7));
  };

  const save = async () => {
    if (!outcome) return;
    if (NEEDS_NEXT.has(outcome) && !next) { setErr('Bir sonraki ziyaret tarihini seçin.'); return; }
    setSaving(true);
    setErr('');
    const body = { action: 'visit', id: r.id, outcome, note, ...(next && NEEDS_NEXT.has(outcome) ? { next } : {}), ...(outcome === 'not_interested' && reason ? { reason } : {}) };
    try {
      const res = await fetch('/api/admin/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.success === false) throw new Error(j.error || 'Kaydedilemedi');
      setOutcome(''); setNote(''); setNext(''); setReason(''); setOpen(false);
      if (['talked', 'demo_shown', 'offer_requested', 'won'].includes(outcome)) setThanks(true);
      onSaved();
    } catch (e) {
      if (e instanceof TypeError) {
        // Bağlantı yok: sonuç telefonda bekler, internet gelince gönderilir (veri kaybolmaz)
        enqueue({ id: r.id, name: r.name, body, at: new Date().toISOString() });
        setOutcome(''); setNote(''); setNext(''); setOpen(false);
        onQueued();
      } else setErr(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className={`rounded-2xl bg-white shadow-sm border ${done ? 'border-green-200' : info.state === 'closed' ? 'border-red-200' : 'border-transparent'}`}>
      <div className="p-4 flex gap-3">
        <span className={`w-8 h-8 shrink-0 rounded-full grid place-items-center text-sm font-bold text-white ${done ? 'bg-green-600' : info.state === 'closed' ? 'bg-red-500' : 'bg-[#0071E3]'}`}>
          {done ? <CheckCircle2 className="w-4 h-4" aria-label="Ziyaret edildi" /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-[15px] leading-snug"><Link href={prospectHref(r.id)} onClick={markFromField} className="hover:underline">{r.name}</Link></h2>
          <p className="text-xs text-[#6E6E73]">{CATEGORY_LABEL[r.category ?? ''] ?? r.category}{r.address ? ` · ${r.address}` : ''}</p>
          {eta !== undefined && (
            <p className={`mt-1 inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md ${eta === null ? 'bg-amber-100 text-amber-900' : 'bg-blue-50 text-[#0071E3]'}`}>
              {eta === null ? 'Bugünkü saatlere sığmıyor' : `Tahmini varış ~${fmtMin(eta)}`}
            </p>
          )}
          {!done && (brief.length > 0 || r.example) && (
            <details className="mt-2 group" open={n === 1}>
              <summary className="text-[11px] font-semibold text-[#0071E3] cursor-pointer select-none">30 sn özet — ne söyleyeyim?</summary>
              <ul className="mt-1 space-y-0.5 text-xs text-[#1D1D1F] list-disc pl-4">
                {brief.map((b, i) => <li key={i}>{b}</li>)}
                {r.example && (
                  <li>
                    Rakip/örnek göster:{' '}
                    <a href={r.example.url} target="_blank" rel="noopener noreferrer" className="text-[#0071E3] underline">{r.example.name}</a>
                    {r.example.suburb ? ` (${r.example.suburb}${r.example.km != null ? `, ${r.example.km} km` : ''})` : r.example.km != null ? ` (${r.example.km} km)` : ''}
                    {' '}— {r.example.sameTrade ? 'aynı meslekten' : 'aynı sektörden'}, sitesi iyi durumda.
                  </li>
                )}
              </ul>
            </details>
          )}

          <p className="mt-1.5 text-xs flex items-start gap-1.5">
            <Clock className="w-3.5 h-3.5 mt-px shrink-0 text-[#6E6E73]" aria-hidden="true" />
            <span>
              {info.open
                ? info.open.length ? <>Bugün {fmtRanges(info.open)}</> : <b className="text-red-600">Bu gün kapalı</b>
                : <span className="text-[#6E6E73]">{STATE_LABEL[info.state]}</span>}
              {isOpen !== null && info.open && info.open.length > 0 && (
                <b className={isOpen ? 'text-green-700' : 'text-red-600'}> · {isOpen ? 'şu an açık' : 'şu an kapalı'}</b>
              )}
              {info.state !== 'closed' && info.windows.length > 0 && (
                <span className="block text-[#6E6E73]">Uygun saat: <b className="text-[#1D1D1F]">{fmtRanges(info.windows.slice(0, 2))}</b></span>
              )}
            </span>
          </p>

          {r.last_visit && (
            <p className="mt-1.5 text-xs">
              <span className={`inline-block px-2 py-0.5 rounded-full text-white text-[11px] font-semibold ${OUTCOME_STYLE[r.last_visit.outcome] ?? 'bg-slate-500'}`}>
                {VISIT_OUTCOME_LABEL[r.last_visit.outcome] ?? r.last_visit.outcome}
              </span>
              <span className="text-[#6E6E73]"> · {fmtDay(localDayOf(r.last_visit.at))}{r.last_visit.next_at ? ` → tekrar ${fmtDay(r.last_visit.next_at)}` : ''}</span>
              {r.last_visit.note && <span className="block mt-1 text-[#1D1D1F]">“{r.last_visit.note}”</span>}
            </p>
          )}
          {r.demo_views && r.demo_last_view ? (
            <p className="mt-1.5 text-xs font-semibold text-emerald-700">
              Demo {r.demo_views}× açıldı · son {new Date(r.demo_last_view).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </p>
          ) : null}
          {postponed && r.visit_date &&<p className="mt-1 text-xs text-amber-700">Başka güne alındı: {fmtDay(r.visit_date)}</p>}
          {r.draft_token && r.draft_quality && <DraftChecklist quality={r.draft_quality} />}
        </div>
      </div>

      <div className={`px-4 pb-3 grid ${r.draft_token ? 'grid-cols-4' : 'grid-cols-3'} gap-2 text-xs font-semibold`}>
        <a href={navUrl(r)} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#F5F5F7]">
          <Navigation className="w-4 h-4 text-[#0071E3]" aria-hidden="true" /> Yol tarifi
        </a>
        {r.phone ? (
          <a href={telHref(r.phone)} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#F5F5F7]">
            <Phone className="w-4 h-4 text-[#0071E3]" aria-hidden="true" /> Ara
          </a>
        ) : <span className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#F5F5F7] text-[#6E6E73]"><Phone className="w-4 h-4" aria-hidden="true" /> Tel. yok</span>}
        {r.draft_token ? (
          <a href={`/demo/${r.draft_token}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#F5F5F7]">
            <PlayCircle className="w-4 h-4 text-[#0071E3]" aria-hidden="true" /> Demo
          </a>
        ) : <span className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#F5F5F7] text-[#6E6E73]"><ExternalLink className="w-4 h-4" aria-hidden="true" /> Demo yok</span>}
        {r.draft_token && <WhatsAppDemo compact id={r.id} name={r.name} phone={r.phone} token={r.draft_token} onLogged={onSaved} />}
      </div>

      {thanks && (
        <div className="mx-4 mb-3 p-3 rounded-xl bg-[#25D366]/10 flex items-center justify-between gap-2 text-xs">
          <span className="text-[#128C7E] font-medium">Görüşme kaydedildi. Numarasını verdiyse bir teşekkür mesajı bırakın.</span>
          <div className="flex items-center gap-2 shrink-0">
            <WhatsAppDemo id={r.id} name={r.name} phone={r.phone} token={r.draft_token} onLogged={onSaved} label={r.draft_token ? 'Teşekkür + demo' : 'Teşekkür et'} />
            <button type="button" onClick={() => setThanks(false)} aria-label="Kapat" className="text-[#6E6E73] px-1">✕</button>
          </div>
        </div>
      )}

      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="w-full py-3 border-t border-black/[0.06] text-xs font-semibold text-[#0071E3]">
          Yeni sonuç gir
        </button>
      ) : (
        <div className="px-4 pb-4 pt-3 border-t border-black/[0.06] space-y-2.5">
          <p className="text-xs font-semibold text-[#6E6E73]">Ziyaret sonucu</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(VISIT_OUTCOME_LABEL).filter(([k]) => k !== 'demo_sent').map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => choose(k)}
                aria-pressed={outcome === k}
                className={`py-3 rounded-xl text-sm font-semibold border transition-colors ${outcome === k ? `${OUTCOME_STYLE[k]} text-white border-transparent` : 'bg-white border-black/[0.12] text-[#1D1D1F]'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {outcome && (
            <>
              {outcome === 'not_interested' && (
                <fieldset className="text-sm">
                  <legend className="text-xs text-[#6E6E73] mb-1">Neden? (fiyatlama mı anlatım mı sorun, zamanla görülür)</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(LOSS_REASON_LABEL).filter(([k]) => k !== 'unknown').map(([k, label]) => (
                      <button key={k} type="button" onClick={() => setReason(reason === k ? '' : k)}
                        className={`px-2.5 py-1 rounded-full text-xs border ${reason === k ? 'bg-red-600 text-white border-red-600' : 'bg-white border-black/[0.12]'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              {NEEDS_NEXT.has(outcome) && (
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span>Tekrar ziyaret</span>
                  <input type="date" value={next} min={date} onChange={(e) => setNext(e.target.value)} className="border border-black/[0.12] rounded-lg px-2 py-1.5" />
                </label>
              )}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Not (ör. sahibi Perşembe öğleden önce burada, fiyat sordu)"
                className="w-full text-sm border border-black/[0.12] rounded-xl p-2.5"
              />
              <VoiceNote onText={(t) => setNote((cur) => (cur ? `${cur} ${t}` : t).slice(0, 2000))} />
              {err && <p role="alert" className="text-xs text-red-600">{err}</p>}
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="w-full py-3 rounded-xl bg-[#1D1D1F] text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Kaydet
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
}
