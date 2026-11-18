'use client';

import React, { useRef, useState } from 'react';
import { ArrowRight, Play, TrendingUp, ChevronRight } from 'lucide-react';

interface HeroProps {
  onOpenContact: (productName?: string) => void;
  onScrollTo: (id: string) => void;
  onSelectProduct: (productId: string) => void;
}

type Tone = 'ink' | 'blue' | 'green' | 'violet' | 'pink' | 'amber' | 'sky';

interface Stat {
  label: string;
  value: string;
  note: string;
  tone?: Tone;
  positive?: boolean;
}

interface Suite {
  id: string;
  tab: string;
  url: string;
  productId: string;
  title: string;
  desc: string;
  cta: string;
  stats: Stat[];
}

const TONE_CLASS: Record<Tone, string> = {
  ink: 'text-[#1D1D1F]',
  blue: 'text-[#0071E3]',
  green: 'text-[#0E9F6E]',
  violet: 'text-[#7C3AED]',
  pink: 'text-[#DB2777]',
  amber: 'text-[#B45309]',
  sky: 'text-[#0369A1]',
};

const SUITES: Suite[] = [
  {
    id: 'kglex',
    tab: 'KGLEX',
    url: 'kglex.com',
    productId: 'kglex-hukuk',
    title: 'Avukatlar ve hukuk büroları için tam otonom işletim sistemi',
    desc: 'Duruşma ajandası, müvekkil sanal POS tahsilatı, KEP entegrasyonu ve yapay zekâ mevzuat arama robotu.',
    cta: 'KGLEX detayları',
    stats: [
      { label: 'Dava & icra takibi', value: 'Tek panel', note: 'büro ekibi için', positive: true },
      { label: 'UYAP evrak taraması', value: 'Otomatik', note: 'arka planda', tone: 'blue' },
      { label: 'Müvekkil alanı', value: 'Web & mobil', note: 'dosya durumu', positive: true },
    ],
  },
  {
    id: 'harita',
    tab: 'HaritaPlan',
    url: 'haritaplan.com',
    productId: 'haritaplan-geoplan',
    title: 'İmar, kadastro ve kamulaştırma mühendisliği SaaS',
    desc: 'İfraz, tevhid, terk hesapları, tapu harcı dökümü, kentsel dönüşüm %50+1 ve HKMO antetli teklif modülleri.',
    cta: 'HaritaPlan detayları',
    stats: [
      { label: '3194 Md. 18 DOP hesabı', value: 'Otomatik', note: 'çıktılar kontrol edilmeli', tone: 'green', positive: true },
      { label: 'CAD dosya desteği', value: 'Netcad & DXF', note: 'çift yönlü' },
      { label: '3D gabari & kesit', value: 'Three.js WebGL', note: 'tarayıcıda' },
    ],
  },
  {
    id: 'panelde',
    tab: 'Panelde',
    url: 'panelde.com',
    productId: 'panelde-saas',
    title: 'Çok kiracılı emlak, ilan ve kurumsal müşteri yönetim platformu',
    desc: 'Müşteri talep eşleme motoru, sanal POS, çoklu şube yetkilendirme ve otomatik e-fatura altyapısı.',
    cta: 'Panelde detayları',
    stats: [
      { label: 'Ofis & şube yapısı', value: 'Çok kiracılı', note: 'her ofis ayrı', tone: 'violet' },
      { label: 'Canlı güncelleme', value: 'Socket.IO', note: 'anlık bildirim', positive: true },
      { label: 'Mobil & web senkronu', value: 'Expo / RN', note: 'tek API', tone: 'blue' },
    ],
  },
  {
    id: 'ecommerce',
    tab: 'E-Ticaret',
    url: 'flamantyou.com',
    productId: 'flamantyou-kozmetik',
    title: 'Özel e-ticaret, restoran ve turizm çözümleri',
    desc: 'Kamera ile AI cilt taraması, masadan QR menü siparişi ve Bodrum lüks villa/transfer rezervasyon motorları.',
    cta: 'Flamantyou & Samatya detayları',
    stats: [
      { label: 'AI cilt analizi · Flamantyou', value: 'Kamera ile', note: 'ürün önerisi', tone: 'pink', positive: true },
      { label: 'QR sipariş · Samatya', value: 'Masadan sipariş', note: 'B2B + B2C', tone: 'amber' },
      { label: 'Rezervasyon · Dolphin Bodrum', value: 'Villa & transfer', note: 'çok dilli', tone: 'sky', positive: true },
    ],
  },
];

const PROOF = [
  { value: 'Web & mobil', label: 'özel yazılım geliştirme' },
  { value: '8', label: 'canlı ürün ve portal' },
  { value: 'TR / EN / DE', label: 'çok dilli projeler' },
  { value: 'Doğrudan', label: 'geliştiriciyle iletişim' },
];

export default function Hero({ onOpenContact, onScrollTo, onSelectProduct }: HeroProps) {
  const [activeId, setActiveId] = useState<string>(SUITES[0].id);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const active = SUITES.find((s) => s.id === activeId) ?? SUITES[0];

  // Sekme şeridinde ok tuşlarıyla gezinme (WAI-ARIA tabs kalıbı)
  const onTabKeyDown = (e: React.KeyboardEvent) => {
    const i = SUITES.findIndex((s) => s.id === activeId);
    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % SUITES.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + SUITES.length) % SUITES.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = SUITES.length - 1;
    else return;
    e.preventDefault();
    setActiveId(SUITES[next].id);
    tabRefs.current[SUITES[next].id]?.focus();
  };

  return (
    <section id="hero" className="relative pt-32 pb-20 md:pt-44 md:pb-28 overflow-hidden">
      {/* Arka plan: nokta ızgarası + yumuşak ışık */}
      <div aria-hidden="true" className="absolute inset-0 hero-grid pointer-events-none -z-10" />
      <div
        aria-hidden="true"
        className="absolute top-24 left-1/2 -translate-x-1/2 w-[820px] max-w-full h-[420px] bg-gradient-to-tr from-[#0071E3]/10 via-[#10B981]/5 to-transparent blur-[120px] pointer-events-none -z-10 rounded-full"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Duyuru rozeti */}
        <button
          type="button"
          onClick={() => onScrollTo('live-sites')}
          className="group inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-white border border-black/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.04)] mb-8 hover:border-black/[0.16] transition-colors animate-in fade-in slide-in-from-bottom-3 duration-500"
        >
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#0E9F6E]/10 text-[#0B815A] text-[11px] font-semibold">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#0E9F6E] opacity-60 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#0E9F6E]" />
            </span>
            Canlıda
          </span>
          <span className="text-[13px] font-medium text-[#1D1D1F]">8 ürün gerçek alan adlarında yayında</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#6E6E73] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </button>

        {/* Ana başlık */}
        <h1 className="text-[2.5rem] sm:text-6xl lg:text-7xl font-semibold tracking-[-0.035em] text-[#1D1D1F] max-w-5xl mx-auto leading-[1.05] mb-6">
          Hukuktan haritaya, e&#8209;ticaretten SaaS&rsquo;a{' '}
          <span className="bg-gradient-to-r from-[#0071E3] to-[#0E9F6E] bg-clip-text text-transparent">
            canlıda çalışan yazılımlar.
          </span>
        </h1>

        {/* Alt başlık */}
        <p className="text-lg sm:text-xl text-[#515154] max-w-2xl mx-auto leading-relaxed mb-10">
          KGLEX UYAP robotu, HaritaPlan 3D CBS, Panelde çok kiracılı SaaS ve daha fazlası — fikri, canlıda çalışan ürüne dönüştürüyoruz.
        </p>

        {/* Birincil eylemler */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
          <button
            type="button"
            onClick={() => onOpenContact()}
            className="group w-full sm:w-auto apple-pill-btn px-7 py-3.5 text-base font-medium flex items-center justify-center gap-2 shadow-lg shadow-[#0071E3]/20"
          >
            <span>Projenizi Konuşalım</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onScrollTo('sandbox')}
            className="w-full sm:w-auto px-7 py-3.5 text-base font-medium flex items-center justify-center gap-2 rounded-full bg-white text-[#1D1D1F] border border-black/[0.1] hover:border-black/[0.2] hover:bg-white transition-colors"
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#1D1D1F] text-white">
              <Play className="w-2.5 h-2.5 fill-current translate-x-[0.5px]" aria-hidden="true" />
            </span>
            <span>Ürünleri Canlı Deneyin</span>
          </button>
        </div>

        {/* Ürün vitrini: tarayıcı penceresi */}
        <div className="relative mx-auto max-w-5xl">
          <div
            aria-hidden="true"
            className="absolute -inset-x-6 -bottom-8 top-10 bg-gradient-to-b from-[#0071E3]/10 to-transparent blur-3xl -z-10 rounded-[3rem]"
          />
          <div className="rounded-[1.75rem] bg-white border border-black/[0.08] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.18)] overflow-hidden text-left">
            {/* Pencere başlığı */}
            <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-black/[0.06] bg-[#FAFAFB]">
              <div className="hidden sm:flex items-center gap-1.5 shrink-0" aria-hidden="true">
                <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
              </div>

              <div
                role="tablist"
                aria-label="Ürün vitrini"
                onKeyDown={onTabKeyDown}
                className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar sm:justify-center"
              >
                <div className="inline-flex items-center gap-1 bg-black/[0.05] p-1 rounded-full">
                  {SUITES.map((s) => {
                    const selected = s.id === activeId;
                    return (
                      <button
                        key={s.id}
                        ref={(el) => {
                          tabRefs.current[s.id] = el;
                        }}
                        type="button"
                        role="tab"
                        id={`hero-tab-${s.id}`}
                        aria-selected={selected}
                        aria-controls="hero-tabpanel"
                        tabIndex={selected ? 0 : -1}
                        onClick={() => setActiveId(s.id)}
                        className={`px-3.5 py-1.5 text-[13px] font-medium rounded-full whitespace-nowrap transition-colors ${
                          selected
                            ? 'bg-white text-[#1D1D1F] shadow-sm'
                            : 'text-[#515154] hover:text-[#1D1D1F]'
                        }`}
                      >
                        {s.tab}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="hidden md:flex items-center gap-1.5 shrink-0 text-xs font-medium text-[#515154] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0E9F6E]" aria-hidden="true" />
                {active.url}
              </div>
            </div>

            {/* Sekme içeriği */}
            <div
              key={active.id}
              role="tabpanel"
              id="hero-tabpanel"
              aria-labelledby={`hero-tab-${active.id}`}
              className="p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-3 duration-300"
            >
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                {active.stats.map((stat) => (
                  <div key={stat.label} className="bg-[#F5F5F7] p-4 sm:p-5 rounded-2xl">
                    <dt className="text-xs text-[#6E6E73] font-medium">{stat.label}</dt>
                    <dd className="mt-2">
                      <span className={`block text-2xl font-semibold tracking-tight tabular ${TONE_CLASS[stat.tone ?? 'ink']}`}>
                        {stat.value}
                      </span>
                      <span
                        className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
                          stat.positive ? 'text-[#0B815A]' : 'text-[#6E6E73]'
                        }`}
                      >
                        {stat.positive && <TrendingUp className="w-3 h-3" aria-hidden="true" />}
                        {stat.note}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="bg-[#F5F5F7] p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-[#1D1D1F] text-[15px] mb-1">{active.title}</p>
                  <p className="text-[13px] text-[#515154] leading-relaxed">{active.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectProduct(active.productId)}
                  className="group shrink-0 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#1D1D1F] text-white text-[13px] font-medium whitespace-nowrap hover:bg-black transition-colors"
                >
                  {active.cta}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Kanıt şeridi */}
        <dl className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-y-8 max-w-4xl mx-auto md:divide-x md:divide-black/[0.08]">
          {PROOF.map((item) => (
            <div key={item.label} className="px-4 flex flex-col-reverse gap-1">
              <dt className="text-[13px] text-[#6E6E73]">{item.label}</dt>
              <dd className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1D1D1F] tabular">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
