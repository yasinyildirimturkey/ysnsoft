'use client';

/**
 * Görüşmeden sonra demoyu WhatsApp ile gönderme. Mesaj satış elemanının KENDİ telefonundan gider (wa.me bağlantısı);
 * biz hiçbir şey göndermeyiz. Yalnızca işletme görüşmede numarasını verip mesaja izin verdiyse kullanılır
 * (soğuk mesaj yok — UWG §7). Gönderim, ziyaret geçmişine "Demo WhatsApp ile gönderildi" olarak kaydedilir.
 */
import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { api, inputCls } from './prospect-shared';

const SENDER_KEY = 'ysn_prospect_offer_sender'; // teklif sayfasındaki gönderen bilgileri (marka, görüşen kişi)

/** Almanya numarası → WhatsApp biçimi (ülke kodu, başında + ve 0 yok). Geçersizse null. */
export function waNumber(raw: string): string | null {
  let d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = `49${d.slice(1)}`;
  d = d.replace(/\D/g, '');
  return d.length >= 10 && d.length <= 15 ? d : null;
}

function senderName(): string {
  try {
    const s = JSON.parse(localStorage.getItem(SENDER_KEY) ?? '{}') as { contact?: string; brand?: string };
    return [s.contact, s.brand].filter(Boolean).join(', ');
  } catch { return ''; }
}

export default function WhatsAppDemo({ id, name, phone, token, onLogged, compact = false, label }: {
  /** token yoksa: yalnız "görüşme için teşekkürler" mesajı (demo linki yok, ziyaret geçmişine yazılmaz) */
  id: number; name: string; phone: string | null; token: string | null; onLogged?: () => void; compact?: boolean; label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [num, setNum] = useState(phone ?? '');
  const [consent, setConsent] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const start = () => {
    const who = senderName();
    if (token) {
      const url = `${window.location.origin}/demo/${token}`;
      setText(
        `Guten Tag,\n\nvielen Dank für das nette Gespräch! Wie besprochen hier Ihr unverbindlicher Website-Entwurf für ${name}:\n${url}\n\n` +
        `Schauen Sie gern in Ruhe auf dem Handy rein. Bei Fragen erreichen Sie mich direkt unter dieser Nummer.\n\nViele Grüße${who ? `\n${who}` : ''}`,
      );
    } else {
      setText(
        `Guten Tag,\n\nvielen Dank für das nette Gespräch heute bei ${name}! Wenn Sie Fragen zu einer neuen Website haben, erreichen Sie mich direkt unter dieser Nummer.\n\nViele Grüße${who ? `\n${who}` : ''}`,
      );
    }
    setNum(phone ?? '');
    setConsent(false);
    setError('');
    setOpen(true);
  };

  const wa = waNumber(num);
  const send = async () => {
    if (!wa || !consent) return;
    setBusy(true);
    setError('');
    // Önce WhatsApp'ı aç (tıklamanın içinde açılmazsa telefon tarayıcısı engelleyebilir), sonra kaydet
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    // Demo linki yoksa (yalnız teşekkür) ziyaret geçmişine "demo gönderildi" yazılmaz
    if (!token) { setBusy(false); setOpen(false); return; }
    try {
      await api('/api/admin/prospects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'visit', id, outcome: 'demo_sent', note: `WhatsApp: Demo an +${wa} gesendet` }),
      });
      onLogged?.();
      setOpen(false);
    } catch (e) {
      setError(`WhatsApp açıldı ama kayıt yazılamadı: ${e instanceof Error ? e.message : 'hata'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={start}
        className={compact
          ? 'flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#25D366]/10 text-[#128C7E] text-xs font-semibold'
          : 'px-3 py-1.5 rounded-full bg-[#25D366] text-white text-xs font-semibold flex items-center gap-1.5 hover:brightness-95'}>
        <MessageCircle className="w-4 h-4" aria-hidden="true" /> {label ?? (compact ? 'WhatsApp' : 'WhatsApp ile gönder')}
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={token ? 'Demoyu WhatsApp ile gönder' : 'Teşekkür mesajı gönder'} onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 bg-black/40">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl text-xs space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#1D1D1F]">{token ? 'Demoyu WhatsApp ile gönder' : 'Teşekkür mesajı gönder'}</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Kapat" className="p-1 text-[#6E6E73]"><X className="w-4 h-4" /></button>
            </div>
            <label className="block text-[#6E6E73]">Numara (görüşmede verilen cep telefonu)
              <input type="tel" value={num} onChange={(e) => setNum(e.target.value)} placeholder="+49 170 …" className={`${inputCls} mt-1`} />
            </label>
            {!wa && num && <p className="text-red-700">Numara geçersiz görünüyor.</p>}
            <p className="text-[11px] text-[#6E6E73]">Sabit hat numaralarında WhatsApp genelde yoktur; görüşmede cep numarasını isteyin.</p>
            <label className="block text-[#6E6E73]">Mesaj (Almanca, düzenlenebilir)
              <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} className={`${inputCls} mt-1 leading-relaxed`} />
            </label>
            <label className="flex items-start gap-2 text-[#1D1D1F] p-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
              <span>İşletmeyle görüştüm; numarayı bize kendisi verdi ve {token ? 'demonun' : 'mesajın'} WhatsApp ile gönderilmesini kabul etti.</span>
            </label>
            {error && <p role="alert" className="text-red-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="apple-pill-btn-secondary px-4 py-2 font-semibold">Vazgeç</button>
              <button type="button" disabled={!wa || !consent || busy} onClick={send}
                className="px-4 py-2 rounded-full bg-[#25D366] text-white font-semibold disabled:opacity-50">WhatsApp’ı aç</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
