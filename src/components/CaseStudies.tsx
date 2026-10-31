'use client';

import React, { useState } from 'react';
import { 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  Scale, 
  Compass, 
  ShoppingBag, 
  Layers, 
  ChevronRight,
  CheckCircle2
} from 'lucide-react';

interface CaseStudy {
  id: string;
  client: string;
  sector: string;
  productUsed: string;
  title: string;
  summary: string;
  before: string;
  after: string;
  kpis: { label: string; value: string; growth: string }[];
  quote: string;
  author: string;
  role: string;
}

const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'kglex-case',
    client: 'Güler & Hukuk Bürosu Grubu',
    sector: 'Hukuk & Avukatlık (Ankara / İstanbul)',
    productUsed: 'KGLEX LegalTech AI + UYAP Robotu',
    title: '4 Avukatın Günlük 4 Saatlik UYAP Dosya Taraması 0 Dakikaya İndirildi',
    summary: '3.000’den fazla aktif dava ve icra dosyasının manuel taranması sırasında kaçan tebligatlar ve süre riskleri, KGLEX otonom Python robotu ile tamamen ortadan kaldırıldı.',
    before: 'Her sabah 4 avukat ve 2 asistan saat 09:00 - 13:00 arası UYAP portallarını manuel açıp evrak arıyordu. Süre kaçırma stresi ve yüksek iş gücü kaybı vardı.',
    after: 'KGLEX UYAP robotu 7/24 arka planda dosyaları tarayıp yeni evrakları, duruşma günlerini ve tebligatları avukatların cep telefonuna anlık SMS ve bildirim olarak iletiyor.',
    kpis: [
      { label: 'Haftalık Kurtarılan İş Gücü', value: '64 Saat', growth: '+%100' },
      { label: 'Kaçırılan Süre & Tebligat', value: 'Sıfır Hata', growth: '%0 Risk' },
      { label: 'Tahsilat Hızı', value: '3 Kat', growth: '+%200' }
    ],
    quote: 'UYAP robotu ofisimize girdiğinden beri tek bir süreli işi bile kaçırmadık. Müvekkillerimiz ise kendi portallarından dava aşamalarını canlı izleyebiliyor.',
    author: 'Av. Kemal Güler',
    role: 'Yönetici Avukat'
  },
  {
    id: 'harita-case',
    client: 'Çetinkaya Harita & İmar Planlama A.Ş.',
    sector: 'Harita Mühendisliği & CBS',
    productUsed: 'HaritaPlan / GeoPlan 3D CBS',
    title: '3194 Md. 18 DOP ve Dağıtım Cetveli Hazırlığı 3 Haftadan 1 Güne Düştü',
    summary: 'Yüzlerce malikin bulunduğu 140 dönümlük arazi düzenleme projesinde, Netcad ve DXF dosyaları doğrudan sisteme aktarılarak kanuni %40 DOP dağıtımı otomatik yapıldı.',
    before: 'Eski masaüstü programlarda ve Excel tablolarında günler süren manuel DOP hesapları, kadastro kaymaları ve encümen belgeleri için tek tek çıktı alma zorunluluğu.',
    after: 'HaritaPlan 3194 motoru ile Netcad dosyası yüklendi; 1.2 saniyede encümen teklif belgesi, askı tutanağı ve dağıtım cetvelleri resmi HKMO formatında üretildi.',
    kpis: [
      { label: 'Proje Teslim Süresi', value: '1 Gün', growth: '-%90' },
      { label: 'CAD Dosya Uyumu', value: '%100 DXF/NCN', growth: 'Kayıpsız' },
      { label: 'Belediye Onay Hızı', value: '2 Kat Hızlı', growth: '+%100' }
    ],
    quote: 'HaritaPlan sadece hesap yapmıyor, 3D WebGL stüdyosuyla arazinin eğimini ve bina gabarisini belediye meclisine canlı sunmamızı sağladı.',
    author: 'Harun Çetinkaya',
    role: 'Baş Harita Mühendisi'
  },
  {
    id: 'flamant-case',
    client: 'Flamantyou Beauty & Kozmetik',
    sector: 'Kozmetik E-Ticaret & AI',
    productUsed: 'Flamantyou AI Cilt Analizi & Headless Store',
    title: 'Kamera ile Cilt Analizi Aracı E-Ticarete Eklendi; Sepet Dönüşümü %42 Arttı',
    summary: 'Klasik ürün sayfalarında yaşanan yüksek sepet terk oranını kırmak için yapay zeka tabanlı cilt analiz motoru devreye alındı.',
    before: 'Müşteriler hangi kremin veya serumun ciltlerine uygun olduğunu bilemediği için kararsız kalıp siteden ayrılıyordu. Sepet dönüşümü %1.8 seviyesindeydi.',
    after: 'Kullanıcılar telefon kamerasıyla yüzlerini taratarak 10 saniyede cilt raporu ve kendilerine özel bakım reçetesi alıyor. Reçetedeki ürünler tek tıkla sepete ekleniyor.',
    kpis: [
      { label: 'Sepet Dönüşüm Oranı', value: '%4.8', growth: '+%42' },
      { label: 'Aylık Cilt Analizi Sayısı', value: '120.000+', growth: 'Viral Büyüme' },
      { label: 'Ortalama Sepet Tutarı', value: '₺1.850', growth: '+%35' }
    ],
    quote: 'Müşterilerimize sadece ürün değil, kişisel bir dermatolog deneyimi sunduk. YSNSOFT’un geliştirdiği AI algoritması satışlarımızın lokomotifi oldu.',
    author: 'Gülşah Vural',
    role: 'Kurucu Ortak'
  },
  {
    id: 'panelde-case',
    client: 'Marmara Emlak & Yatırım Ağı',
    sector: 'Gayrimenkul & Multi-Tenant Portal',
    productUsed: 'Panelde Multi-Tenant SaaS Platformu',
    title: '1.500 Bağımsız Şube Tek Merkezden, 45 ms Gecikmeyle Senkronize Edildi',
    summary: 'Farklı şehirlerdeki yüzlerce ofisin ilan portföyü, müşteri talepleri ve anlık danışman sohbetleri Panelde altyapısıyla tek ekranda birleşti.',
    before: 'Her şubenin ayrı Excel dosyası veya birbirinden kopuk yazılımlar kullanması nedeniyle portföy paylaşımı yapılamıyor, mükerrer ilanlar çıkıyordu.',
    after: 'Panelde Multi-Tenant mimarisi ile tüm şubeler tek veritabanında kendi yetki sınırlarıyla çalışıyor; Socket.IO ile yeni bir talep düştüğünde tüm uygun danışmanlara 0.1 saniyede bildirim gidiyor.',
    kpis: [
      { label: 'Aktif Bağlı Şube', value: '1.500+', growth: 'Tek Altyapı' },
      { label: 'Talep Eşleşme Oranı', value: '%88', growth: '3 Kat Hızlı' },
      { label: 'API Yanıt Süresi', value: '45 ms', growth: 'Ultra Hızlı' }
    ],
    quote: 'Ofislerimizin birbirleriyle portföy paslaşması sayesinde işlem kapatma hızımız %65 arttı. Expo mobil uygulaması ise danışmanlarımızın sahadaki sağ kolu oldu.',
    author: 'Serdar Yıldırım',
    role: 'Ağ Direktörü'
  }
];

export default function CaseStudies({ onOpenContact }: { onOpenContact: (summary?: string) => void }) {
  const [activeTab, setActiveTab] = useState<string>('kglex-case');

  const currentStudy = CASE_STUDIES.find(c => c.id === activeTab) || CASE_STUDIES[0];

  return (
    <section className="py-24 bg-white border-b border-black/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F5F7] border border-black/[0.08] text-xs font-semibold text-[#1D1D1F] mb-4 shadow-xs">
            <TrendingUp className="w-3.5 h-3.5 text-[#0071E3]" />
            <span>Kanıtlanmış Sonuçlar & Vaka İncelemeleri</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#1D1D1F] mb-4">
            Gerçek projeler, <br />
            <span className="text-[#0071E3]">belgelenmiş dönüşüm hikayeleri.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#6E6E73]">
            Sektöründe lider şirketlerin YSNSOFT SaaS ürünleriyle nasıl hızlandığını ve karlılığını artırdığını adım adım inceleyin.
          </p>

          {/* Selector Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {CASE_STUDIES.map(study => (
              <button
                key={study.id}
                onClick={() => setActiveTab(study.id)}
                className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-full transition-all ${
                  activeTab === study.id
                    ? 'bg-[#1D1D1F] text-white shadow-xs'
                    : 'bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F] border border-black/[0.06]'
                }`}
              >
                {study.client.split(' ')[0]} ({study.productUsed.split(' ')[0]})
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Case Card */}
        <div className="apple-card bg-[#F5F5F7] p-6 sm:p-10 border border-black/[0.07] max-w-5xl mx-auto">
          
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-black/[0.06] mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-[#0071E3] bg-[#0071E3]/10 px-3 py-0.5 rounded-full">
                  {currentStudy.sector}
                </span>
                <span className="text-xs text-[#86868B] font-medium">
                  {currentStudy.productUsed}
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-semibold text-[#1D1D1F]">
                {currentStudy.client}
              </h3>
            </div>

            <button
              onClick={() => onOpenContact(`Vaka İncelemesi: ${currentStudy.client} (${currentStudy.productUsed})`)}
              className="apple-pill-btn px-5 py-2.5 text-xs font-medium flex items-center justify-center gap-2 self-start sm:self-center shrink-0"
            >
              <span>Benzer Çözüm İçin Teklif Al</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Headline & Summary */}
          <div className="mb-8">
            <h4 className="text-xl sm:text-2xl font-semibold text-[#1D1D1F] mb-3">
              "{currentStudy.title}"
            </h4>
            <p className="text-sm sm:text-base text-[#6E6E73] leading-relaxed">
              {currentStudy.summary}
            </p>
          </div>

          {/* Before & After Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-5 rounded-2xl border border-black/[0.06] shadow-2xs">
              <span className="text-xs font-bold text-[#FF5F56] uppercase tracking-wider block mb-2">
                Eski Durum & Zorluklar
              </span>
              <p className="text-xs sm:text-sm text-[#6E6E73] leading-relaxed">
                {currentStudy.before}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-black/[0.06] shadow-2xs">
              <span className="text-xs font-bold text-[#10B981] uppercase tracking-wider block mb-2">
                YSNSOFT İle Yeni Süreç
              </span>
              <p className="text-xs sm:text-sm text-[#1D1D1F] font-medium leading-relaxed">
                {currentStudy.after}
              </p>
            </div>
          </div>

          {/* KPI Numbers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {currentStudy.kpis.map((kpi, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-black/[0.06] shadow-2xs text-center">
                <span className="text-xs text-[#86868B] block mb-1">{kpi.label}</span>
                <div className="text-2xl sm:text-3xl font-bold text-[#1D1D1F]">{kpi.value}</div>
                <span className="text-[11px] font-semibold text-[#10B981] mt-1 inline-block">
                  {kpi.growth}
                </span>
              </div>
            ))}
          </div>

          {/* Quote Block */}
          <div className="p-5 bg-white rounded-2xl border border-black/[0.06] flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center shrink-0 font-bold text-sm">
              “
            </div>
            <div>
              <p className="text-xs sm:text-sm text-[#1D1D1F] italic leading-relaxed mb-2">
                "{currentStudy.quote}"
              </p>
              <div className="text-xs">
                <span className="font-semibold text-[#1D1D1F]">{currentStudy.author}</span>
                <span className="text-[#86868B]"> — {currentStudy.role}, {currentStudy.client}</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
