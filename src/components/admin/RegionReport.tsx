'use client';

/**
 * Bölge raporu (Müşteri Adayları): hangi şehir/posta kodu/sektörde ne kadar dokunulmamış aday kaldığı ve sahadaki sonuç.
 * Yeni bölge seçerken ve ikinci satışçıya bölge verirken bakılır.
 */
import React, { useEffect, useState } from 'react';
import { MapPinned } from 'lucide-react';
import { CATEGORY_LABEL } from '@/lib/visit-plan';
import { api, euro } from './prospect-shared';

interface Row { name: string; total: number; no_site: number; redesign: number; untouched: number; visited: number; met: number; offers: number; won: number; lost: number; won_value: number; conversion: number | null }

export default function RegionReport() {
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState('');
  const [by, setBy] = useState<'suburb' | 'category'>('suburb');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const q = new URLSearchParams({ view: 'regions', ...(city ? { city, by } : {}) });
    api<{ rows: Row[] }>(`/api/admin/prospects?${q}`)
      .then((r) => { if (alive) { setRows(r.rows); setError(''); } })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Yüklenemedi.'); });
    return () => { alive = false; };
  }, [open, city, by]);

  const label = (n: string) => (city && by === 'category' ? CATEGORY_LABEL[n] ?? n : n);

  return (
    <details className="apple-card bg-white border border-black/[0.07] p-4 mb-4 text-xs" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer font-semibold text-sm text-[#1D1D1F] flex items-center gap-1.5">
        <MapPinned className="w-4 h-4" aria-hidden="true" /> Bölge raporu
        <span className="font-normal text-[#6E6E73] text-xs">— nerede kaç dokunulmamış aday kaldı, sahada ne oldu</span>
      </summary>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {city ? (
          <>
            <button type="button" onClick={() => { setCity(''); setRows(null); }} className="text-[#0071E3] font-semibold">← Tüm şehirler</button>
            <b>{city}</b>
            <div className="flex gap-1" role="radiogroup" aria-label="Kırılım">
              {(['suburb', 'category'] as const).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={by === k} onClick={() => { setBy(k); setRows(null); }}
                  className={`px-2 py-0.5 rounded-full border ${by === k ? 'border-[#0071E3] text-[#0071E3]' : 'border-black/10'}`}>{k === 'suburb' ? 'Posta kodu / semt' : 'Sektör'}</button>
              ))}
            </div>
          </>
        ) : <span className="text-[#6E6E73]">Bir şehre tıklayınca posta kodu ya da sektör kırılımı açılır.</span>}
      </div>
      {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
      {!rows && !error && <p className="mt-2 text-[#6E6E73]">Yükleniyor…</p>}
      {rows && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left tabular">
            <thead className="text-[#6E6E73]">
              <tr>
                <th className="py-1 pr-2 font-medium">{city ? (by === 'category' ? 'Sektör' : 'Bölge') : 'Şehir'}</th>
                <th className="py-1 px-2 font-medium text-right" title="Sitesi yok ya da yenilenmeli, henüz hiç dokunulmamış">Kalan</th>
                <th className="py-1 px-2 font-medium text-right">Sitesi yok</th>
                <th className="py-1 px-2 font-medium text-right">Yenilenmeli</th>
                <th className="py-1 px-2 font-medium text-right">Ziyaret</th>
                <th className="py-1 px-2 font-medium text-right">Teklif</th>
                <th className="py-1 px-2 font-medium text-right">Kazanıldı</th>
                <th className="py-1 px-2 font-medium text-right" title="Görüşülenlerden kazanılan oranı">Oran</th>
                <th className="py-1 pl-2 font-medium text-right" title="Kurulum + 12 × aylık">Değer</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-t border-black/[0.05]">
                  <td className="py-1 pr-2">
                    {city ? label(r.name) : <button type="button" onClick={() => { setCity(r.name); setRows(null); }} className="text-[#0071E3] font-semibold">{r.name}</button>}
                  </td>
                  <td className="py-1 px-2 text-right font-semibold">{r.untouched}</td>
                  <td className="py-1 px-2 text-right">{r.no_site}</td>
                  <td className="py-1 px-2 text-right">{r.redesign}</td>
                  <td className="py-1 px-2 text-right">{r.visited}</td>
                  <td className="py-1 px-2 text-right">{r.offers}</td>
                  <td className="py-1 px-2 text-right">{r.won}</td>
                  <td className="py-1 px-2 text-right">{r.conversion == null ? '–' : `%${r.conversion}`}</td>
                  <td className="py-1 pl-2 text-right">{r.won_value ? euro(r.won_value) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}
