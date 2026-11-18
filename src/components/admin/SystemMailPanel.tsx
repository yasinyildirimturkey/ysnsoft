'use client';

/**
 * Ayarlar → E-posta ve zamanlanmış işler. Eskiden buradaki "test" sahte bir başarı mesajı gösteriyordu ve SMTP şifresi
 * tarayıcıda tutuluyordu. Artık ayarlar sunucudadır (.env.production); bu ekran yalnızca durumu gösterir ve GERÇEK
 * test e-postası gönderir.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Mail, Send } from 'lucide-react';

interface MailStatus { configured: boolean; realSend: boolean; host: string | null; port: number | null; from: string | null }
interface MailLog { at: string; kind: string; to: string[]; subject: string; status: string; error?: string }
interface JobStatus { at: string; ok: boolean; status?: string; skipped?: string; error?: string; recipients?: number; file?: string; size?: number }

const JOB_LABEL: Record<string, string> = { 'sabah-ozeti': 'Sabah özeti (07:15, Almanya saati)', 'gece-yedek': 'Aday veritabanı yedeği (03:00)' };
const STATUS_TR: Record<string, string> = { SENT: 'Gönderildi', SIMULATED: 'Simüle (geliştirme)', FAILED: 'Hata', NOT_CONFIGURED: 'Ayar eksik' };
const fmt = (iso: string) => new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function SystemMailPanel() {
  const [data, setData] = useState<{ mail: MailStatus; mails: MailLog[]; jobs: Record<string, JobStatus> } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/system', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.error || `HTTP ${r.status}`);
      setData(j);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Durum alınamadı.');
    }
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const act = async (action: 'test-mail' | 'morning-now') => {
    setBusy(action);
    setResult(null);
    try {
      const r = await fetch('/api/admin/system', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const j = await r.json();
      const st = j.status as string | undefined;
      if (j.skipped) setResult({ ok: true, text: `Gönderilmedi: ${j.skipped}.` });
      else if (st === 'SENT') setResult({ ok: true, text: `${j.to} adresine gönderildi. Gelen kutunuzu (ve istenmeyen klasörünü) kontrol edin.` });
      else if (st === 'SIMULATED') setResult({ ok: true, text: 'Geliştirme ortamı: e-posta gerçekten gönderilmedi, yalnızca kaydedildi.' });
      else setResult({ ok: false, text: j.error || STATUS_TR[st ?? ''] || 'Gönderilemedi.' });
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : 'Gönderilemedi.' });
    } finally {
      setBusy('');
      void load();
    }
  };

  return (
    <div className="apple-card bg-white border border-black/[0.07] p-6 max-w-3xl">
      <div className="flex items-start justify-between gap-3 border-b border-black/[0.06] pb-4 mb-5">
        <div>
          <h3 className="text-base font-bold text-[#1D1D1F] flex items-center gap-2"><Mail className="w-5 h-5 text-blue-600" /> E-posta ve zamanlanmış işler</h3>
          <p className="text-xs text-[#6E6E73] mt-0.5">
            SMTP bilgileri sunucudaki ayar dosyasından okunur (şifre tarayıcıya gelmez). Bu e-postalar yalnızca ekibe gider; müşteri adaylarına e-posta gönderilmez.
          </p>
        </div>
        {data && (
          <span className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${data.mail.configured && data.mail.realSend ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-800 bg-amber-50 border-amber-200'}`}>
            {data.mail.configured && data.mail.realSend ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {!data.mail.configured ? 'SMTP ayarı eksik' : data.mail.realSend ? 'Gönderim açık' : 'Geliştirme: simüle'}
          </span>
        )}
      </div>

      {error && <p role="alert" className="mb-3 text-xs text-red-700">{error}</p>}
      {data && (
        <div className="space-y-5 text-xs">
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><dt className="text-[#6E6E73]">Sunucu</dt><dd className="font-mono font-semibold">{data.mail.host ? `${data.mail.host}:${data.mail.port}` : '—'}</dd></div>
            <div><dt className="text-[#6E6E73]">Gönderen</dt><dd className="font-semibold">{data.mail.from ?? '—'}</dd></div>
            <div><dt className="text-[#6E6E73]">Değiştirmek için</dt><dd className="text-[#6E6E73]">Sunucuda <code>.env.production</code>: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS</dd></div>
          </dl>

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!!busy} onClick={() => act('test-mail')} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50">
              <Send className="w-3.5 h-3.5 text-blue-600" /> {busy === 'test-mail' ? 'Gönderiliyor…' : 'Kendime test e-postası gönder'}
            </button>
            <button type="button" disabled={!!busy} onClick={() => act('morning-now')} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50">
              <Clock className="w-3.5 h-3.5 text-blue-600" /> {busy === 'morning-now' ? 'Hazırlanıyor…' : 'Sabah özetini şimdi bana gönder'}
            </button>
          </div>
          {result && (
            <p role="status" className={`p-3 rounded-xl border ${result.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>{result.text}</p>
          )}

          <div>
            <h4 className="font-semibold text-[#1D1D1F] mb-2">Zamanlanmış işler</h4>
            <ul className="space-y-1.5">
              {Object.entries(JOB_LABEL).map(([key, label]) => {
                const j = data.jobs[key];
                return (
                  <li key={key} className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[#F5F5F7]">
                    <span className="font-semibold">{label}</span>
                    <span className={j && !j.ok ? 'text-red-700' : 'text-[#6E6E73]'}>
                      {!j ? 'Henüz çalışmadı'
                        : !j.ok ? `Hata ${fmt(j.at)}: ${j.error}`
                          : j.skipped ? `${fmt(j.at)} · atlandı (${j.skipped})`
                            : j.file ? `${fmt(j.at)} · ${j.file} (${Math.round((j.size ?? 0) / 1024 / 1024 * 10) / 10} MB)`
                              : `${fmt(j.at)} · ${STATUS_TR[j.status ?? ''] ?? j.status ?? 'tamam'}${j.recipients ? ` · ${j.recipients} alıcı` : ''}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-[#1D1D1F] mb-2">Son gönderilen e-postalar</h4>
            {data.mails.length === 0 ? <p className="text-[#6E6E73]">Henüz e-posta gönderilmedi.</p> : (
              <ul className="divide-y divide-black/[0.05]">
                {data.mails.map((m, i) => (
                  <li key={i} className="py-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0"><b>{m.subject}</b> <span className="text-[#6E6E73]">→ {m.to.join(', ')}</span></span>
                    <span className={m.status === 'FAILED' || m.status === 'NOT_CONFIGURED' ? 'text-red-700' : 'text-[#6E6E73]'} title={m.error}>
                      {fmt(m.at)} · {STATUS_TR[m.status] ?? m.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
