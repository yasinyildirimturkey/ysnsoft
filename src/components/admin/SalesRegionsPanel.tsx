'use client';

/** Satış bölgeleri (Ayarlar): her saha kullanıcısına şehir ve/veya posta kodu başı atanır; gün önerisi yalnız oradan seçer. */
import React, { useEffect, useState } from 'react';

interface U { id: string; name: string; email: string; role: string; region: { cities: string[]; plz: string[] } }

export default function SalesRegionsPanel({ notify }: { notify: (m: string) => void }) {
  const [users, setUsers] = useState<U[] | null>(null);
  const [draft, setDraft] = useState<Record<string, { cities: string; plz: string }>>({});

  useEffect(() => {
    let alive = true;
    fetch('/api/admin/sales-regions', { cache: 'no-store' }).then((r) => r.json()).then((j) => {
      if (!alive || !j.success) return;
      setUsers(j.users);
      setDraft(Object.fromEntries(j.users.map((u: U) => [u.id, { cities: u.region.cities.join(', '), plz: u.region.plz.join(', ') }])));
    }).catch(() => setUsers([]));
    return () => { alive = false; };
  }, []);

  const save = async (id: string) => {
    const d = draft[id];
    const res = await fetch('/api/admin/sales-regions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id, cities: d.cities, plz: d.plz }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.success) { notify(`Hata: ${j.error || 'kaydedilemedi'}`); return; }
    setDraft((x) => ({ ...x, [id]: { cities: j.region.cities.join(', '), plz: j.region.plz.join(', ') } }));
    notify(j.region.cities.length || j.region.plz.length ? 'Bölge kaydedildi.' : 'Bölge kaldırıldı (kısıt yok).');
  };

  const input = 'w-full rounded-lg border border-black/10 px-2 py-1.5 text-xs';
  return (
    <div className="apple-card bg-white border border-black/[0.07] p-6 max-w-3xl">
      <h3 className="text-base font-bold text-[#1D1D1F]">Satış bölgeleri</h3>
      <p className="text-xs text-[#6E6E73] mt-0.5 mb-4">
        Saha kullanıcısına şehir ve/veya posta kodu başı (ör. <b>47</b> = 47xxx) verin: “Plan öner” yalnız o bölgeden durak seçer.
        Her satışçı saha ekranında yalnız kendi planını görür. Boş bırakılırsa kısıt yoktur.
      </p>
      {users === null && <p className="text-xs text-[#6E6E73]">Yükleniyor…</p>}
      <div className="space-y-3">
        {users?.map((u) => (
          <div key={u.id} className="grid sm:grid-cols-[1fr_1fr_110px_auto] gap-2 items-end text-xs">
            <div><b>{u.name || u.email}</b><div className="text-[#6E6E73]">{u.role}</div></div>
            <label className="text-[11px] text-[#6E6E73]">Şehirler (virgülle)
              <input value={draft[u.id]?.cities ?? ''} onChange={(e) => setDraft((x) => ({ ...x, [u.id]: { ...x[u.id], cities: e.target.value } }))} className={input} placeholder="Duisburg, Essen" />
            </label>
            <label className="text-[11px] text-[#6E6E73]">Posta kodu başı
              <input value={draft[u.id]?.plz ?? ''} onChange={(e) => setDraft((x) => ({ ...x, [u.id]: { ...x[u.id], plz: e.target.value } }))} className={input} placeholder="47, 451" inputMode="numeric" />
            </label>
            <button type="button" onClick={() => void save(u.id)} className="apple-pill-btn px-3 py-1.5 font-semibold">Kaydet</button>
          </div>
        ))}
      </div>
    </div>
  );
}
