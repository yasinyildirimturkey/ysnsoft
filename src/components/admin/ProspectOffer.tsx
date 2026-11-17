'use client';

/**
 * Müşteri adayı için yazdırılabilir Almanca teklif sayfası (A4, tek sayfa).
 *
 * Yüz yüze ziyarette elden verilmek içindir; e-postayla gönderilmez (UWG §7).
 * Bulgular müşteriye "geprüft werden sollte" (kontrol edilmeli) diliyle sunulur, hukuki iddia içermez.
 * Gönderen marka (.de markası) bilgileri bu tarayıcıda saklanır; ysnsoft adı sayfada geçmez.
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import qrcode from 'qrcode-generator';

export interface OfferProspect {
  name: string;
  city: string;
  address: string | null;
  website: string | null;
  kind: string;
  scanned_at: string | null;
  /** `verified`: Seviye 2 doğrulaması. 'refuted' (yanlış alarm) bulgular teklife yazılmaz. */
  findings: { code: string; de: string; verified?: string }[];
  /** Seviye 3 şablon taslağı varsa gizli demo adresinin belirteci: teklife QR kod olarak basılır. */
  draft_token?: string | null;
}

/** QR kodu tek bir SVG yolu olarak çizer (yazıcıda keskin çıkar; dış istek ya da görsel dosyası yok). */
export function QrCode({ value, size, label = 'QR-Code zum Entwurf', level = 'M' }: { value: string; size: number; label?: string; level?: 'L' | 'M' }) {
  const qr = qrcode(0, level);
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  // 4 modüllük boş çerçeve: tarayıcıların kodu tanıması için gerekli
  return (
    <svg viewBox={`-4 -4 ${n + 8} ${n + 8}`} width={size} height={size} shapeRendering="crispEdges" role="img" aria-label={label}>
      <rect x={-4} y={-4} width={n + 8} height={n + 8} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}

interface Sender {
  brand: string;
  contact: string;
  phone: string;
  web: string;
  address: string;
  priceNote: string;
}

const EMPTY_SENDER: Sender = { brand: '', contact: '', phone: '', web: '', address: '', priceNote: '' };
const STORAGE_KEY = 'ysn_prospect_offer_sender';

// Müşteriye gösterilen metinler: tarama kodu → temkinli Almanca ifade
const FINDING_TEXT: Record<string, string> = {
  no_https: 'Die Seite wird ohne HTTPS-Verschlüsselung ausgeliefert – Browser kennzeichnen sie dann als „Nicht sicher“.',
  no_viewport: 'Die Darstellung ist nicht für Smartphones optimiert.',
  no_impressum: 'Auf der Startseite konnten wir keinen Link zum Impressum finden – das sollte geprüft werden.',
  no_datenschutz: 'Auf der Startseite konnten wir keinen Link zur Datenschutzerklärung finden – das sollte geprüft werden.',
  google_fonts_extern: 'Schriftarten werden von Google-Servern nachgeladen – die datenschutzgerechte Einbindung sollte geprüft werden.',
  tracking_ohne_consent: 'Es werden Analyse- bzw. Tracking-Dienste geladen, ohne dass wir eine Cookie-Einwilligung erkennen konnten – das sollte geprüft werden.',
  table_layout: 'Die Seite ist in einer veralteten technischen Bauweise (Tabellen-Layout) erstellt.',
  legacy_markup: 'Die Seite verwendet veraltete Technik, die moderne Browser nur noch eingeschränkt unterstützen.',
  old_copyright: 'Der Copyright-Hinweis nennt ein älteres Jahr – die Seite wirkt dadurch nicht mehr aktuell.',
  old_jquery: 'Es wird eine sehr alte Version einer JavaScript-Bibliothek eingesetzt, für die es keine Updates mehr gibt.',
  slow: 'Die Seite lädt spürbar langsam.',
  no_meta_description: 'Es fehlt eine Seitenbeschreibung für Suchmaschinen wie Google.',
  cert_invalid: 'Das Sicherheitszertifikat der Seite ist ungültig oder abgelaufen – Besucher sehen eine Warnmeldung.',
  http_error: 'Die Seite liefert beim Aufruf eine Fehlermeldung.',
  unreachable: 'Die Seite war bei unserem Aufruf nicht erreichbar.',
};

const OFFER_POINTS = [
  'Moderne Website, die auf Smartphone, Tablet und PC gut aussieht',
  'Sichere Verbindung (HTTPS) und schnelle Ladezeiten',
  'Seiten für Impressum und Datenschutzerklärung sowie eine saubere Cookie-Lösung – die Inhalte stimmen Sie mit Ihrer Rechtsberatung ab',
  'Bessere Auffindbarkeit bei Google: Leistungen, Öffnungszeiten, Telefon und Anfahrt auf einen Blick',
  'Auf Wunsch laufende Pflege und Aktualisierung – ein fester Ansprechpartner vor Ort',
];

const inputCls =
  'w-full px-3 py-2 text-xs bg-[#F5F5F7] rounded-xl border border-black/[0.08] text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]';

function hostOf(url: string | null): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function loadSender(): Sender {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY_SENDER, ...JSON.parse(raw) } : EMPTY_SENDER;
  } catch {
    return EMPTY_SENDER;
  }
}

export default function ProspectOffer({ prospect, onClose }: { prospect: OfferProspect; onClose: () => void }) {
  const [sender, setSender] = useState<Sender>(EMPTY_SENDER);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSender(loadSender());
      setMounted(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const update = (key: keyof Sender, value: string) => {
    setSender((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // depolama kapalıysa yalnızca bu oturumda geçerli olur
      }
      return next;
    });
  };

  if (!mounted) return null;

  const host = hostOf(prospect.website);
  const codes = prospect.findings.map((f) => f.code);
  const isPlaceholder = codes.includes('placeholder');
  const isSocialOnly = codes.includes('social_only');
  const isRedesign = prospect.kind === 'redesign';
  const demoUrl = prospect.draft_token ? `${window.location.origin}/demo/${prospect.draft_token}` : null;
  const localOrigin = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  const points = isRedesign
    ? prospect.findings.filter((f) => f.verified !== 'refuted').map((f) => FINDING_TEXT[f.code] ?? `${f.de} – das sollte geprüft werden.`).slice(0, 7)
    : [];
  const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  const checkedOn = prospect.scanned_at
    ? new Date(prospect.scanned_at.replace(' ', 'T') + 'Z').toLocaleDateString('de-DE')
    : null;
  const ready = sender.brand.trim() !== '' && sender.phone.trim() !== '';
  const brand = sender.brand.trim() || '[Markenname]';

  const fields: { key: keyof Sender; label: string; placeholder: string }[] = [
    { key: 'brand', label: 'Marka adı (zorunlu)', placeholder: '.de markanız' },
    { key: 'contact', label: 'Görüşen kişi', placeholder: 'Ad Soyad' },
    { key: 'phone', label: 'Telefon (zorunlu)', placeholder: '+49 …' },
    { key: 'web', label: 'Web / e-posta', placeholder: 'marka.de' },
    { key: 'address', label: 'Firma adresi (Almanya’da iş yazışmasında gerekir)', placeholder: 'Straße Nr., PLZ Ort' },
    { key: 'priceNote', label: 'Fiyat notu (Almanca, isteğe bağlı)', placeholder: 'z. B. Website-Paket ab … € einmalig' },
  ];

  return createPortal(
    <div className="prospect-offer-root fixed inset-0 z-[80] overflow-y-auto bg-black/60 backdrop-blur-sm p-4 print:static print:p-0 print:bg-white print:overflow-visible">
      {/* Yazdırırken yalnızca teklif sayfası çıksın */}
      <style>{`@media print {
        body > *:not(.prospect-offer-root) { display: none !important; }
        @page { size: A4; margin: 16mm; }
      }`}</style>

      <div className="mx-auto max-w-3xl my-6 print:my-0 print:max-w-none">
        {/* Ayarlar — yazdırılmaz */}
        <div role="dialog" aria-modal="true" aria-label="Teklif sayfası ayarları" className="bg-white rounded-3xl p-5 sm:p-6 mb-4 border border-black/[0.1] shadow-2xl print:hidden">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h4 className="text-base font-bold text-[#1D1D1F]">Almanca teklif sayfası</h4>
              <p className="text-xs text-[#6E6E73] mt-0.5 max-w-xl leading-relaxed">
                Ziyarette elden verilir; e-postayla gönderilmez. Gönderen bilgileri bu tarayıcıda saklanır ve sonraki tekliflerde hazır gelir.
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Kapat" className="admin-close">✕</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.key} className={f.key === 'address' || f.key === 'priceNote' ? 'sm:col-span-2' : ''}>
                <label htmlFor={`offer-${f.key}`} className="block text-[11px] font-semibold text-[#6E6E73] mb-1.5">{f.label}</label>
                <input id={`offer-${f.key}`} value={sender[f.key]} onChange={(e) => update(f.key, e.target.value)} placeholder={f.placeholder} className={inputCls} />
              </div>
            ))}
          </div>
          <p className={`mt-3 text-[11px] leading-relaxed ${demoUrl && localOrigin ? 'text-red-700' : 'text-[#6E6E73]'}`}>
            {!demoUrl
              ? 'Bu aday için şablon taslağı yok: Detay penceresinden “Taslak oluştur” derseniz teklife taslağın QR kodu da basılır.'
              : localOrigin
                ? 'Dikkat: paneli yerel bilgisayardan açtınız; QR kod localhost adresini gösterir ve müşterinin telefonunda açılmaz. Teklifi canlı panelden yazdırın.'
                : 'Teklife şablon taslağının QR kodu basılır; müşteri kendi telefonunda örnek sitesini görür.'}
          </p>
          <div className="mt-4 pt-4 border-t border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[11px] text-[#6E6E73]">
              {ready ? 'Aşağıdaki önizleme A4 tek sayfa olarak yazdırılır.' : 'Yazdırmak için marka adı ve telefon girin.'}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="apple-pill-btn-secondary px-4 py-2 text-xs font-semibold">Kapat</button>
              <button
                type="button"
                disabled={!ready}
                onClick={() => window.print()}
                className="apple-pill-btn px-5 py-2 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Yazdır / PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Teklif sayfası (Almanca) */}
        <article lang="de" className="bg-white text-[#1D1D1F] rounded-3xl p-8 sm:p-12 border border-black/[0.1] shadow-2xl print:shadow-none print:border-0 print:rounded-none print:p-0 text-[13px] leading-relaxed">
          <header className="flex items-start justify-between gap-6 pb-5 border-b-2 border-[#1D1D1F]">
            <div>
              <div className="text-xl font-bold tracking-tight">{brand}</div>
              <div className="text-xs text-[#515154] mt-0.5">Websites für Betriebe in {prospect.city} und Umgebung</div>
            </div>
            <div className="text-right text-xs text-[#515154] shrink-0">
              {sender.contact && <div className="font-semibold text-[#1D1D1F]">{sender.contact}</div>}
              {sender.phone && <div>{sender.phone}</div>}
              {sender.web && <div>{sender.web}</div>}
            </div>
          </header>

          <div className="flex items-start justify-between gap-6 mt-6">
            <address className="not-italic">
              <div className="font-semibold">{prospect.name}</div>
              {prospect.address && prospect.address !== prospect.city && <div className="text-[#515154]">{prospect.address}</div>}
            </address>
            <div className="text-xs text-[#515154] shrink-0">{prospect.city}, {today}</div>
          </div>

          <h1 className="text-lg font-bold mt-7 mb-3">
            {isRedesign ? `Kurzcheck Ihrer Website ${host}` : `Eine eigene Website für ${prospect.name}`}
          </h1>

          <p>Guten Tag,</p>

          {isRedesign ? (
            <>
              <p className="mt-2">
                wir erstellen Websites für Betriebe in {prospect.city} und haben uns Ihre Seite <strong>{host}</strong> kurz angesehen
                {checkedOn ? ` (automatische technische Prüfung vom ${checkedOn})` : ''}. Dabei sind uns einige Punkte aufgefallen, die Sie prüfen lassen sollten:
              </p>
              <ul className="mt-3 space-y-1.5 list-disc pl-5">
                {points.map((p) => <li key={p}>{p}</li>)}
              </ul>
              <p className="mt-3">
                Viele dieser Punkte lassen sich mit einer zeitgemäßen Website auf einmal erledigen – und Ihre Kunden finden schneller, was sie suchen.
              </p>
            </>
          ) : (
            <>
              <p className="mt-2">
                {isPlaceholder
                  ? <>wir erstellen Websites für Betriebe in {prospect.city}. Unter Ihrer Adresse <strong>{host}</strong> ist derzeit keine fertige Website erreichbar, sondern nur eine Platzhalterseite.</>
                  : isSocialOnly
                    ? <>wir erstellen Websites für Betriebe in {prospect.city}. Zu Ihrem Betrieb haben wir online ein Social-Media- bzw. Google-Profil gefunden, aber keine eigene Website.</>
                    : <>wir erstellen Websites für Betriebe in {prospect.city}. Zu Ihrem Betrieb haben wir bei unserer Recherche keine eigene Website gefunden.</>}
              </p>
              <p className="mt-2">
                Die meisten Kunden suchen heute zuerst im Internet – nach Öffnungszeiten, Telefonnummer, Leistungen und Anfahrt. Mit einer eigenen Website
                bestimmen Sie selbst, was dort über Ihren Betrieb steht, und sind unabhängig von fremden Plattformen.
              </p>
              {!isPlaceholder && !isSocialOnly && (
                <p className="mt-2 text-[#515154]">Sollten Sie bereits eine Website haben, die wir übersehen haben, freuen wir uns über einen kurzen Hinweis.</p>
              )}
            </>
          )}

          <h2 className="text-sm font-bold mt-6 mb-2">Was Sie von uns bekommen</h2>
          <ul className="space-y-1.5 list-disc pl-5">
            {OFFER_POINTS.map((p) => <li key={p}>{p}</li>)}
          </ul>
          {sender.priceNote.trim() && <p className="mt-3 font-semibold">{sender.priceNote.trim()}</p>}

          {demoUrl && (
            <div className="mt-6 p-4 rounded-xl border-2 border-[#1D1D1F] flex items-center gap-5 print:break-inside-avoid">
              <div className="shrink-0"><QrCode value={demoUrl} size={104} /></div>
              <div className="min-w-0">
                <div className="font-bold">Ihr persönlicher Entwurf – schon fertig zum Ansehen</div>
                <p className="mt-1">
                  Wir haben für {prospect.name} bereits einen unverbindlichen Gestaltungsvorschlag vorbereitet. Scannen Sie den Code mit der
                  Kamera Ihres Smartphones und sehen Sie, wie Ihre neue Website aussehen könnte.
                </p>
                <p className="mt-1 text-[11px] text-[#515154] break-all">{demoUrl.replace(/^https?:\/\//, '')}</p>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 rounded-xl border border-black/[0.15] print:break-inside-avoid">
            <div className="font-bold">Kostenloses und unverbindliches Erstgespräch</div>
            <p className="mt-1">
              Wir zeigen Ihnen in 15 Minuten, wie Ihre neue Website aussehen kann.
              {sender.phone && <> Rufen Sie uns einfach an: <strong>{sender.phone}</strong>{sender.contact ? ` (${sender.contact})` : ''}.</>}
            </p>
          </div>

          <footer className="mt-8 pt-4 border-t border-black/[0.15] text-[11px] text-[#515154] leading-relaxed">
            {isRedesign && (
              <p>
                Die genannten Punkte stammen aus einer automatischen technischen Prüfung der Startseite. Sie sind Hinweise und stellen keine
                Rechtsberatung und keine abschließende Bewertung dar.
              </p>
            )}
            <p className={isRedesign ? 'mt-1.5' : ''}>
              {[brand, sender.address.trim(), sender.phone.trim(), sender.web.trim()].filter(Boolean).join(' · ')}
            </p>
          </footer>
        </article>
      </div>
    </div>,
    document.body
  );
}
