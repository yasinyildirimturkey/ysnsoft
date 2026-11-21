'use client';

/** Adayın ortağı (white-label): seçilirse müşteri sayfaları ve demo alt yazısı ortağın adıyla görünür. Ortak yoksa gösterilmez. */
import React, { useEffect, useState } from 'react';

interface P { id: string; name: string; active: boolean }

export default function PartnerSelect({ id, notify }: { id: number; notify: (m: string) => void }) {
  const [list, setList] = useState<P[]>([]);
  const [current, setCurrent] = useState('');
  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/partners?id=${id}`, { cache: 'no-store' }).then((r) => r.json()).then((j) => {
      if (alive && j.success) { setList(j.partners.filter((p: P) => p.active)); setCurrent(j.current ?? ''); }
    }).catch(() => {});
    return () => { alive = false; };
  }, [id]);

  if (!list.length) return null;
  const change = async (partnerId: string) => {
    const prev = current;
    setCurrent(partnerId);
    const res = await fetch('/api/admin/partners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'assign', id, partnerId: partnerId || null }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.success) { setCurrent(prev); notify(`Hata: ${j.error || 'kaydedilemedi'}`); return; }
    notify(partnerId ? 'Müşteri sayfaları artık ortağın adıyla görünür.' : 'Müşteri sayfaları YSNSOFT adıyla görünür.');
  };

  return (
    <label className="mt-3 flex items-center gap-2 text-[11px] text-[#6E6E73]">
      Müşteriye görünen marka
      <select value={current} onChange={(e) => void change(e.target.value)} className="rounded-lg border border-black/10 px-2 py-1 text-xs text-[#1D1D1F]">
        <option value="">YSNSOFT</option>
        {list.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </label>
  );
}
