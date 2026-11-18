'use client';

/**
 * Aday sayfasında teklif: paket seç, gerekirse fiyatı değiştir (indirim), kaydet. Kaydedilen teklif
 * Almanca teklif sayfasına basılır ve satış hunisinde ciro olarak sayılır.
 */
import React, { useEffect, useState } from 'react';
import { Euro } from 'lucide-react';
import { api, euro, inputCls, type Pricing, type Prospect } from './prospect-shared';

export default function OfferBox({ prospect, pricing, onSave }: {
  prospect: Prospect;
  pricing: Pricing | null;
  onSave: (offer: { package: string; setup: number; monthly: number } | null, markSent: boolean) => Promise<void>;
}) {
  const has = prospect.offer_setup !== null && prospect.offer_setup !== undefined;
  const [pkg, setPkg] = useState(prospect.offer_package ?? '');
  const [setup, setSetup] = useState(has ? String(prospect.offer_setup) : '');
  const [monthly, setMonthly] = useState(has ? String(prospect.offer_monthly ?? 0) : '');
  const [markSent, setMarkSent] = useState(['new', 'visit_planned', 'visited'].includes(prospect.status));
  const [saving, setSaving] = useState(false);

  // Paket listesi gelince, henüz teklif yoksa ortadaki paket önerilir
  useEffect(() => {
    if (!pricing || pkg) return;
    const t = setTimeout(() => {
      const p = pricing.packages[Math.min(1, pricing.packages.length - 1)];
      setPkg(p.key); setSetup(String(p.setup)); setMonthly(String(p.monthly));
    }, 0);
    return () => clearTimeout(t);
  }, [pricing, pkg]);

  const choose = (key: string) => {
    const p = pricing?.packages.find((x) => x.key === key);
    if (!p) return;
    setPkg(key); setSetup(String(p.setup)); setMonthly(String(p.monthly));
  };
  const list = pricing?.packages.find((x) => x.key === pkg);
  const s = Number(setup), m = Number(monthly);
  const valid = Boolean(pkg) && Number.isInteger(s) && s >= 0 && Number.isInteger(m) && m >= 0 && setup !== '' && monthly !== '';
  const discounted = list && valid && (s !== list.setup || m !== list.monthly);
  const changed = !has || pkg !== prospect.offer_package || s !== prospect.offer_setup || m !== (prospect.offer_monthly ?? 0);

  const save = async (offer: { package: string; setup: number; monthly: number } | null) => {
    setSaving(true);
    try { await onSave(offer, offer ? markSent : false); } finally { setSaving(false); }
  };

  if (!pricing) return <p className="text-[11px] text-[#6E6E73]">Paketler yükleniyor…</p>;

  return (
    <div className="space-y-3">
      {has && (
        <p className="text-[11px] text-[#1D1D1F] bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-2">
          Kayıtlı teklif: <b>{pricing.packages.find((x) => x.key === prospect.offer_package)?.name ?? prospect.offer_package}</b> ·{' '}
          {euro(prospect.offer_setup)} kurulum + {euro(prospect.offer_monthly)}/ay
          {prospect.offer_at ? ` · ${new Date(prospect.offer_at.replace(' ', 'T') + 'Z').toLocaleDateString('tr-TR')}` : ''}
        </p>
      )}
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Paket">
        {pricing.packages.map((p) => (
          <button key={p.key} type="button" role="radio" aria-checked={pkg === p.key} onClick={() => choose(p.key)}
            className={`rounded-xl px-2 py-2 text-left border ${pkg === p.key ? 'border-[#0071E3] bg-[#0071E3]/[0.06]' : 'border-black/[0.08] hover:bg-black/[0.03]'}`}>
            <span className="block text-xs font-semibold text-[#1D1D1F]">{p.name}</span>
            <span className="block text-[10px] text-[#6E6E73] tabular">{euro(p.setup)} + {euro(p.monthly)}/ay</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-[#6E6E73]">Kurulum (tek sefer, €)
          <input inputMode="numeric" value={setup} onChange={(e) => setSetup(e.target.value.replace(/[^\d]/g, ''))} className={`${inputCls} mt-1 tabular`} />
        </label>
        <label className="text-[11px] text-[#6E6E73]">Aylık (€)
          <input inputMode="numeric" value={monthly} onChange={(e) => setMonthly(e.target.value.replace(/[^\d]/g, ''))} className={`${inputCls} mt-1 tabular`} />
        </label>
      </div>
      {discounted && <p className="text-[11px] text-amber-700">Liste fiyatından farklı: {euro(list!.setup)} + {euro(list!.monthly)}/ay</p>}
      {valid && <p className="text-[11px] text-[#6E6E73]">İlk yıl değeri: <b className="text-[#1D1D1F] tabular">{euro(s + 12 * m)}</b> · {pricing.vatNote}</p>}
      <label className="flex items-center gap-2 text-[11px] text-[#1D1D1F]">
        <input type="checkbox" checked={markSent} onChange={(e) => setMarkSent(e.target.checked)} />
        Durumu “Teklif verildi” yap
      </label>
      <div className="flex items-center justify-between gap-2">
        {has
          ? <button type="button" disabled={saving} onClick={() => save(null)} className="text-[11px] text-[#6E6E73] hover:text-red-600 disabled:opacity-50">Teklifi sil</button>
          : <span />}
        <button type="button" disabled={!valid || !changed || saving} onClick={() => save({ package: pkg, setup: s, monthly: m })}
          className="apple-pill-btn px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">
          <Euro className="w-3.5 h-3.5" aria-hidden="true" /> {saving ? 'Kaydediliyor…' : 'Teklifi kaydet'}
        </button>
      </div>
    </div>
  );
}

/** Paket/fiyat ayarlarını yükler (sayfa başına bir kez). */
export function usePricing() {
  const [pricing, setPricing] = useState<Pricing | null>(null);
  useEffect(() => {
    let alive = true;
    api<{ pricing: Pricing }>('/api/admin/prospects?view=pricing')
      .then((r) => { if (alive) setPricing(r.pricing); })
      .catch(() => { /* paketler gelmezse teklif kutusu "yükleniyor" kalır */ });
    return () => { alive = false; };
  }, []);
  return [pricing, setPricing] as const;
}
