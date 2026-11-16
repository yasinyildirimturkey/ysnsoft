'use client';

/**
 * Müşteri adayları haritası + ziyaret rotası.
 *
 * Harita: OpenStreetMap (Leaflet) — ücretsiz, API anahtarı gerekmez. Google'ın gömülü haritası ücretli anahtar ister.
 * Rota: seçilen duraklar en yakın komşu sırasıyla dizilir ve tek tıkla Google Maps'te (telefonda uygulamada) açılır;
 * başlangıç noktası verilmez, Google Maps kullanıcının o anki konumundan başlatır.
 * Rota yalnızca bu tarayıcıda saklanır (localStorage); erişilemezse sayfa yine çalışır.
 */
import 'leaflet/dist/leaflet.css';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CircleMarker, LayerGroup, Map as LeafletMap } from 'leaflet';
import { ExternalLink, MapPin, Navigation, Phone, Route, Trash2, X } from 'lucide-react';

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
}

interface Stop {
  id: number;
  name: string;
  address: string | null;
  city: string;
  phone: string | null;
  lat: number;
  lon: number;
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

/** İki nokta arası kuş uçuşu mesafe (km). */
function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

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

const toStop = (r: MapProspect & { lat: number; lon: number }): Stop => ({ id: r.id, name: r.name, address: r.address, city: r.city, phone: r.phone, lat: r.lat, lon: r.lon });

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

  const located = useMemo(
    () => rows.filter((r): r is MapProspect & { lat: number; lon: number } => Number.isFinite(r.lat) && Number.isFinite(r.lon)),
    [rows],
  );

  // Kayıtlı rota (yalnızca istemcide)
  useEffect(() => {
    const t = setTimeout(() => setStops(loadStops()), 0);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stops)); } catch { /* gizli pencere vb. */ }
  }, [stops]);

  const stopIds = useMemo(() => new Set(stops.map((s) => s.id)), [stops]);

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
      if (stops.length > 1) L.polyline(stops.map((s) => [s.lat, s.lon] as [number, number]), { color: '#0071e3', weight: 3, opacity: 0.7, dashArray: '6 6' }).addTo(g);
      stops.forEach((s, i) => {
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
  }, [ready, stops]);

  const total = stops.slice(1).reduce((sum, s, i) => sum + km(stops[i], s), 0);
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
          Sıra, en kısa yol olacak şekilde otomatik dizilir.
        </p>
        {notice && <p role="status" className="text-[#0071E3] font-medium">{notice}</p>}

        {stops.length > 0 ? (
          <ol className="space-y-1.5">
            {stops.map((s, i) => (
              <li key={s.id} className="flex items-start gap-2 p-2 rounded-lg bg-[#F5F5F7]">
                <span className="w-5 h-5 shrink-0 rounded-full bg-[#0071E3] text-white grid place-items-center text-[10px] font-bold">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => onOpen(s.id)} className="font-semibold text-[#1D1D1F] text-left hover:underline block truncate max-w-full">{s.name}</button>
                  <span className="text-[#6E6E73] block truncate">{s.address || s.city}</span>
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
            ))}
          </ol>
        ) : (
          <div className="p-3 rounded-lg border border-dashed border-black/[0.12] text-[#6E6E73] flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" /> Henüz durak yok.
          </div>
        )}

        {stops.length > 0 && (
          <>
            {stops.length > 1 && <p className="text-[#6E6E73]">Duraklar arası ≈ {total.toFixed(1).replace('.', ',')} km (kuş uçuşu)</p>}
            <a
              href={googleRouteUrl(stops)}
              target="_blank"
              rel="noopener noreferrer"
              className="apple-pill-btn px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Navigation className="w-3.5 h-3.5" aria-hidden="true" /> Google Maps&apos;te rotayı aç
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
            <p className="text-[#6E6E73] leading-relaxed">Rota bulunduğunuz konumdan başlar; telefonda Google Maps uygulamasında açılır.</p>
          </>
        )}

        {missing > 0 && <p className="text-[#6E6E73] mt-auto">{missing} adayın konumu bilinmediği için haritada yok.</p>}
      </aside>
    </div>
  );
}
