'use client';

/**
 * Kazanılan müşteri bakımı (aday sayfası): bu ayın Google İşletme Profili iş listesi ve aylık site raporu.
 * GBP işleri Google'da elle yapılır, burada işaretlenir; rapor müşteriye /bericht/<kod> ile gider.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, FileText } from 'lucide-react';

interface Task { key: string; tr: string; de: string }
interface Report { period: string; at: string; site: { ok: boolean; ms: number | null; https: boolean; certDays: number | null; error?: string } | null; gbp: string[] }

const monthOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function CustomerCare({ id, token, hasGbp, notify }: { id: number; token: string | null; hasGbp: boolean; notify: (m: string) => void }) {
  const [period, setPeriod] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [done, setDone] = useState<Record<string, string>>({});
  const [reports, setReports] = useState<Report[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => setPeriod(monthOf(new Date())), 0); return () => clearTimeout(t); }, []);

  const load = useCallback(async (p: string) => {
    const r = await fetch(`/api/admin/customer-care?id=${id}&period=${p}`, { cache: 'no-store' }).then((x) => x.json()).catch(() => null);
    if (r?.success) { setTasks(r.tasks); setDone(r.done); setReports(r.reports); }
  }, [id]);
  useEffect(() => {
    if (!period) return;
    const t = setTimeout(() => { void load(period); }, 0);
    return () => clearTimeout(t);
  }, [period, load]);

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/admin/customer-care', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, period, ...body }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.success) throw new Error(j.error || 'Kaydedilemedi');
    return j;
  };
  const toggle = async (task: string, on: boolean) => {
    try { const j = await post({ task, done: on }); setDone(j.done); } catch (e) { notify(`Hata: ${e instanceof Error ? e.message : ''}`); }
  };
  const makeReport = async () => {
    setBusy(true);
    try { await post({ action: 'report' }); notify('Rapor oluşturuldu.'); await load(period); } catch (e) { notify(`Hata: ${e instanceof Error ? e.message : ''}`); } finally { setBusy(false); }
  };
  const copyLink = async (p: string) => {
    if (!token) return;
    try { await navigator.clipboard.writeText(`${window.location.origin}/bericht/${token}?m=${p}`); notify('Rapor bağlantısı kopyalandı.'); } catch { notify('Hata: kopyalanamadı.'); }
  };

  if (!period) return null;
  const count = tasks.filter((t) => done[t.key]).length;

  return (
    <div className="mt-4 grid md:grid-cols-2 gap-3 text-xs">
      <div className="rounded-xl border border-black/[0.08] p-3">
        <div className="flex items-center justify-between mb-2">
          <b className="flex items-center gap-1.5"><ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" /> Google profil işleri</b>
          <input type="month" aria-label="Ay" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} className="text-[11px] border border-black/10 rounded px-1 py-0.5" />
        </div>
        {!hasGbp && <p className="text-[11px] text-[#6E6E73] mb-1.5">Teklifte “Google-Unternehmensprofil-Pflege” modülü yok; yine de işaretleyebilirsiniz.</p>}
        <ul className="space-y-1">
          {tasks.map((t) => (
            <li key={t.key}>
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-0.5" checked={Boolean(done[t.key])} onChange={(e) => void toggle(t.key, e.target.checked)} />
                <span>{t.tr}{done[t.key] ? <span className="text-[#6E6E73]"> · {new Date(done[t.key]).toLocaleDateString('tr-TR')}</span> : ''}</span>
              </label>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-[#6E6E73] mt-2">{count}/{tasks.length} tamam. Fotoğraf yalnız müşterinin gönderdiği; Google’dan görsel alınmaz.</p>
      </div>
      <div className="rounded-xl border border-black/[0.08] p-3">
        <div className="flex items-center justify-between mb-2">
          <b className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" aria-hidden="true" /> Aylık site raporu</b>
          <button type="button" disabled={busy} onClick={() => void makeReport()} className="text-[#0071E3] font-semibold disabled:opacity-50">{busy ? 'Ölçülüyor…' : `${period} raporunu oluştur`}</button>
        </div>
        {reports.length === 0 && <p className="text-[11px] text-[#6E6E73]">Henüz rapor yok. Her ayın başında geçen ayın raporu otomatik oluşur.</p>}
        <ul className="space-y-1.5">
          {reports.slice(0, 6).map((r) => (
            <li key={r.period} className="flex items-center justify-between gap-2">
              <span>
                <b>{r.period}</b>{' '}
                <span className="text-[#6E6E73]">
                  {r.site ? (r.site.ok ? `erişilebilir · ${r.site.ms ?? '?'} ms${r.site.certDays != null ? ` · sertifika ${r.site.certDays} gün` : ''}` : `erişilemedi${r.site.error ? ` (${r.site.error})` : ''}`) : 'site adresi yok'}
                  {r.gbp.length ? ` · GBP ${r.gbp.length} iş` : ''}
                </span>
              </span>
              {token && <button type="button" onClick={() => void copyLink(r.period)} className="text-[#0071E3] font-semibold whitespace-nowrap">Bağlantıyı kopyala</button>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
