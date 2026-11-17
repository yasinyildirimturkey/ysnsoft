'use client';

/**
 * Müşteri adayları haritası + ziyaret rotası.
 *
 * Harita: OpenStreetMap (Leaflet) — ücretsiz, API anahtarı gerekmez. Google'ın gömülü haritası ücretli anahtar ister.
 * Rota: seçilen duraklar en yakın komşu sırasıyla dizilir ve tek tıkla Google Maps'te (telefonda uygulamada) açılır;
 * başlangıç noktası verilmez, Google Maps kullanıcının o anki konumundan başlatır.
 * Rota yalnızca bu tarayıcıda saklanır (localStorage); erişilemezse sayfa yine çalışır. Telefona QR kodu ya da
 * paylaşım/kopyalama ile Google Maps bağlantısı olarak aktarılır.
 */
import 'leaflet/dist/leaflet.css';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CircleMarker, LayerGroup, Map as LeafletMap } from 'leaflet';
import { CalendarCheck, Check, Clock, Copy, ExternalLink, MapPin, Navigation, Phone, Route, Share2, Smartphone, Trash2, X } from 'lucide-react';
import { QrCode } from './ProspectOffer';
import { DAY_NAMES, fmtMin, fmtRanges, isoDay, km, planDay, PREF_HINT, STATE_LABEL, weekdayOf, type SlotState, type Week } from '@/lib/visit-plan';

export interface MapProspect {
  id: number;
  name: string;
  address: string | null;
  city: string;
  phone: string | null;
  lat: number | null;
  lon: number | null;
  kind: string;
  score: number | null;
  status: string;
  draft_token: string | null;
  category?: string | null;
  week?: Week;
  appointment?: boolean;
}

interface Stop {
  id: number;
  name: string;
  address: string | null;
  city: string;
  phone: string | null;
  lat: number;
  lon: number;
  category?: string | null;
  week?: Week;
  appointment?: boolean;
}

const STATE_STYLE: Record<SlotState, string> = {
  ok: 'text-green-700',
  outside: 'text-amber-700',
  unknown: 'text-[#6E6E73]',
  appointment: 'text-amber-700',
  closed: 'text-red-600',
  late: 'text-red-600',
};

/** Önümüzdeki 7 gün: "Bugün", "Yarın", sonra gün adı + tarih */
function nextDays() {
  const out: { value: string; label: string }[] = [];
  const d = new Date();
  for (let i = 0; i < 7; i++) {
    const v = isoDay(d);
    const name = DAY_NAMES[weekdayOf(v)];
    out.push({ value: v, label: i === 0 ? `Bugün (${name})` : i === 1 ? `Yarın (${name})` : `${name} ${v.slice(8, 10)}.${v.slice(5, 7)}.` });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

const KIND_STYLE: Record<string, { color: string; label: string }> = {
  no_site: { color: '#dc2626', label: 'Sitesi yok' },
  redesign: { color: '#f59e0b', label: 'Yenileme adayı' },
  unscanned: { color: '#94a3b8', label: 'Taranmadı' },
  ok: { color: '#10b981', label: 'Sitesi iyi' },
  chain: { color: '#64748b', label: 'Zincir' },
};
const MAX_STOPS = 10; // Google Maps adresi: hedef + en çok 9 ara durak
const NEARBY_KM = 1;
const STORAGE_KEY = 'webscout-route-v1';

/** En yakın komşu sıralaması: ilk duraktan başlayıp her seferinde en yakın ziyaret edilmemiş durağa gider. */
function orderStops(stops: Stop[]): Stop[] {
  if (stops.length < 3) return stops;
  const rest = stops.slice(1);
  const out = [stops[0]];
  while (rest.length) {
    const last = out[out.length - 1];
    let best = 0;
    for (let i = 1; i < rest.length; i++) if (km(last, rest[i]) < km(last, rest[best])) best = i;
    out.push(rest.splice(best, 1)[0]);
  }
  return out;
}

const toStop = (r: MapProspect & { lat: number; lon: number }): Stop => ({
  id: r.id, name: r.name, address: r.address, city: r.city, phone: r.phone, lat: r.lat, lon: r.lon,
  category: r.category ?? null, week: r.week ?? null, appointment: Boolean(r.appointment),
});

/** Durak: adres varsa "Ad, adres"; yoksa koordinat (yalnızca ad + şehirle Google başka bir yeri bulabilir). */
const place = (s: Stop) => (s.address ? `${s.name}, ${s.address}` : `${s.lat.toFixed(6)},${s.lon.toFixed(6)}`);

/** Google Maps yol tarifi adresi (anahtarsız, resmi "Maps URLs" biçimi). */
function googleRouteUrl(stops: Stop[]) {
  const p = new URLSearchParams({ api: '1', travelmode: 'driving', destination: place(stops[stops.length - 1]) });
  if (stops.length > 1) p.set('waypoints', stops.slice(0, -1).map(place).join('|'));
  return `https://www.google.com/maps/dir/?${p.toString()}`;
}

function loadStops(): Stop[] {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((s) => Number.isFinite(s?.lat) && Number.isFinite(s?.lon)).slice(0, MAX_STOPS) : [];
  } catch {
    return [];
  }
}

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export default function ProspectMap({ rows, onOpen }: { rows: MapProspect[]; onOpen: (id: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const markers = useRef(new Map<number, CircleMarker>());
  const [ready, setReady] = useState(false);
  const [stops, setStops] = useState<Stop[]>([]);
  const [notice, setNotice] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const days = useMemo(() => nextDays(), []);
  const [day, setDay] = useState(days[0].value);
  const [start, setStart] = useState('09:00');
  const [smart, setSmart] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedDay, setSavedDay] = useState('');
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  // Bilgisayarda hazırlanan rota telefona: paylaşım menüsü (WhatsApp vb.) ya da panoya kopyalama
  const shareRoute = async (url: string) => {
    if (canShare) {
      try { await navigator.share({ title: 'Ziyaret rotası', url }); return; } catch (e) {
        if ((e as Error)?.name === 'AbortError') return; // kullanıcı vazgeçti
      }
    }
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch {
      // Pano izni yoksa (gömülü tarayıcı, eski Safari) seçip kopyalama yedeği
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
    }
    if (ok) {
      setNotice('');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else setNotice('Bağlantı kopyalanamadı; QR kodunu kullanın.');
  };

  const located = useMemo(
    () => rows.filter((r): r is MapProspect & { lat: number; lon: number } => Number.isFinite(r.lat) && Number.isFinite(r.lon)),
    [rows],
  );

  // Kayıtlı rota (yalnızca istemcide)
  // Yükleme bitmeden yazılmaz: yoksa ilk (boş) durum kayıtlı rotanın üzerine yazılır ve rota her açılışta silinir
  const loaded = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => { setStops(loadStops()); loaded.current = true; }, 0);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stops)); } catch { /* gizli pencere vb. */ }
  }, [stops]);

  const stopIds = useMemo(() => new Set(stops.map((s) => s.id)), [stops]);

  // Kayıtlı rotadaki duraklar eski olabilir: güncel saat/sektör bilgisi haritadaki satırdan alınır
  const fresh = useMemo(() => {
    const by = new Map(located.map((r) => [r.id, r]));
    return stops.map((s) => { const r = by.get(s.id); return r ? { ...s, ...toStop(r) } : s; });
  }, [stops, located]);

  const startMin = useMemo(() => {
    const [h, m] = start.split(':').map(Number);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : 540;
  }, [start]);

  // Saatlere göre plan; kapalı duraklar sona düşer ve Google rotasına girmez
  const plan = useMemo(() => (smart
    ? planDay(fresh, day, startMin)
    : fresh.map((s) => ({ stop: s, eta: null as number | null, windows: [] as number[][], state: 'ok' as SlotState }))), [smart, fresh, day, startMin]);
  const routeStops = useMemo(() => plan.filter((p) => p.state !== 'closed').map((p) => p.stop), [plan]);
  const closedCount = plan.length - routeStops.length;

  /** Rotayı o güne ziyaret planı olarak kaydeder: telefondaki saha sayfası bu listeyi açar. */
  const savePlan = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'plan', date: day, ids: routeStops.map((s) => s.id) }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.success === false) throw new Error(j.error || 'Kaydedilemedi');
      setSavedDay(day);
      setNotice(`${routeStops.length} durak ${days.find((d) => d.value === day)?.label ?? day} için kaydedildi.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const toggleStop = useCallback((r: MapProspect & { lat: number; lon: number }) => {
    if (stops.some((x) => x.id === r.id)) {
      setStops(stops.filter((x) => x.id !== r.id));
      return;
    }
    if (stops.length >= MAX_STOPS) {
      setNotice(`Bir rotada en çok ${MAX_STOPS} durak olabilir.`);
      return;
    }
    setNotice('');
    setStops(orderStops([...stops, toStop(r)]));
  }, [stops]);

  /** Tıklanan adayı ve 1 km içindeki teklif verilebilir adayları (yakından uzağa) rotaya ekler. */
  const addNearby = useCallback((center: MapProspect & { lat: number; lon: number }) => {
    const have = new Set(stops.map((x) => x.id));
    const near = located
      .filter((r) => !have.has(r.id) && (r.id === center.id || ((r.kind === 'no_site' || r.kind === 'redesign') && km(center, r) <= NEARBY_KM)))
      .sort((a, b) => km(center, a) - km(center, b));
    const added = near.slice(0, Math.max(0, MAX_STOPS - stops.length)).map(toStop);
    const others = near.filter((r) => r.id !== center.id).length;
    setNotice(others
      ? `${added.length} durak eklendi${near.length > added.length ? ` (${near.length - added.length} tanesi sığmadı)` : ''}.`
      : `${NEARBY_KM} km içinde teklif verilebilir başka aday yok.`);
    setStops(orderStops([...stops, ...added]));
  }, [stops, located]);

  // Açılır pencere düğmeleri her zaman güncel durumu görsün (noktaları yeniden çizmeden)
  const stopIdsRef = useRef(stopIds);
  const toggleRef = useRef(toggleStop);
  const nearbyRef = useRef(addNearby);
  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    stopIdsRef.current = stopIds;
    toggleRef.current = toggleStop;
    nearbyRef.current = addNearby;
    onOpenRef.current = onOpen;
  });

  // Haritayı bir kez kur
  useEffect(() => {
    let alive = true;
    (async () => {
      const L = (await import('leaflet')).default;
      if (!alive || !box.current || map.current) return;
      const m = L.map(box.current, { preferCanvas: true, zoomControl: true }).setView([51.43, 6.76], 11);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      map.current = m;
      layer.current = L.layerGroup().addTo(m);
      setReady(true);
    })();
    return () => {
      alive = false;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Noktalar: süzgeç değişince yeniden çizilir
  useEffect(() => {
    if (!ready || !map.current || !layer.current) return;
    let alive = true;
    (async () => {
      const L = (await import('leaflet')).default;
      if (!alive || !layer.current || !map.current) return;
      layer.current.clearLayers();
      markers.current.clear();
      // Çizim sırası: önemliler üstte kalsın (taslak hazır > yenileme > sitesi yok > diğerleri)
      const rank = (r: MapProspect) => (r.draft_token ? 3 : r.kind === 'redesign' ? 2 : r.kind === 'no_site' ? 1 : 0);
      for (const r of [...located].sort((a, b) => rank(a) - rank(b))) {
        const st = KIND_STYLE[r.kind] ?? KIND_STYLE.unscanned;
        const mk = L.circleMarker([r.lat, r.lon], {
          radius: r.draft_token ? 8 : 6.5,
          color: r.draft_token ? '#1d4ed8' : '#ffffff',
          weight: r.draft_token ? 3 : 1.5,
          fillColor: st.color,
          fillOpacity: 0.92,
        });
        mk.bindTooltip(esc(r.name), { direction: 'top', offset: [0, -6] });
        mk.bindPopup(() => {
          const el = document.createElement('div');
          el.style.minWidth = '210px';
          el.innerHTML = `
            <div style="font-weight:700;font-size:14px;line-height:1.3">${esc(r.name)}</div>
            <div style="margin-top:3px;font-size:12px;color:#555">${esc(st.label)}${r.score !== null ? ` · puan ${r.score}` : ''}${r.draft_token ? ' · taslak hazır' : ''}</div>
            <div style="margin-top:6px;font-size:12px">${esc(r.address || r.city)}</div>
            ${r.phone ? `<div style="font-size:12px"><a href="tel:${esc(r.phone.replace(/[^+\d]/g, ''))}">${esc(r.phone)}</a></div>` : ''}
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">
              <button data-act="route" style="padding:5px 9px;border-radius:7px;border:0;background:#0071e3;color:#fff;font-weight:600;font-size:12px;cursor:pointer"></button>
              <button data-act="near" style="padding:5px 9px;border-radius:7px;border:1px solid #ccc;background:#fff;font-weight:600;font-size:12px;cursor:pointer">Çevresindekiler (${NEARBY_KM} km)</button>
              <button data-act="open" style="padding:5px 9px;border-radius:7px;border:1px solid #ccc;background:#fff;font-weight:600;font-size:12px;cursor:pointer">Detay</button>
            </div>`;
          const routeBtn = el.querySelector<HTMLButtonElement>('[data-act="route"]')!;
          routeBtn.textContent = stopIdsRef.current.has(r.id) ? 'Rotadan çıkar' : 'Rotaya ekle';
          routeBtn.onclick = () => { toggleRef.current(r); mk.closePopup(); };
          el.querySelector<HTMLButtonElement>('[data-act="near"]')!.onclick = () => { nearbyRef.current(r); mk.closePopup(); };
          el.querySelector<HTMLButtonElement>('[data-act="open"]')!.onclick = () => { onOpenRef.current(r.id); mk.closePopup(); };
          return el;
        });
        mk.addTo(layer.current);
        markers.current.set(r.id, mk);
      }
      if (located.length) map.current.fitBounds(L.latLngBounds(located.map((r) => [r.lat, r.lon] as [number, number])), { padding: [30, 30], maxZoom: 15 });
    })();
    return () => { alive = false; };
  }, [ready, located]);

  // Rota durakları: numaralı işaret ve aralarında çizgi
  const routeLayer = useRef<LayerGroup | null>(null);
  useEffect(() => {
    if (!ready || !map.current) return;
    let alive = true;
    (async () => {
      const L = (await import('leaflet')).default;
      if (!alive || !map.current) return;
      routeLayer.current?.remove();
      const g = L.layerGroup();
      if (routeStops.length > 1) L.polyline(routeStops.map((s) => [s.lat, s.lon] as [number, number]), { color: '#0071e3', weight: 3, opacity: 0.7, dashArray: '6 6' }).addTo(g);
      routeStops.forEach((s, i) => {
        L.marker([s.lat, s.lon], {
          icon: L.divIcon({
            className: '',
            html: `<div style="width:24px;height:24px;border-radius:50%;background:#0071e3;color:#fff;font:700 12px/24px system-ui;text-align:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)">${i + 1}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
          zIndexOffset: 1000,
          interactive: false,
        }).addTo(g);
      });
      g.addTo(map.current);
      routeLayer.current = g;
    })();
    return () => { alive = false; };
  }, [ready, routeStops]);

  const total = routeStops.slice(1).reduce((sum, s, i) => sum + km(routeStops[i], s), 0);
  const fieldUrl = typeof window !== 'undefined' && savedDay ? `${window.location.origin}/admin/saha?date=${savedDay}` : '';
  const missing = rows.length - located.length;

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-0 lg:divide-x divide-black/[0.06]">
      <div className="relative">
        <div ref={box} className="h-[460px] lg:h-[620px] w-full bg-[#eef1f4]" role="region" aria-label="Adaylar haritası" />
        <div className="absolute left-3 bottom-3 z-[500] bg-white/95 rounded-lg shadow px-2.5 py-2 text-[11px] text-[#1D1D1F] space-y-1 pointer-events-none">
          {(['no_site', 'redesign', 'unscanned', 'ok'] as const).map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border border-white shadow-sm" style={{ background: KIND_STYLE[k].color }} />
              {KIND_STYLE[k].label}
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-[#1d4ed8]" /> Taslak hazır
          </div>
        </div>
      </div>

      <aside className="p-4 flex flex-col gap-3 text-xs" aria-label="Ziyaret rotası">
        <div className="flex items-center justify-between gap-2">
          <strong className="text-sm text-[#1D1D1F] flex items-center gap-1.5">
            <Route className="w-4 h-4" aria-hidden="true" /> Ziyaret rotası ({stops.length}/{MAX_STOPS})
          </strong>
          {stops.length > 0 && (
            <button type="button" onClick={() => { setStops([]); setNotice(''); }} className="text-[#6E6E73] hover:text-red-600 flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Temizle
            </button>
          )}
        </div>
        <p className="text-[#6E6E73] leading-relaxed">
          Haritada bir noktaya tıklayıp <b>Rotaya ekle</b> ya da <b>Çevresindekiler</b> ile aynı bölgedeki adayları toplayın.
        </p>
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <label className="flex flex-col gap-1 text-[#6E6E73]">
            Ziyaret günü
            <select value={day} onChange={(e) => { setDay(e.target.value); setSavedDay(''); }} className="apple-input py-1.5 text-xs text-[#1D1D1F]">
              {days.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[#6E6E73]">
            Başlangıç
            <input type="time" value={start} step={900} onChange={(e) => setStart(e.target.value)} className="apple-input py-1.5 text-xs text-[#1D1D1F] w-[92px]" />
          </label>
        </div>
        <label className="flex items-start gap-2 text-[#1D1D1F] cursor-pointer">
          <input type="checkbox" checked={smart} onChange={(e) => setSmart(e.target.checked)} className="mt-0.5" />
          <span>Açılış saatlerine göre sırala <span className="text-[#6E6E73]">— kapalı olanı atlar, işletmeye uygun saati önerir</span></span>
        </label>
        {notice && <p role="status" className="text-[#0071E3] font-medium">{notice}</p>}

        {stops.length > 0 ? (
          <ol className="space-y-1.5">
            {plan.map(({ stop: s, eta, windows, state }) => {
              const n = routeStops.indexOf(s) + 1;
              return (
              <li key={s.id} className={`flex items-start gap-2 p-2 rounded-lg ${state === 'closed' ? 'bg-red-50' : 'bg-[#F5F5F7]'}`}>
                <span className={`w-5 h-5 shrink-0 rounded-full text-white grid place-items-center text-[10px] font-bold ${n ? 'bg-[#0071E3]' : 'bg-red-500'}`}>{n || '–'}</span>
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => onOpen(s.id)} className="font-semibold text-[#1D1D1F] text-left hover:underline block truncate max-w-full">{s.name}</button>
                  <span className="text-[#6E6E73] block truncate">{s.address || s.city}</span>
                  {smart && (
                    <span className={`flex items-start gap-1 ${STATE_STYLE[state]}`} title={PREF_HINT[s.category ?? ''] ?? ''}>
                      <Clock className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
                      <span>
                        {eta !== null && <b>≈ {fmtMin(eta)} · </b>}
                        {STATE_LABEL[state]}{windows.length > 0 && state !== 'late' ? ` (${fmtRanges(windows.slice(0, 2))})` : ''}
                      </span>
                    </span>
                  )}
                  {s.phone && (
                    <a href={`tel:${s.phone.replace(/[^+\d]/g, '')}`} className="text-[#0071E3] inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" aria-hidden="true" />{s.phone}
                    </a>
                  )}
                </div>
                <button type="button" onClick={() => setStops((x) => x.filter((y) => y.id !== s.id))} aria-label={`${s.name}: rotadan çıkar`} className="text-[#6E6E73] hover:text-red-600 p-0.5">
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </li>
              );
            })}
          </ol>
        ) : (
          <div className="p-3 rounded-lg border border-dashed border-black/[0.12] text-[#6E6E73] flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" /> Henüz durak yok.
          </div>
        )}

        {routeStops.length > 0 && (
          <>
            {closedCount > 0 && <p className="text-red-600">{closedCount} durak o gün kapalı; Google rotasına eklenmedi.</p>}
            {routeStops.length > 1 && <p className="text-[#6E6E73]">Duraklar arası ≈ {total.toFixed(1).replace('.', ',')} km (kuş uçuşu)</p>}
            <button
              type="button"
              onClick={savePlan}
              disabled={saving}
              className="px-4 py-2.5 rounded-full bg-[#1D1D1F] text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <CalendarCheck className="w-3.5 h-3.5" aria-hidden="true" /> {saving ? 'Kaydediliyor…' : 'Bu güne ziyaret planı olarak kaydet'}
            </button>
            {fieldUrl && (
              <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-[#F5F5F7]">
                <QrCode value={fieldUrl} size={176} label="Saha listesini telefonda açmak için QR kodu" />
                <p className="text-[#6E6E73] text-center leading-relaxed">
                  Telefonda okutun: <b>Saha listesi</b> açılır; her durakta sonucu tek dokunuşla girersiniz.
                </p>
                <a href={fieldUrl} target="_blank" rel="noopener noreferrer" className="text-[#0071E3] font-semibold">Saha listesini aç</a>
              </div>
            )}
            <a
              href={googleRouteUrl(routeStops)}
              target="_blank"
              rel="noopener noreferrer"
              className="apple-pill-btn px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Navigation className="w-3.5 h-3.5" aria-hidden="true" /> Google Maps&apos;te rotayı aç
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
            <p className="text-[#6E6E73] leading-relaxed">Rota bulunduğunuz konumdan başlar; telefonda Google Maps uygulamasında açılır.</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowQr((v) => !v)}
                aria-expanded={showQr}
                className="px-3 py-2 rounded-full border border-black/[0.12] font-semibold text-[#1D1D1F] hover:bg-[#F5F5F7] flex items-center justify-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5" aria-hidden="true" /> Telefona aktar
              </button>
              <button
                type="button"
                onClick={() => shareRoute(googleRouteUrl(routeStops))}
                className="px-3 py-2 rounded-full border border-black/[0.12] font-semibold text-[#1D1D1F] hover:bg-[#F5F5F7] flex items-center justify-center gap-1.5"
              >
                {copied
                  ? <><Check className="w-3.5 h-3.5 text-green-600" aria-hidden="true" /> Kopyalandı</>
                  : canShare
                    ? <><Share2 className="w-3.5 h-3.5" aria-hidden="true" /> Paylaş</>
                    : <><Copy className="w-3.5 h-3.5" aria-hidden="true" /> Bağlantıyı kopyala</>}
              </button>
            </div>
            {showQr && (
              <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-[#F5F5F7]">
                <QrCode value={googleRouteUrl(routeStops)} size={232} level="L" label="Rotayı telefonda açmak için QR kodu" />
                <p className="text-[#6E6E73] text-center leading-relaxed">Telefonun kamerasıyla okutun; rota Google Maps&apos;te açılır.</p>
              </div>
            )}
          </>
        )}

        {missing > 0 && <p className="text-[#6E6E73] mt-auto">{missing} adayın konumu bilinmediği için haritada yok.</p>}
      </aside>
    </div>
  );
}
