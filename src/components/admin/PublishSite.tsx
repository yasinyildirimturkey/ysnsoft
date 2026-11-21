'use client';

/**
 * Tek tıkla yayın (kazanılan müşteri): alan adı → DNS kontrolü → Impressum/Datenschutz → kontrol → yayınla.
 * Siteler Almanya'daki sunucuda; HTTPS otomatik. Yasal metinlerin doğruluğu müşteri/danışmanı tarafından kontrol edilmeli.
 */
import React, { useEffect, useState } from 'react';
import { Rocket } from 'lucide-react';

interface Legal { owner: string; email: string; phone: string; register: string; vat: string; extra: string; datenschutz: string }
interface Dns { ip: string; apex: string[]; www: string[]; apexOk: boolean; wwwOk: boolean }
const EMPTY: Legal = { owner: '', email: '', phone: '', register: '', vat: '', extra: '', datenschutz: '' };

export default function PublishSite({ id, website, notify, onPublished }: { id: number; website: string | null; notify: (m: string) => void; onPublished?: () => void }) {
  const [info, setInfo] = useState<{ configured: boolean; ip: string; published: { domain: string; at: string } | null } | null>(null);
  const [domain, setDomain] = useState('');
  const [legal, setLegal] = useState<Legal>(EMPTY);
  const [dns, setDns] = useState<Dns | null>(null);
  const [check, setCheck] = useState<{ problems: string[]; notes: string[] } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/publish?id=${id}`, { cache: 'no-store' }).then((r) => r.json()).then((j) => {
      if (!alive || !j.success) return;
      setInfo({ configured: j.configured, ip: j.ip, published: j.published });
      if (j.legal) setLegal(j.legal);
      setDomain(j.published?.domain ?? (website ? website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '') : ''));
    }).catch(() => {});
    return () => { alive = false; };
  }, [id, website]);

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/admin/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.success) { const e = new Error(j.error || 'İşlem olmadı') as Error & { problems?: string[]; dns?: Dns }; e.problems = j.problems; e.dns = j.dns; throw e; }
    return j;
  };
  const run = async (name: string, fn: () => Promise<void>) => {
    setBusy(name);
    try { await fn(); } catch (e) {
      const err = e as Error & { problems?: string[]; dns?: Dns };
      if (err.problems) setCheck({ problems: err.problems, notes: check?.notes ?? [] });
      if (err.dns) setDns(err.dns);
      notify(`Hata: ${err.message}`);
    } finally { setBusy(''); }
  };

  if (!info) return null;
  const set = (k: keyof Legal) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setLegal((l) => ({ ...l, [k]: e.target.value }));
  const input = 'w-full rounded-lg border border-black/10 px-2 py-1.5 text-xs mt-1';
  const ready = check && !check.problems.length && dns?.apexOk && dns?.wwwOk && confirm;

  return (
    <div className="mt-4 rounded-xl border border-black/[0.08] p-3 text-xs">
      <b className="flex items-center gap-1.5 mb-2"><Rocket className="w-3.5 h-3.5" aria-hidden="true" /> Siteyi yayınla (Almanya sunucusu)</b>
      {!info.configured && <p className="text-amber-700 mb-2">Yayın sunucusu henüz ayarlı değil. Hazırlık yapabilirsiniz; yayın düğmesi sunucu kurulunca çalışır.</p>}
      {info.published && (
        <p className="mb-2 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-2">
          Yayında: <a href={`https://${info.published.domain}/`} target="_blank" rel="noopener" className="text-[#0071E3] font-semibold">{info.published.domain}</a>
          {' '}· {new Date(info.published.at).toLocaleDateString('tr-TR')}
          {' '}<button type="button" disabled={!!busy} onClick={() => { if (window.confirm('Site yayından kaldırılsın mı?')) void run('un', async () => { await post({ action: 'unpublish' }); notify('Site kaldırıldı.'); setInfo({ ...info, published: null }); }); }} className="text-[#6E6E73] hover:text-red-600 ml-2">Kaldır</button>
        </p>
      )}

      <p className="font-semibold mt-1">1. Alan adı</p>
      <div className="flex gap-2 items-end">
        <input value={domain} onChange={(e) => { setDomain(e.target.value); setDns(null); }} placeholder="musterbetrieb.de" className={input} />
        <button type="button" disabled={!!busy || !domain} onClick={() => void run('dns', async () => { const j = await post({ action: 'dns', domain }); setDomain(j.domain); setDns(j.dns); })}
          className="apple-pill-btn-secondary px-3 py-1.5 font-semibold whitespace-nowrap disabled:opacity-50">{busy === 'dns' ? 'Bakılıyor…' : 'DNS kontrol'}</button>
      </div>
      {dns && (
        <div className={`mt-1.5 rounded-lg px-2.5 py-2 ${dns.apexOk && dns.wwwOk ? 'bg-emerald-50' : 'bg-amber-50'}`}>
          {dns.apexOk && dns.wwwOk ? 'Alan adı ve www sunucuyu gösteriyor ✓' : (
            <>Müşterinin alan adı firmasında (DNS) şu iki kayıt girilmeli, sonra tekrar kontrol edin (yayılması birkaç saat sürebilir):
              <br /><code>A  @    {dns.ip}</code>{dns.apexOk ? ' ✓' : ` (şu an: ${dns.apex.join(', ') || 'yok'})`}
              <br /><code>A  www  {dns.ip}</code>{dns.wwwOk ? ' ✓' : ` (şu an: ${dns.www.join(', ') || 'yok'})`}</>
          )}
        </div>
      )}

      <p className="font-semibold mt-3">2. Impressum ve Datenschutz (müşteriden; doğruluğu müşteri/danışmanı kontrol etmeli)</p>
      <div className="grid sm:grid-cols-2 gap-2">
        <label className="text-[11px] text-[#6E6E73]">Inhaber/in bzw. Vertretungsberechtigte/r *<input value={legal.owner} onChange={set('owner')} className={input} /></label>
        <label className="text-[11px] text-[#6E6E73]">E-Mail *<input value={legal.email} onChange={set('email')} className={input} /></label>
        <label className="text-[11px] text-[#6E6E73]">Telefon (boşsa kayıttaki)<input value={legal.phone} onChange={set('phone')} className={input} /></label>
        <label className="text-[11px] text-[#6E6E73]">USt-IdNr.<input value={legal.vat} onChange={set('vat')} className={input} /></label>
        <label className="text-[11px] text-[#6E6E73] sm:col-span-2">Register / Kammer / Berufsbezeichnung<input value={legal.register} onChange={set('register')} className={input} /></label>
        <label className="text-[11px] text-[#6E6E73] sm:col-span-2">Weitere Angaben (isteğe bağlı)<textarea rows={2} value={legal.extra} onChange={set('extra')} className={input} /></label>
        <label className="text-[11px] text-[#6E6E73] sm:col-span-2">Datenschutzerklärung metni * (müşteriden ya da bir jeneratörden; paragraflar boş satırla)
          <textarea rows={5} value={legal.datenschutz} onChange={set('datenschutz')} className={input} />
        </label>
      </div>

      <div className="mt-2">
        <button type="button" disabled={!!busy} onClick={() => void run('check', async () => { const j = await post({ action: 'check', legal }); setCheck({ problems: j.problems, notes: j.notes }); })}
          className="apple-pill-btn-secondary px-3 py-1.5 font-semibold disabled:opacity-50">{busy === 'check' ? 'Kontrol ediliyor…' : '3. Yayın kontrolü'}</button>
      </div>
      {check && (
        <div className="mt-1.5 space-y-1">
          {check.problems.map((p) => <p key={p} className="text-red-700">✗ {p}</p>)}
          {!check.problems.length && <p className="text-emerald-700">✓ Engel yok.</p>}
          {check.notes.map((n) => <p key={n} className="text-[#6E6E73]">• {n}</p>)}
        </div>
      )}

      <label className="flex items-start gap-2 mt-3">
        <input type="checkbox" className="mt-0.5" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
        <span>Müşteri sayfanın metinlerini, Impressum ve Datenschutz bilgilerini gördü ve onayladı.</span>
      </label>
      <div className="mt-2 flex justify-end">
        <button type="button" disabled={!ready || !!busy || !info.configured}
          onClick={() => void run('pub', async () => {
            const j = await post({ action: 'publish', domain, legal, confirm: true });
            notify(`Yayında: ${j.url}`);
            setInfo({ ...info, published: { domain, at: new Date().toISOString() } });
            onPublished?.();
          })}
          className="apple-pill-btn px-4 py-1.5 font-semibold disabled:opacity-50">{busy === 'pub' ? 'Yükleniyor…' : info.published ? 'Güncelle (yeniden yayınla)' : 'Yayınla'}</button>
      </div>
    </div>
  );
}
