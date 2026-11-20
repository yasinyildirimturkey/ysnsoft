'use client';

/**
 * Müşteriye verilen bağlantılar (aday sayfası): QR'lı "Website-Check" kartı, teklif sayfası, yorum isteği.
 * Hepsi adayın gizli demo koduyla açılır; YSNSOFT adıyla, Almanca.
 */
import React, { useState } from 'react';
import { Printer, QrCode as QrIcon, X } from 'lucide-react';
import { QrCode } from './ProspectOffer';

export default function CustomerLinks({ token, name, status, hasOffer, notify }: {
  token: string; name: string; status: string; hasOffer: boolean; notify: (m: string) => void;
}) {
  const [card, setCard] = useState(false);
  const origin = typeof window === 'undefined' ? 'https://ysnsoft.com' : window.location.origin;
  const url = (p: string) => `${origin}/${p}/${token}`;
  const copy = async (p: string, label: string) => {
    try { await navigator.clipboard.writeText(url(p)); notify(`${label} bağlantısı kopyalandı.`); } catch { notify('Hata: kopyalanamadı.'); }
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" onClick={() => setCard(true)} className="apple-pill-btn-secondary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5">
        <QrIcon className="w-3.5 h-3.5" aria-hidden="true" /> QR kart (site kontrolü)
      </button>
      {hasOffer && (
        <button type="button" onClick={() => copy('angebot', 'Teklif')} className="apple-pill-btn-secondary px-3 py-1.5 text-xs font-semibold"
          title="Müşteri teklifi görür ve bağlayıcı olmadan kabul talebi bırakabilir">Teklif bağlantısı</button>
      )}
      {status === 'won' && (
        <button type="button" onClick={() => copy('feedback', 'Yorum isteği')} className="apple-pill-btn-secondary px-3 py-1.5 text-xs font-semibold"
          title="Müşteri izin vererek yorum bırakır; siz onaylayınca ana sayfada görünür">Yorum isteği bağlantısı</button>
      )}

      {card && (
        <div role="dialog" aria-modal="true" aria-label="QR kart" onMouseDown={(e) => { if (e.target === e.currentTarget) setCard(false); }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 print:bg-white print:p-0">
          <div className="bg-white rounded-2xl p-5 shadow-2xl w-full max-w-sm print:shadow-none">
            <div className="flex justify-between items-center mb-3 print:hidden">
              <h3 className="text-sm font-semibold">Kapıda bırakılacak kart</h3>
              <button type="button" onClick={() => setCard(false)} aria-label="Kapat" className="p-1 text-[#6E6E73]"><X className="w-4 h-4" /></button>
            </div>
            {/* Kartvizit boyutu (85×55 mm) yazdırılır */}
            <div className="border border-black/15 rounded-xl p-4 flex gap-4 items-center print:border-black" style={{ width: '85mm', minHeight: '55mm' }}>
              <QrCode value={url('check')} size={120} label="QR-Code zum Website-Check" />
              <div className="text-[11px] leading-snug text-[#1D1D1F]">
                <p className="font-bold text-[13px]">Kostenloser Website-Check</p>
                <p className="mt-1">für {name}</p>
                <p className="mt-2 text-[#6E6E73]">QR-Code scannen: Ergebnis und Ihr unverbindlicher Entwurf.</p>
                <p className="mt-2 font-semibold">YSNSOFT</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2 print:hidden">
              <button type="button" onClick={() => window.print()} className="apple-pill-btn px-4 py-2 text-xs font-semibold flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" aria-hidden="true" /> Yazdır
              </button>
              <button type="button" onClick={() => copy('check', 'Site kontrolü')} className="apple-pill-btn-secondary px-4 py-2 text-xs font-semibold">Bağlantıyı kopyala</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
