'use client';

/**
 * Ortaklar / white-label (Ayarlar): ajans, vergi danışmanı vb. Aday sayfasında ortak seçilince o adayın müşteri sayfaları
 * ve demo alt yazısı ortağın adı/iletişimiyle görünür. Ortaklık sunumu: /partner
 */
import React, { useEffect, useState } from 'react';

interface P { id?: string; name: string; tagline: string; email: string; phone: string; website: string; active: boolean; prospects?: number }
const EMPTY: P = { name: '', tagline: '', email: '', phone: '', website: '', active: true };

export default function PartnersPanel({ notify }: { notify: (m: string) => void }) {
  const [list, setList] = useState<P[] | null>(null);
  const [edit, setEdit] = useState<P | null>(null);
  const load = () => fetch('/api/admin/partners', { cache: 'no-store' }).then((r) => r.json()).then((j) => setList(j.success ? j.partners : [])).catch(() => setList([]));
  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!edit) return;
    const res = await fetch('/api/admin/partners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', partner: edit }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.success) { notify(`Hata: ${j.error || 'kaydedilemedi'}`); return; }
    notify('Ortak kaydedildi.');
    setEdit(null);
    void load();
  };

  const input = 'w-full rounded-lg border border-black/10 px-2 py-1.5 text-xs mt-1';
  const field = (k: keyof P, label: string, ph = '') => (
    <label className="text-[11px] text-[#6E6E73]">{label}
      <input value={String(edit?.[k] ?? '')} placeholder={ph} onChange={(e) => setEdit((x) => (x ? { ...x, [k]: e.target.value } : x))} className={input} />
    </label>
  );

  return (
    <div className="apple-card bg-white border border-black/[0.07] p-6 max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#1D1D1F]">Ortaklar (white-label)</h3>
          <p className="text-xs text-[#6E6E73] mt-0.5 mb-4">
            Aday sayfasında ortak seçilince müşteriye giden sayfalar (site kontrolü, teklif, rapor, metin düzeltme, yorum) ve demo alt yazısı
            ortağın adı ve iletişimiyle görünür. Ortaklık sunumu: <a href="/partner" target="_blank" rel="noopener" className="text-[#0071E3] font-semibold">/partner</a>
          </p>
        </div>
        {!edit && <button type="button" onClick={() => setEdit({ ...EMPTY })} className="apple-pill-btn px-3 py-1.5 text-xs font-semibold whitespace-nowrap">Ortak ekle</button>}
      </div>
      {edit && (
        <div className="rounded-xl bg-[#F5F5F7] p-3 mb-4 grid sm:grid-cols-2 gap-2">
          {field('name', 'Ad (müşteriye görünür)', 'Muster Werbeagentur')}
          {field('tagline', 'Alt satır', 'Webdesign & Marketing')}
          {field('email', 'E-posta', 'info@…')}
          {field('phone', 'Telefon', '+49 …')}
          {field('website', 'Web sitesi', 'https://…')}
          <label className="flex items-center gap-2 text-xs mt-5">
            <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Etkin
          </label>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setEdit(null)} className="apple-pill-btn-secondary px-3 py-1.5 text-xs font-semibold">Vazgeç</button>
            <button type="button" onClick={() => void save()} className="apple-pill-btn px-3 py-1.5 text-xs font-semibold">Kaydet</button>
          </div>
        </div>
      )}
      {list === null && <p className="text-xs text-[#6E6E73]">Yükleniyor…</p>}
      {list?.length === 0 && !edit && <p className="text-xs text-[#6E6E73]">Henüz ortak yok.</p>}
      <div className="space-y-2">
        {list?.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 text-xs p-3 rounded-xl bg-[#F5F5F7]">
            <span>
              <b>{p.name}</b>{p.tagline ? ` · ${p.tagline}` : ''} <span className="text-[#6E6E73]">· {p.email || 'e-posta yok'} · {p.prospects ?? 0} aday{p.active ? '' : ' · pasif'}</span>
            </span>
            <button type="button" onClick={() => setEdit({ ...p })} className="text-[#0071E3] font-semibold">Düzenle</button>
          </div>
        ))}
      </div>
    </div>
  );
}
