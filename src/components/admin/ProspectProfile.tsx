'use client';

/**
 * Seviye 2 — derin profil kartı (Aday detayı penceresinin içinde).
 *
 * WebScout'un `enrich` adımının çıkardığı bilgileri gösterir: işletme hâlâ açık mı (tahmin),
 * Impressum'dan yetkili, çalışma saatleri, Seviye 1 bulgularının doğrulaması, arşiv geçmişi,
 * mobil ekran görüntüsü. Hepsi otomatik göstergedir; ziyaretten önce elle doğrulanır.
 * E-posta bilerek yok (UWG §7).
 */
import React, { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, ScanSearch } from 'lucide-react';

type Verdict = 'active_likely' | 'closed_suspected' | 'unknown';
type VStatus = 'confirmed' | 'partial' | 'refuted' | 'unverified';

interface SiteProfile {
  ok: boolean;
  error?: string;
  framedFrom?: string | null;
  pages?: { kind: string; url: string }[];
  impressum?: { owners: { role: string; name: string }[]; legalForm: string | null; register: string | null; court: string | null; vatId: string | null };
  phones?: string[];
  socials?: { type: string; url: string }[];
  documents?: { label: string; url: string }[];
  structured?: { type: string | null; priceRange: string | null; cuisine: string | null; rating: { value: number; count: number } | null };
  brand?: { logo: string | null; colors: string[]; fonts: string[]; googleFontsInCss: boolean };
  images?: { url: string }[];
  verification?: Record<string, { status: VStatus; tr: string }>;
}

interface Profile {
  site: SiteProfile | null;
  hours: { source: 'jsonld' | 'text' | 'osm'; lines: string[] } | null;
  osm: { ok: boolean; deleted?: boolean; tags?: Record<string, string>; lastEdit?: string | null } | null;
  wayback: { ok: boolean; captures?: boolean; first?: string; last?: string; unchangedSince?: string; unchangedOpenEnded?: boolean } | null;
  psi: { ok: boolean; error?: string; score?: number | null; lcp?: string | null; shot?: string | null } | null;
  activity: { verdict: Verdict; signals: { kind: 'open' | 'closed' | 'warn' | 'info'; tr: string }[] };
  ai: { ok: boolean; error?: string; summary_tr?: string; services_de?: string[]; highlights_tr?: string[] } | null;
}

interface Finding {
  code: string;
  tr: string;
}

const VERDICT: Record<Verdict, { label: string; cls: string }> = {
  active_likely: { label: 'Muhtemelen açık', cls: 'bg-emerald-100 text-emerald-800' },
  closed_suspected: { label: 'Kapanmış olabilir', cls: 'bg-red-100 text-red-800' },
  unknown: { label: 'Açık mı belirsiz', cls: 'bg-black/[0.06] text-[#515154]' },
};

const VSTATUS: Record<VStatus, { label: string; cls: string }> = {
  confirmed: { label: 'Doğrulandı', cls: 'bg-emerald-100 text-emerald-800' },
  partial: { label: 'Kısmen', cls: 'bg-amber-100 text-amber-800' },
  refuted: { label: 'Yanlış alarm', cls: 'bg-red-100 text-red-800' },
  unverified: { label: 'Elle kontrol', cls: 'bg-black/[0.06] text-[#515154]' },
};

const SIGNAL_DOT = { open: 'bg-emerald-500', closed: 'bg-red-500', warn: 'bg-amber-500', info: 'bg-[#A1A1A6]' } as const;
const HOURS_SOURCE = { jsonld: 'site (yapılandırılmış veri)', text: 'site metni', osm: 'OpenStreetMap' } as const;
const SOCIAL_LABEL: Record<string, string> = {
  facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn', xing: 'XING', tripadvisor: 'Tripadvisor', lieferando: 'Lieferando', googlemaps: 'Google Maps',
};
const OSM_LABEL: Record<string, string> = {
  operator: 'İşletmeci', cuisine: 'Mutfak', wheelchair: 'Tekerlekli sandalye', outdoor_seating: 'Dış mekân', takeaway: 'Paket servis', delivery: 'Eve servis', start_date: 'Açılış',
};
const PSI_ERROR: Record<string, string> = {
  quota: 'Google PageSpeed günlük kotası doldu. Sunucuya ücretsiz bir PSI_API_KEY tanımlanırsa ekran görüntüsü ve hız puanı gelir.',
  timeout: 'Google PageSpeed zaman aşımına uğradı; yeniden tarayın.',
};

const trDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-[#6E6E73]">{label}</dt>
      <dd className="min-w-0 text-[#1D1D1F] break-words">{children}</dd>
    </div>
  );
}

export default function ProspectProfile({
  prospect,
  findings,
  jobRunning,
  refreshKey,
  onEnrich,
}: {
  prospect: { id: number; name: string; address: string | null; city: string };
  findings: Finding[];
  jobRunning: boolean;
  /** Bir arka plan işi bittiğinde artar: profil yeniden okunur. */
  refreshKey: number;
  onEnrich: (id: number) => void;
}) {
  const [state, setState] = useState<{ loading: boolean; error?: string; profile?: Profile | null; enrichedAt?: string }>({ loading: true });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/prospects?view=profile&id=${prospect.id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j?.success) setState({ loading: false, error: j?.error || 'Profil okunamadı.' });
        else setState({ loading: false, profile: j.profile ?? null, enrichedAt: j.enriched_at });
      })
      .catch(() => { if (!cancelled) setState({ loading: false, error: 'Profil okunamadı.' }); });
    return () => { cancelled = true; };
  }, [prospect.id, refreshKey]);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([prospect.name, prospect.address || prospect.city].filter(Boolean).join(', '))}`;
  const enrichBtn = (label: string) => (
    <button
      type="button"
      disabled={jobRunning}
      onClick={() => onEnrich(prospect.id)}
      className="apple-pill-btn-secondary shrink-0 px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
    >
      {jobRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <ScanSearch className="w-3.5 h-3.5" aria-hidden="true" />}
      <span>{jobRunning ? 'Çalışıyor…' : label}</span>
    </button>
  );

  if (state.loading) return <div className="p-3.5 rounded-xl border border-black/[0.06] text-[#6E6E73]">Derin profil yükleniyor…</div>;
  if (state.error) return <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-800">{state.error}</div>;

  const p = state.profile;
  if (!p) {
    return (
      <div className="p-3.5 rounded-xl border border-dashed border-black/[0.15] flex items-center justify-between gap-3">
        <span className="text-[#515154] leading-relaxed">
          <strong className="text-[#1D1D1F]">Derin profil henüz çıkarılmadı.</strong> Site birkaç sayfa gezilir, bulgular doğrulanır, yetkili ve
          çalışma saatleri aranır, işletmenin açık olup olmadığına dair işaretler toplanır (yaklaşık 20–60 sn).
        </span>
        {enrichBtn('Derin tara')}
      </div>
    );
  }

  const site = p.site;
  const imp = site?.ok ? site.impressum : undefined;
  const verdict = VERDICT[p.activity.verdict];
  const osmTags = p.osm?.tags ?? {};
  const osmExtras = Object.entries(OSM_LABEL).filter(([k]) => osmTags[k]);
  const verification = site?.ok ? site.verification ?? {} : {};
  const hasCompany = Boolean(imp && (imp.owners.length || imp.legalForm || imp.register || imp.vatId));

  return (
    <section aria-label="Derin profil" className="rounded-xl border border-black/[0.08] overflow-hidden">
      <header className="px-3.5 py-2.5 bg-[#F5F5F7] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-[#1D1D1F]">Derin profil</strong>
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${verdict.cls}`}>{verdict.label}</span>
          <span className="text-[11px] text-[#6E6E73]">{trDate(state.enrichedAt?.replace(' ', 'T') + 'Z')}</span>
        </div>
        {enrichBtn('Yeniden tara')}
      </header>

      <div className="p-3.5 space-y-4">
        {/* Açık mı? */}
        <div>
          <ul className="space-y-1">
            {p.activity.signals.map((s) => (
              <li key={s.tr} className="flex items-start gap-2">
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${SIGNAL_DOT[s.kind]}`} aria-hidden="true" />
                <span className="text-[#1D1D1F]">{s.tr}</span>
              </li>
            ))}
          </ul>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[#0071E3] font-semibold hover:underline">
            <span>Google Maps’te açık/kapalı durumunu doğrula</span>
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
          <p className="text-[11px] text-[#6E6E73] mt-1">Bu bir tahmindir; kesin bilgi için ziyaretten önce Google Maps’e bakın.</p>
        </div>

        {/* Yapay zekâ özeti */}
        {p.ai?.ok && p.ai.summary_tr && (
          <div className="p-3 rounded-lg bg-[#0071E3]/[0.06]">
            <p className="text-[#1D1D1F] leading-relaxed">{p.ai.summary_tr}</p>
            {(p.ai.services_de?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1 mt-2" lang="de">
                {p.ai.services_de!.map((s) => <span key={s} className="px-2 py-0.5 rounded-full bg-white text-[#515154] text-[11px]">{s}</span>)}
              </div>
            )}
            {(p.ai.highlights_tr?.length ?? 0) > 0 && (
              <ul className="mt-2 list-disc pl-4 text-[#515154] space-y-0.5">
                {p.ai.highlights_tr!.map((h) => <li key={h}>{h}</li>)}
              </ul>
            )}
            <p className="text-[11px] text-[#6E6E73] mt-2">Yapay zekâ özeti (site metninden); görüşmeden önce siteye göz atın.</p>
          </div>
        )}

        {/* İşletme / yetkili */}
        <dl className="space-y-1.5">
          {imp?.owners.map((o) => (
            <Row key={o.name} label={o.role}><strong>{o.name}</strong></Row>
          ))}
          {!imp?.owners.length && osmTags.operator && <Row label="İşletmeci (OSM)"><strong>{osmTags.operator}</strong></Row>}
          {imp?.legalForm && <Row label="Hukuki form">{imp.legalForm}</Row>}
          {imp?.register && <Row label="Sicil">{imp.register}{imp.court ? ` · Amtsgericht ${imp.court}` : ''}</Row>}
          {imp?.vatId && <Row label="USt-IdNr.">{imp.vatId}</Row>}
          {site?.ok && !hasCompany && <Row label="Yetkili">Impressum’da otomatik bulunamadı; siteden elle bakın.</Row>}
          {p.hours && (
            <Row label="Çalışma saatleri">
              <span lang="de">{p.hours.lines.map((l) => <span key={l} className="block">{l}</span>)}</span>
              <span className="block text-[11px] text-[#6E6E73]">Kaynak: {HOURS_SOURCE[p.hours.source]}</span>
            </Row>
          )}
          {site?.ok && (site.phones?.length ?? 0) > 0 && <Row label="Sitedeki telefon">{site.phones!.join(' · ')}</Row>}
          {site?.ok && site.structured?.rating && <Row label="Sitedeki puan">{site.structured.rating.value} ({site.structured.rating.count} yorum)</Row>}
          {osmExtras.filter(([k]) => k !== 'operator' || imp?.owners.length).map(([k, label]) => (
            <Row key={k} label={label}><span lang="de">{osmTags[k]}</span></Row>
          ))}
        </dl>

        {/* Bulgu doğrulaması */}
        {findings.some((f) => verification[f.code]) && (
          <div>
            <span className="text-[#6E6E73] block mb-1.5">Bulguların doğrulaması</span>
            <ul className="space-y-1.5">
              {findings.filter((f) => verification[f.code]).map((f) => {
                const v = verification[f.code];
                return (
                  <li key={f.code} className="flex items-start gap-2">
                    <span className={`shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${VSTATUS[v.status].cls}`}>{VSTATUS[v.status].label}</span>
                    <span>
                      <span className="text-[#1D1D1F] font-semibold">{f.tr}</span>
                      <span className="block text-[#6E6E73] text-[11px]">{v.tr}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Site durumu */}
        {site && (
          <div className="flex gap-3">
            {p.psi?.ok && p.psi.shot && (
              // eslint-disable-next-line @next/next/no-img-element -- yetkili API rotasından gelen yerel dosya
              <img
                src={`/api/admin/prospects?view=shot&id=${prospect.id}&t=${encodeURIComponent(state.enrichedAt ?? '')}`}
                alt={`${prospect.name} sitesinin telefondaki görünümü`}
                className="w-28 shrink-0 self-start rounded-lg border border-black/[0.1]"
              />
            )}
            <dl className="space-y-1.5 min-w-0 flex-1">
              {!site.ok && (
                <Row label="Site">
                  {site.error === 'placeholder'
                    ? 'Alan adında gerçek bir site yok (boş, “yakında” ya da park sayfası): aday “Yeni site” teklifine alındı.'
                    : `Gezilemedi (${site.error}).`}
                </Row>
              )}
              {site.ok && <Row label="Gezilen sayfa">{site.pages?.length ?? 0} ({site.pages?.map((pg) => pg.kind).join(', ')})</Row>}
              {site.ok && site.framedFrom && (
                <Row label="Barındırma">Alan adı, içeriği <strong>{site.framedFrom}</strong> üzerindeki bir sayfadan çerçeveyle gösteriyor (site işletmenin kendi elinde olmayabilir).</Row>
              )}
              {p.psi?.ok && p.psi.score !== null && p.psi.score !== undefined && (
                <Row label="Mobil hız">{p.psi.score}/100{p.psi.lcp ? ` · en büyük öğe ${p.psi.lcp}` : ''} <span className="text-[#6E6E73]">(Google PageSpeed)</span></Row>
              )}
              {p.psi && !p.psi.ok && <Row label="Mobil hız"><span className="text-[#6E6E73]">{PSI_ERROR[p.psi.error ?? ''] ?? `Ölçülemedi (${p.psi.error}).`}</span></Row>}
              {p.wayback?.ok && p.wayback.captures && (
                <Row label="Arşiv">
                  İlk kayıt {trDate(p.wayback.first)}
                  {p.wayback.unchangedSince && (
                    <span className="block">
                      Ana sayfa {p.wayback.unchangedOpenEnded ? 'en az ' : 'yaklaşık '}<strong>{trDate(p.wayback.unchangedSince)}</strong> tarihinden beri aynı görünüyor
                    </span>
                  )}
                  <span className="block text-[11px] text-[#6E6E73]">Kaynak: Internet Archive; ziyaretçi sayacı gibi küçük değişiklikler tarihi yanıltabilir.</span>
                </Row>
              )}
              {site.ok && (site.socials?.length || site.documents?.length) ? (
                <Row label="Bağlantılar">
                  <span className="flex flex-wrap gap-x-3 gap-y-1">
                    {site.socials?.map((s) => (
                      <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#0071E3] font-semibold hover:underline">{SOCIAL_LABEL[s.type] ?? s.type}</a>
                    ))}
                    {site.documents?.map((d) => (
                      <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer" className="text-[#0071E3] hover:underline">{d.label.slice(0, 30)} (PDF)</a>
                    ))}
                  </span>
                </Row>
              ) : null}
              {site.ok && site.brand && (site.brand.colors.length > 0 || site.brand.fonts.length > 0 || site.brand.logo) && (
                <Row label="Marka">
                  <span className="flex flex-wrap items-center gap-1.5">
                    {site.brand.colors.map((c) => (
                      <span key={c} title={c} className="w-4 h-4 rounded border border-black/[0.15]" style={{ backgroundColor: c }} />
                    ))}
                    {site.brand.fonts.length > 0 && <span className="text-[#515154]">{site.brand.fonts.join(', ')}</span>}
                    {site.brand.logo && (
                      <a href={site.brand.logo} target="_blank" rel="noopener noreferrer" className="text-[#0071E3] hover:underline">Logo</a>
                    )}
                  </span>
                  <span className="block text-[11px] text-[#6E6E73]">{site.images?.length ?? 0} görsel bulundu (şablon taslağı için).</span>
                </Row>
              )}
            </dl>
          </div>
        )}
        {!site && (
          <p className="text-[#6E6E73]">Kayıtlı bir web sitesi olmadığı için yalnızca OpenStreetMap bilgileri var.</p>
        )}
      </div>
    </section>
  );
}
