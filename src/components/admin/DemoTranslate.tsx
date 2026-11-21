'use client';

/** Demonun Türkçe sürümü: arka planda ücretsiz modelle çevrilir (birkaç dakika); hazır olunca demoda DE | TR anahtarı çıkar. */
import React, { useCallback, useEffect, useState } from 'react';
import { Languages } from 'lucide-react';

interface St { state: string; done?: number; total?: number; translated?: number; failed?: number; error?: string }

export default function DemoTranslate({ id, token, notify }: { id: number; token: string; notify: (m: string) => void }) {
  const [st, setSt] = useState<St | null>(null);
  const [ready, setReady] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/demo-tr?id=${id}`, { cache: 'no-store' }).then((x) => x.json()).catch(() => null);
    if (r?.success) { setSt(r.status); setReady(r.ready); }
  }, [id]);
  useEffect(() => { const t = setTimeout(() => { void load(); }, 0); return () => clearTimeout(t); }, [load]);
  // Sürerken 8 sn'de bir durum okunur
  useEffect(() => {
    if (st?.state !== 'running') return;
    const t = setInterval(() => { void load(); }, 8000);
    return () => clearInterval(t);
  }, [st?.state, load]);

  const start = async () => {
    const res = await fetch('/api/admin/demo-tr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.success) { notify(`Hata: ${j.error || 'başlatılamadı'}`); return; }
    notify('Türkçe çeviri başladı (birkaç dakika).');
    setSt({ state: 'running', done: 0 });
  };

  const running = st?.state === 'running';
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <button type="button" disabled={running} onClick={() => void start()} className="apple-pill-btn-secondary px-3 py-1.5 font-semibold flex items-center gap-1.5 disabled:opacity-60"
        title="Almanca demo aynı kalır; işletme sahibine Türkçe göstermek için ayrı sürüm">
        <Languages className="w-3.5 h-3.5" aria-hidden="true" />
        {running ? `Çevriliyor… ${st?.total ? `${st.done ?? 0}/${st.total}` : ''}` : ready ? 'Türkçeyi yenile' : 'Türkçe sürüm oluştur'}
      </button>
      {ready && !running && <a href={`/demo/${token}?lang=tr`} target="_blank" rel="noopener" className="text-[#0071E3] font-semibold">Türkçe aç{st?.failed ? ` (${st.failed} metin Almanca kaldı)` : ''}</a>}
      {st?.state === 'error' && <span className="text-red-700">Çeviri olmadı: {st.error}</span>}
    </span>
  );
}
