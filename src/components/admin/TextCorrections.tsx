'use client';

/**
 * Müşterinin /korrektur sayfasından gönderdiği metin düzeltmeleri (aday sayfası).
 * "Demoya uygula" değişiklikleri demoya yazar. Taslak yeniden üretilirse düzeltmeler kaybolur: "Tekrar uygula" ile geri yazılır.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { PencilLine } from 'lucide-react';

interface C { id: string; changes: { from: string; to: string }[]; note: string; name: string; status: 'open' | 'applied' | 'dismissed'; createdAt: string; replaced?: number }

export default function TextCorrections({ id, onApplied, notify }: { id: number; onApplied?: () => void; notify: (m: string) => void }) {
  const [list, setList] = useState<C[]>([]);
  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/corrections?id=${id}`, { cache: 'no-store' }).then((x) => x.json()).catch(() => null);
    if (r?.success) setList(r.data);
  }, [id]);
  useEffect(() => { const t = setTimeout(() => { void load(); }, 0); return () => clearTimeout(t); }, [load]);

  const act = async (cid: string, action: 'apply' | 'dismiss' | 'reopen') => {
    const res = await fetch('/api/admin/corrections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: cid, action }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.success) { notify(`Hata: ${j.error || 'kaydedilemedi'}`); return; }
    if (action === 'apply') {
      notify(j.replaced ? `${j.replaced} metin demoya yazıldı.` : 'Demoda eşleşen metin bulunamadı (taslak değişmiş olabilir).');
      onApplied?.();
    }
    void load();
  };

  if (!list.length) return null;
  return (
    <div className="mt-3 rounded-xl border border-black/[0.08] p-3 text-xs">
      <b className="flex items-center gap-1.5 mb-2"><PencilLine className="w-3.5 h-3.5" aria-hidden="true" /> Müşterinin metin düzeltmeleri</b>
      <div className="space-y-3">
        {list.map((c) => (
          <div key={c.id} className="rounded-lg bg-[#F5F5F7] p-2.5">
            <div className="flex justify-between gap-2 text-[11px] text-[#6E6E73]">
              <span>{c.name} · {new Date(c.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</span>
              <span className={c.status === 'applied' ? 'text-emerald-700 font-semibold' : c.status === 'dismissed' ? '' : 'text-amber-700 font-semibold'}>
                {c.status === 'applied' ? `Uygulandı (${c.replaced ?? 0})` : c.status === 'dismissed' ? 'Kapatıldı' : 'Bekliyor'}
              </span>
            </div>
            {c.changes.map((ch, i) => (
              <div key={i} className="mt-1.5">
                <p className="line-through text-[#6E6E73]">{ch.from}</p>
                <p className="text-[#1D1D1F]">→ {ch.to}</p>
              </div>
            ))}
            {c.note && <p className="mt-1.5 whitespace-pre-wrap"><b>Not:</b> {c.note}</p>}
            <div className="mt-2 flex gap-3">
              {c.changes.length > 0 && c.status !== 'dismissed' && (
                <button type="button" onClick={() => void act(c.id, 'apply')} className="text-[#0071E3] font-semibold">{c.status === 'applied' ? 'Tekrar uygula' : 'Demoya uygula'}</button>
              )}
              {c.status === 'open' && <button type="button" onClick={() => void act(c.id, 'dismiss')} className="text-[#6E6E73]">Kapat</button>}
              {c.status === 'dismissed' && <button type="button" onClick={() => void act(c.id, 'reopen')} className="text-[#6E6E73]">Yeniden aç</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
