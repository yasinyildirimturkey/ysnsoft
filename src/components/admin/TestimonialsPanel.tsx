'use client';

/** Müşteri yorumları onayı (Ayarlar): onaylanan yorum ana sayfada görünür; reddedilen görünmez, geri alınabilir. */
import React, { useEffect, useState } from 'react';

interface T { id: string; business: string; city: string; name: string; role: string; rating: number; text: string; showName: boolean; status: 'pending' | 'approved' | 'rejected'; createdAt: string }

const LABEL = { pending: 'Onay bekliyor', approved: 'Yayında', rejected: 'Reddedildi' } as const;

export default function TestimonialsPanel({ notify }: { notify: (m: string) => void }) {
  const [list, setList] = useState<T[] | null>(null);
  const load = () => fetch('/api/admin/testimonials', { cache: 'no-store' }).then((r) => r.json()).then((j) => setList(j.success ? j.data : [])).catch(() => setList([]));
  useEffect(() => { void load(); }, []);

  const decide = async (id: string, status: T['status']) => {
    const res = await fetch('/api/admin/testimonials', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.success) { notify(`Hata: ${j.error || 'kaydedilemedi'}`); return; }
    notify(status === 'approved' ? 'Yorum ana sayfada yayında.' : status === 'rejected' ? 'Yorum yayından kaldırıldı.' : 'Yorum onay bekliyor.');
    void load();
  };

  return (
    <div className="apple-card bg-white border border-black/[0.07] p-6 max-w-3xl">
      <h3 className="text-base font-bold text-[#1D1D1F]">Müşteri yorumları</h3>
      <p className="text-xs text-[#6E6E73] mt-0.5 mb-4">Kazanılan müşteri, aday sayfasındaki &ldquo;Yorum isteği bağlantısı&rdquo; ile yorum bırakır ve yayın iznini kendisi verir. Onayladığınız yorumlar ana sayfada görünür.</p>
      {list === null && <p className="text-xs text-[#6E6E73]">Yükleniyor…</p>}
      {list?.length === 0 && <p className="text-xs text-[#6E6E73]">Henüz yorum yok.</p>}
      <div className="space-y-3">
        {list?.map((t) => (
          <div key={t.id} className="p-4 rounded-xl bg-[#F5F5F7] text-xs">
            <div className="flex justify-between gap-2">
              <b className="text-sm">{t.business} <span className="font-normal text-[#6E6E73]">· {t.city}</span></b>
              <span className={`px-2 py-0.5 rounded-full font-semibold ${t.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : t.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{LABEL[t.status]}</span>
            </div>
            <p className="mt-1">{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)} — {t.name}{t.role ? `, ${t.role}` : ''} {t.showName ? '' : <span className="text-[#6E6E73]">(adı gösterilmeyecek)</span>}</p>
            <p className="mt-1.5 whitespace-pre-wrap text-[#1D1D1F]">{t.text}</p>
            <div className="mt-2 flex gap-2">
              {t.status !== 'approved' && <button type="button" onClick={() => void decide(t.id, 'approved')} className="apple-pill-btn px-3 py-1 text-xs font-semibold">Onayla ve yayınla</button>}
              {t.status !== 'rejected' && <button type="button" onClick={() => void decide(t.id, 'rejected')} className="apple-pill-btn-secondary px-3 py-1 text-xs font-semibold">{t.status === 'approved' ? 'Yayından kaldır' : 'Reddet'}</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
