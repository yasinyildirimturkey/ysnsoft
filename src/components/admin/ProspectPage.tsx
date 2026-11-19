'use client';

/**
 * Aday sayfası — /admin/adaylar/[id]. Eskiden listenin üstünde açılan pencereydi; artık kendi adresi var:
 * bağlantı gibi açılır (Ctrl+tık yeni sekme), paylaşılır, tarayıcının Geri/İleri tuşu çalışır.
 *
 * Düzen: solda işletme bilgisi (adres, site, bulgular, derin profil, teklif), sağda sahada kullanılanlar
 * (durum, notlar, ziyaretler, demo ve kontrol listesi, saha fotoğrafları). Telefonda tek sütun, önce sağdakiler.
 * Önceki/sonraki aday: listenin son süzgeçteki sırası (sessionStorage) — listeye dönmeden bölgeyi gezmek için.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, Globe, LayoutTemplate, MapPin, Phone, Printer,
} from 'lucide-react';
import DraftChecklist from './DraftChecklist';
import OfferBox, { usePricing } from './OfferBox';
import WhatsAppDemo from './WhatsAppDemo';
import GoodExamples from './GoodExamples';
import ProspectOffer from './ProspectOffer';
import ProspectPhotos from './ProspectPhotos';
import ProspectProfile from './ProspectProfile';
import ProspectVisits from './ProspectVisits';
import {
  api, cachedRow, cameFromList, inputCls, patchCachedRow, KIND_META, LIST_IDS_KEY, markBackNavigation, PROSPECT_LIST_HREF, PROSPECT_STATUSES, prospectHref, readSession,
  type Job, type Prospect,
} from './prospect-shared';

const CATEGORY_TR: Record<string, string> = {
  friseur: 'Berber / Kuaför / Güzellik', gastro: 'Lokanta / Kafe / İmbiss / Bar', handwerk: 'Zanaatkâr / Usta (Handwerk)',
  arzt: 'Doktor / Diş hekimi', kfz: 'Oto tamir / Galeri', baeckerei: 'Fırın / Pastane / Kasap', einzelhandel: 'Mağaza',
  dienstleistung: 'Hizmet', gesundheit: 'Sağlık', immobilien: 'Emlak / Sigorta / Büro', hotel: 'Otel / Pansiyon',
};

const card = 'apple-card bg-white border border-black/[0.07] p-5';

export default function ProspectPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const router = useRouter();

  const [p, setP] = useState<Prospect | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [notes, setNotes] = useState('');
  const [site, setSite] = useState('');
  const [job, setJob] = useState<Job | null>(null);
  const [profileRefresh, setProfileRefresh] = useState(0);
  const [offer, setOffer] = useState(false);
  const [ids, setIds] = useState<number[]>([]);
  const [backLabel, setBackLabel] = useState('Müşteri Adayları');
  const [pricing] = usePricing();
  const [visitsKey, setVisitsKey] = useState(0);

  const pRef = useRef<Prospect | null>(null);
  useEffect(() => { pRef.current = p; }, [p]);

  const notify = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast((t) => (t === m ? '' : t)), 3500);
  }, []);

  const load = useCallback(async (keepEdits = false) => {
    try {
      const res = await api<{ rows: Prospect[] }>(`/api/admin/prospects?kind=all&id=${id}`);
      const row = res.rows?.[0];
      if (!row) { setError('Aday bulunamadı.'); return; }
      const prev = pRef.current;
      setP(row);
      if (!keepEdits || !prev) { setNotes(row.notes ?? ''); setSite(row.website ?? ''); }
      else {
        // Yazılmakta olan not/adres korunur; kullanıcı dokunmadıysa sunucudaki güncel değer gelir
        setNotes((n) => (n === (prev.notes ?? '') ? row.notes ?? '' : n));
        setSite((s) => (s === (prev.website ?? '') ? row.website ?? '' : s));
      }
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Aday yüklenemedi.');
    }
  }, [id]);

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) return;
    const t = setTimeout(() => {
      // Listeden gelindiyse satır zaten elde: anında göster, sunucudan günceli arkada gelsin
      const cached = cachedRow(id);
      setP(cached);
      if (cached) { setNotes(cached.notes ?? ''); setSite(cached.website ?? ''); }
      setError('');
      load(Boolean(cached));
      const from = cameFromList();
      setBackLabel(from ?? 'Müşteri Adayları');
      // Önceki/sonraki yalnızca aday listesinden gelince anlamlı (saha listesinin sırası başka)
      setIds(from === 'Saha listesi' ? [] : readSession<number[]>(LIST_IDS_KEY) ?? []);
    }, 0);
    return () => clearTimeout(t);
  }, [id, load]);

  // Fotoğraf yüklenince demo yenileme: iş sürerken yüklendiyse iş bitince çalışır
  const pendingRegen = useRef(false);
  const regenRef = useRef<() => void>(() => {});

  // Çalışan iş (derin profil / taslak) bitince adayı yenile; yazılmakta olan not/adres korunur
  const jobRunning = job?.state === 'running';
  useEffect(() => {
    if (!jobRunning) return;
    const t = setInterval(async () => {
      try {
        const res = await api<{ job: Job | null }>('/api/admin/prospects?view=job');
        setJob(res.job);
        if (res.job?.state !== 'running') {
          notify(res.job?.state === 'error' ? `Hata: ${res.job.message}` : (res.job?.message ?? 'Tamamlandı.'));
          load(true);
          setProfileRefresh((n) => n + 1);
          // İş sürerken fotoğraf yüklendiyse demo şimdi yenilenir
          if (pendingRegen.current) { pendingRegen.current = false; setTimeout(() => regenRef.current(), 400); }
        }
      } catch { /* geçici ağ hatası */ }
    }, 2500);
    return () => clearInterval(t);
  }, [jobRunning, load, notify]);

  const dirty = Boolean(p) && (notes !== (p?.notes ?? '') || site.trim() !== (p?.website ?? ''));

  // Kaydedilmemiş not/adresle sekme kapanır ya da sayfa yenilenirse tarayıcı uyarır
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const leaveOk = () => !dirty || window.confirm('Kaydedilmemiş not ya da web adresi var. Kaydetmeden çıkılsın mı?');

  /** Listeye dön: liste bir önceki sayfaysa tarayıcı geçmişinde geri (süzgeç ve konum korunur), değilse listeyi aç. */
  const goBack = () => {
    if (!leaveOk()) return;
    markBackNavigation();
    if (cameFromList() && window.history.length > 1) router.back();
    else router.push(PROSPECT_LIST_HREF);
  };

  const pos = ids.indexOf(id);
  const prevId = pos > 0 ? ids[pos - 1] : null;
  const nextId = pos >= 0 && pos < ids.length - 1 ? ids[pos + 1] : null;
  const go = (target: number | null) => {
    if (!target || !leaveOk()) return;
    // Önceki/sonraki geçmişi şişirmesin: yerinde değiştir, Geri yine listeye döner
    router.replace(prospectHref(target));
  };

  // Klavye: Alt+← / Alt+→ önceki/sonraki aday (yazı alanındayken değil)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (!e.altKey || tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft' && prevId) { e.preventDefault(); go(prevId); }
      if (e.key === 'ArrowRight' && nextId) { e.preventDefault(); go(nextId); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const update = async (patch: { status?: string; notes?: string; website?: string }, ok?: string) => {
    if (!p) return;
    try {
      await api('/api/admin/prospects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', id: p.id, ...patch }) });
      if (patch.website !== undefined) await load(true);
      else {
        const change = { ...(patch.status ? { status: patch.status } : {}), ...(patch.notes !== undefined ? { notes: patch.notes } : {}) };
        setP({ ...p, ...change });
        patchCachedRow(p.id, change);
      }
      if (ok) notify(ok);
    } catch (e) {
      notify(`Hata: ${e instanceof Error ? e.message : 'Kaydedilemedi.'}`);
    }
  };

  const saveOffer = async (offer: { package: string; setup: number; monthly: number } | null, markSent: boolean) => {
    if (!p) return;
    try {
      await api('/api/admin/prospects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id: p.id, offer, ...(markSent ? { status: 'offer_sent' } : {}) }),
      });
      await load(true);
      const change = offer
        ? { offer_package: offer.package, offer_setup: offer.setup, offer_monthly: offer.monthly, ...(markSent ? { status: 'offer_sent' } : {}) }
        : { offer_package: null, offer_setup: null, offer_monthly: null, offer_at: null };
      patchCachedRow(p.id, change);
      notify(offer ? 'Teklif kaydedildi.' : 'Teklif silindi.');
    } catch (e) {
      notify(`Hata: ${e instanceof Error ? e.message : 'Teklif kaydedilemedi.'}`);
    }
  };

  const startJob = async (body: object, step: string, message: string) => {
    try {
      await api('/api/admin/prospects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setJob({ state: 'running', step, message, progress: { done: 0, total: 1 } });
    } catch (e) {
      notify(`Hata: ${e instanceof Error ? e.message : 'Başlatılamadı.'}`);
    }
  };

  // Saha fotoğrafı yüklenince (ya da kapak değişince) demo kendiliğinden yeniden üretilir
  useEffect(() => {
    regenRef.current = () => { startJob({ action: 'draft', id }, 'draft', 'Fotoğraflarla demo yenileniyor…'); };
  });
  const regenAfterPhotos = () => {
    if (!p?.draft_token) { notify('Fotoğraflar eklendi. Demo için “Taslak oluştur”a basın.'); return; }
    if (jobRunning) { pendingRegen.current = true; notify('Fotoğraflar eklendi; çalışan iş bitince demo yenilenecek.'); return; }
    regenRef.current();
  };

  const copyDraftLink = async (token: string) => {
    const url = `${window.location.origin}/demo/${token}`;
    try { await navigator.clipboard.writeText(url); notify('Taslak bağlantısı kopyalandı.'); } catch { notify(url); }
  };

  const title = useMemo(() => (p ? `${p.name} · Aday` : 'Aday'), [p]);
  useEffect(() => { document.title = `${title} | YSNSOFT`; }, [title]);

  if (!Number.isInteger(id) || id <= 0) return <Shell><p className="p-8 text-sm text-red-700">Geçersiz aday adresi.</p></Shell>;

  return (
    <Shell>
      {/* Üst çubuk: geri, konum, önceki/sonraki */}
      <div className="sticky top-0 z-30 bg-[#F5F5F7]/90 backdrop-blur-xl border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <button type="button" onClick={goBack} className="flex items-center gap-1.5 text-sm font-semibold text-[#0071E3] hover:underline">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> <span>{backLabel}</span>
          </button>
          {ids.length > 0 && pos >= 0 && (
            <div className="flex items-center gap-1 text-xs text-[#6E6E73]">
              <button type="button" disabled={!prevId} onClick={() => go(prevId)} title="Önceki aday (Alt+←)" aria-label="Önceki aday"
                className="p-1.5 rounded-full hover:bg-black/[0.06] disabled:opacity-30"><ChevronLeft className="w-4 h-4" aria-hidden="true" /></button>
              <span className="tabular">{pos + 1} / {ids.length}</span>
              <button type="button" disabled={!nextId} onClick={() => go(nextId)} title="Sonraki aday (Alt+→)" aria-label="Sonraki aday"
                className="p-1.5 rounded-full hover:bg-black/[0.06] disabled:opacity-30"><ChevronRight className="w-4 h-4" aria-hidden="true" /></button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {error ? (
          <div className={`${card} text-sm`}>
            <p className="text-red-700">{error}</p>
            <div className="mt-4 flex gap-2">
              <Link href={PROSPECT_LIST_HREF} className="apple-pill-btn px-4 py-2 text-xs font-semibold">Listeye git</Link>
              <button type="button" onClick={() => window.history.back()} className="apple-pill-btn-secondary px-4 py-2 text-xs font-semibold">Geri</button>
            </div>
          </div>
        ) : !p ? (
          <div className="space-y-4 animate-pulse" aria-label="Yükleniyor">
            <div className="h-8 w-72 bg-black/[0.06] rounded-lg" />
            <div className="h-40 bg-black/[0.05] rounded-2xl" />
          </div>
        ) : (
          <>
            {/* Başlık */}
            <header className="flex flex-wrap items-start justify-between gap-3 mb-6">
              <div className="min-w-0">
                <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${KIND_META[p.kind].cls}`}>
                  {KIND_META[p.kind].label}{p.kind === 'no_site' || p.kind === 'redesign' ? ' teklifi' : ''}
                </span>
                <h1 className="text-2xl font-semibold text-[#1D1D1F] mt-1.5 tracking-tight">{p.name}</h1>
                <p className="text-sm text-[#6E6E73] mt-0.5">{CATEGORY_TR[p.category] ?? p.category} · {p.city}{p.districts ? ` · ${p.districts}` : ''}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {p.phone && (
                  <a href={`tel:${p.phone.replace(/[^+\d]/g, '')}`} className="apple-pill-btn px-4 py-2 text-xs font-semibold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" aria-hidden="true" /> <span>Ara</span>
                  </a>
                )}
                {(p.kind === 'no_site' || p.kind === 'redesign') && (
                  <button type="button" onClick={() => setOffer(true)} className="apple-pill-btn-secondary px-4 py-2 text-xs font-semibold flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5 text-[#10B981]" aria-hidden="true" /> <span>Almanca teklif sayfası</span>
                  </button>
                )}
              </div>
            </header>

            <div className="grid lg:grid-cols-[1fr_380px] gap-5 items-start text-xs">
              {/* Sağ sütun (telefonda önce): sahada kullanılanlar */}
              <aside className="space-y-5 lg:order-2 lg:sticky lg:top-20">
                <section className={card} aria-labelledby="h-status">
                  <h2 id="h-status" className="text-sm font-semibold text-[#1D1D1F] mb-3">Durum</h2>
                  <div className="flex flex-wrap gap-2">
                    {PROSPECT_STATUSES.map((s) => (
                      <button key={s.key} type="button" aria-pressed={p.status === s.key} onClick={() => update({ status: s.key })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${p.status === s.key ? 'bg-[#0071E3] text-white' : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-black/[0.06]'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <label htmlFor="pr-notes" className="block text-[#6E6E73] mt-5 mb-1">Ziyaret notları</label>
                  <textarea id="pr-notes" rows={5} value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Kiminle görüşüldü, ne dendi, ne zaman tekrar gidilecek…" className={`${inputCls} resize-y leading-relaxed`} />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-amber-700">{notes !== (p.notes ?? '') ? 'Kaydedilmedi' : ''}</span>
                    <button type="button" disabled={notes === (p.notes ?? '')} onClick={() => update({ notes }, 'Not kaydedildi.')}
                      className="apple-pill-btn px-4 py-1.5 text-xs font-semibold disabled:opacity-50">Notu kaydet</button>
                  </div>
                  <div className="mt-4"><ProspectVisits key={`v${p.id}-${visitsKey}`} id={p.id} /></div>
                </section>

                <section className={card} aria-labelledby="h-offer">
                  <h2 id="h-offer" className="text-sm font-semibold text-[#1D1D1F] mb-3">Teklif</h2>
                  <OfferBox key={`o${p.id}`} prospect={p} pricing={pricing} onSave={saveOffer} />
                </section>

                <section className={card} aria-labelledby="h-draft">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id="h-draft" className="text-sm font-semibold text-[#1D1D1F] flex items-center gap-1.5">
                      <LayoutTemplate className="w-4 h-4" aria-hidden="true" /> Demo (şablon taslağı)
                    </h2>
                    <button type="button" disabled={jobRunning} onClick={() => startJob({ action: 'draft', id: p.id }, 'draft', 'Şablon taslağı başlıyor…')}
                      className="apple-pill-btn-secondary px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                      {jobRunning ? 'Çalışıyor…' : p.draft_token ? 'Yeniden üret' : 'Taslak oluştur'}
                    </button>
                  </div>
                  {jobRunning && <p role="status" className="mt-2 text-[#0071E3] font-medium">{job?.message}</p>}
                  {p.draft_token ? (
                    <>
                      <p className="text-[11px] text-[#6E6E73] mt-1">
                        {p.draft_expires ? `${new Date(p.draft_expires).toLocaleDateString('tr-TR')} tarihine kadar açık` : 'Süreli'} · gizli adres
                        {p.demo_views ? ` · müşteri ${p.demo_views}× açtı` : ''}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a href={`/demo/${p.draft_token}`} target="_blank" rel="noopener noreferrer" className="apple-pill-btn px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5">
                          <span>Demoyu aç</span> <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                        <button type="button" onClick={() => copyDraftLink(p.draft_token!)} className="apple-pill-btn-secondary px-3 py-1.5 text-xs font-semibold">Bağlantıyı kopyala</button>
                        <WhatsAppDemo id={p.id} name={p.name} phone={p.phone} token={p.draft_token} onLogged={() => { setVisitsKey((k) => k + 1); load(true); notify('Gönderim ziyaret geçmişine kaydedildi.'); }} />
                        {p.status === 'won' && (
                          <a href={`/api/admin/prospects?view=export&id=${p.id}`} download
                            title="Taslak işaretleri çıkarılmış site + Impressum/Datenschutz taslağı + yayın kontrol listesi"
                            className="apple-pill-btn-secondary px-3 py-1.5 text-xs font-semibold">Yayın paketi (zip)</a>
                        )}
                      </div>
                      {p.draft_quality && <DraftChecklist quality={p.draft_quality} />}
                    </>
                  ) : (
                    <p className="text-[11px] text-[#6E6E73] mt-1 leading-relaxed">İşletmenin adı, adresi, saatleri, logosu ve görselleriyle telefon ve masaüstü uyumlu örnek site (yaklaşık 1 dk).</p>
                  )}
                  <ProspectPhotos key={p.id} id={p.id} onUploaded={regenAfterPhotos} />
                </section>
              </aside>

              {/* Sol sütun: işletme bilgisi */}
              <div className="space-y-5 lg:order-1 min-w-0">
                <section className={card} aria-labelledby="h-contact">
                  <h2 id="h-contact" className="sr-only">İletişim</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[#6E6E73] flex items-center gap-1"><MapPin className="w-3 h-3" aria-hidden="true" /> Adres</span>
                      <strong className="text-[#1D1D1F] text-sm">{p.address || '—'}</strong>
                      {p.lat !== null && p.lon !== null && (
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`} target="_blank" rel="noopener noreferrer"
                          className="block text-[#0071E3] font-semibold hover:underline mt-0.5">Yol tarifi</a>
                      )}
                    </div>
                    <div>
                      <span className="text-[#6E6E73] flex items-center gap-1"><Phone className="w-3 h-3" aria-hidden="true" /> Telefon</span>
                      {p.phone ? <a href={`tel:${p.phone.replace(/[^+\d]/g, '')}`} className="text-[#0071E3] font-semibold text-sm">{p.phone}</a> : <strong className="text-sm">—</strong>}
                    </div>
                  </div>

                  <div className="mt-5">
                    {p.site_mismatch && (
                      <p role="alert" className="mb-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 leading-relaxed flex gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>
                          Kayıtlı web adresi <b>{p.site_mismatch.host}</b> sitesine gidiyor{p.site_mismatch.owner ? <> (Impressum: <b>{p.site_mismatch.owner}</b>)</> : null}; sitede bu işletmenin adı geçmiyor.
                          Firma devredilmiş ya da kayıt yanlış olabilir — sahada kontrol edin, doğru adresi aşağıya yazın. O zamana kadar taslak üretilmez.
                        </span>
                      </p>
                    )}
                    <label htmlFor="pr-site" className="text-[#6E6E73] flex items-center gap-1 mb-1">
                      <Globe className="w-3 h-3" aria-hidden="true" /> Web sitesi {p.website ? '' : '(kayıtlı değil — sahada/Google’da bulduysanız yazın)'}
                    </label>
                    <div className="flex gap-2">
                      <input id="pr-site" value={site} onChange={(e) => setSite(e.target.value)} placeholder="ornek.de" className={inputCls} />
                      {p.website && (
                        <a href={p.website} target="_blank" rel="noopener noreferrer" aria-label="Siteyi aç" className="apple-pill-btn-secondary shrink-0 px-3 py-2 flex items-center">
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        </a>
                      )}
                      <button type="button" disabled={site.trim() === (p.website ?? '')} onClick={() => update({ website: site.trim() }, 'Web adresi kaydedildi.')}
                        className="apple-pill-btn-secondary shrink-0 px-3 py-2 text-xs font-semibold disabled:opacity-50">Kaydet</button>
                    </div>
                  </div>
                </section>

                {p.findings.length > 0 && (
                  <section className={card} aria-labelledby="h-findings">
                    <h2 id="h-findings" className="text-sm font-semibold text-[#1D1D1F] mb-3">
                      Teknik bulgular{p.score !== null && p.kind !== 'no_site' ? ` — sorun puanı ${p.score}/100` : ''}
                      {p.score !== null && p.raw_score !== null && p.raw_score !== p.score && (
                        <span className="font-normal text-[#6E6E73] text-xs"> (ilk tarama {p.raw_score}; yanlış alarmlar düşüldü)</span>
                      )}
                    </h2>
                    <ul className="space-y-2">
                      {p.findings.map((f) => {
                        const refuted = f.verified === 'refuted';
                        return (
                          <li key={f.code} className={`flex items-start justify-between gap-3 ${refuted ? 'opacity-60' : ''}`}>
                            <span>
                              <span className={`text-[#1D1D1F] font-semibold ${refuted ? 'line-through' : ''}`}>{f.tr}</span>
                              {refuted && <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-red-100 text-red-800 text-[10px] font-bold">Yanlış alarm</span>}
                              <span className="block text-[#6E6E73] text-[11px]" lang="de">{f.de}</span>
                            </span>
                            <span className={`tabular text-[#6E6E73] shrink-0 ${refuted ? 'line-through' : ''}`}>+{f.points}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-[11px] text-[#6E6E73] mt-3">Görüşmede “hukuka aykırı” demeyin; “kontrol edilmeli” deyin.</p>
                  </section>
                )}

                <section className={card} aria-labelledby="h-examples">
                  <h2 id="h-examples" className="text-sm font-semibold text-[#1D1D1F] mb-2">Bölgedeki iyi örnekler</h2>
                  <GoodExamples key={`g${p.id}`} id={p.id} city={p.city} />
                </section>

                <section className={card}>
                  <ProspectProfile prospect={p} findings={p.findings} jobRunning={jobRunning} refreshKey={profileRefresh}
                    onEnrich={(eid) => startJob({ action: 'enrich', ids: [eid ?? p.id] }, 'enrich', 'Derin profil başlıyor…')} />
                </section>
              </div>
            </div>
          </>
        )}
      </div>

      {offer && p && <ProspectOffer prospect={p} pricing={pricing} onClose={() => setOffer(false)} />}
      {toast && (
        <div role="status" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#1D1D1F] text-white text-xs font-semibold shadow-lg">{toast}</div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="admin-ui min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">{children}</div>;
}
