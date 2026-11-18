'use client';

/**
 * Teklif paketleri ve fiyatları (panelden düzenlenir; WebScout data/pricing.json). Müşteriye giden metinler Almanca.
 * Değişiklik yalnızca bundan sonra kaydedilen tekliflere yansır; kayıtlı tekliflerin tutarı değişmez.
 */
import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { api, inputCls, type Pricing, type PricingPackage } from './prospect-shared';

export default function PricingEditor({ onClose, onSaved }: { onClose: () => void; onSaved?: (p: Pricing) => void }) {
  const [draft, setDraft] = useState<Pricing | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    api<{ pricing: Pricing }>('/api/admin/prospects?view=pricing')
      .then((r) => { if (alive) setDraft(r.pricing); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Yüklenemedi.'); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setPkg = (i: number, patch: Partial<PricingPackage>) =>
    setDraft((d) => (d ? { ...d, packages: d.packages.map((p, j) => (j === i ? { ...p, ...patch } : p)) } : d));

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError('');
    try {
      const r = await api<{ pricing: Pricing }>('/api/admin/prospects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'pricing', pricing: draft }),
      });
      onSaved?.(r.pricing);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Paketler ve fiyatlar" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="admin-modal fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/40 overflow-y-auto">
      <div className="apple-card bg-white p-5 sm:p-6 w-full max-w-3xl border border-black/[0.1] shadow-2xl text-xs">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-[#1D1D1F]">Paketler ve fiyatlar</h3>
            <p className="text-[#6E6E73] mt-0.5">Teklif sayfasına Almanca basılır. Değişiklik kayıtlı tekliflerin tutarını değiştirmez.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Kapat" className="p-1 text-[#6E6E73] hover:text-[#1D1D1F]"><X className="w-4 h-4" /></button>
        </div>

        {!draft ? <p className="text-[#6E6E73]">{error || 'Yükleniyor…'}</p> : (
          <>
            <div className="grid md:grid-cols-3 gap-3">
              {draft.packages.map((p, i) => (
                <div key={i} className="rounded-xl border border-black/[0.08] p-3 space-y-2">
                  <div className="flex gap-2">
                    <input aria-label="Paket adı" value={p.name} onChange={(e) => setPkg(i, { name: e.target.value })} className={`${inputCls} font-semibold`} />
                    {draft.packages.length > 1 && (
                      <button type="button" aria-label={`${p.name} paketini sil`} onClick={() => setDraft({ ...draft, packages: draft.packages.filter((_, j) => j !== i) })}
                        className="p-1.5 text-[#6E6E73] hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[11px] text-[#6E6E73]">Kurulum €
                      <input inputMode="numeric" value={p.setup} onChange={(e) => setPkg(i, { setup: Number(e.target.value.replace(/[^\d]/g, '') || 0) })} className={`${inputCls} mt-1 tabular`} />
                    </label>
                    <label className="text-[11px] text-[#6E6E73]">Aylık €
                      <input inputMode="numeric" value={p.monthly} onChange={(e) => setPkg(i, { monthly: Number(e.target.value.replace(/[^\d]/g, '') || 0) })} className={`${inputCls} mt-1 tabular`} />
                    </label>
                  </div>
                  <label className="block text-[11px] text-[#6E6E73]">İçerik (her satır bir madde, Almanca)
                    <textarea rows={6} value={p.features.join('\n')} onChange={(e) => setPkg(i, { features: e.target.value.split('\n') })}
                      className={`${inputCls} mt-1 leading-relaxed resize-y`} />
                  </label>
                </div>
              ))}
            </div>
            {draft.packages.length < 6 && (
              <button type="button" onClick={() => setDraft({ ...draft, packages: [...draft.packages, { key: `paket${draft.packages.length + 1}`, name: 'Neues Paket', setup: 0, monthly: 0, features: [] }] })}
                className="mt-3 text-[#0071E3] font-semibold flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Paket ekle</button>
            )}
            <label className="block mt-4 text-[11px] text-[#6E6E73]">Vergi notu (teklifin altına basılır)
              <input value={draft.vatNote} onChange={(e) => setDraft({ ...draft, vatNote: e.target.value })} className={`${inputCls} mt-1`} />
            </label>
            {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="apple-pill-btn-secondary px-4 py-2 font-semibold">Vazgeç</button>
              <button type="button" disabled={saving} onClick={save} className="apple-pill-btn px-5 py-2 font-semibold disabled:opacity-50">{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
