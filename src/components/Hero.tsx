'use client';

import React, { useState } from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  Scale, 
  Compass, 
  Layers, 
  Sparkle,
  Bot
} from 'lucide-react';

interface HeroProps {
  onOpenContact: (productName?: string) => void;
  onScrollTo: (id: string) => void;
  onSelectProduct: (productId: string) => void;
}

export default function Hero({ onOpenContact, onScrollTo, onSelectProduct }: HeroProps) {
  const [activeTab, setActiveTab] = useState<'kglex' | 'harita' | 'panelde' | 'ecommerce'>('kglex');

  return (
    <section id="hero" className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      {/* Apple-style background subtle ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[380px] bg-gradient-to-tr from-[#0071E3]/8 via-[#10B981]/5 to-transparent blur-[130px] pointer-events-none -z-10 rounded-full" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Apple Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <span className="flex h-2 w-2 rounded-full bg-[#0071E3] animate-pulse" />
          <span className="text-xs font-semibold text-[#1D1D1F] tracking-wide">
            YSNSOFT • Gerçek Projeler, Kanıtlanmış SaaS Başarısı
          </span>
          <span className="text-[#86868B] text-xs">|</span>
          <span className="text-xs font-medium text-[#0071E3] flex items-center gap-1">
            KGLEX · HaritaPlan · Panelde · Flamantyou <ArrowRight className="w-3 h-3" />
          </span>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-[#1D1D1F] max-w-4xl mx-auto leading-[1.08] mb-6">
          Hukuktan haritaya, e-ticaretten SaaS'a <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#1D1D1F] via-[#0071E3] to-[#10B981] bg-clip-text text-transparent">
            canlıda çalışan büyük yazılımlar.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-[#6E6E73] max-w-3xl mx-auto font-normal leading-relaxed mb-10">
          KGLEX UYAP robotundan HaritaPlan 3D CBS platformuna, Panelde çok kiracılı SaaS mimarisinden Flamantyou ve Samatya e-ticaretine kadar sektör lideri dijital ürünler inşa ediyoruz.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={() => onScrollTo('products')}
            className="w-full sm:w-auto apple-pill-btn px-8 py-4 text-base font-medium flex items-center justify-center gap-2.5 shadow-lg shadow-[#0071E3]/20"
          >
            <span>Canlı Ürün Portföyümüzü Gör</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onScrollTo('sandbox')}
            className="w-full sm:w-auto apple-pill-btn-secondary px-8 py-4 text-base font-medium flex items-center justify-center gap-2 border border-black/[0.08]"
          >
            <Sparkles className="w-4 h-4 text-[#0071E3]" />
            <span>Ürünleri Canlı Test Edin</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-medium text-[#86868B] mb-14">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0071E3]" />
            <span>450.000+ Aylık UYAP Sorgusu</span>
          </div>
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#10B981]" />
            <span>Netcad & AutoCAD DXF Uyumu</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#8B5CF6]" />
            <span>Multi-Tenant & ISO 27001 Güvenlik</span>
          </div>
        </div>

        {/* Interactive Apple-style Studio Display Mockup */}
        <div className="relative mx-auto max-w-5xl rounded-3xl bg-[#FFFFFF] border border-black/[0.08] p-3 sm:p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]">
          {/* Mac Window Header */}
          <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-black/[0.06] px-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
              <span className="ml-2 text-xs font-medium text-[#86868B] hidden sm:inline">
                production-suite.ysnsoft.com
              </span>
            </div>

            {/* Interactive Mockup Tabs */}
            <div className="flex items-center gap-1 bg-[#F5F5F7] p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('kglex')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  activeTab === 'kglex'
                    ? 'bg-white text-[#1D1D1F] shadow-sm'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                KGLEX Hukuk & UYAP
              </button>
              <button
                onClick={() => setActiveTab('harita')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  activeTab === 'harita'
                    ? 'bg-white text-[#1D1D1F] shadow-sm'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                HaritaPlan 3D CBS
              </button>
              <button
                onClick={() => setActiveTab('panelde')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  activeTab === 'panelde'
                    ? 'bg-white text-[#1D1D1F] shadow-sm'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                Panelde Multi-Tenant
              </button>
              <button
                onClick={() => setActiveTab('ecommerce')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  activeTab === 'ecommerce'
                    ? 'bg-white text-[#1D1D1F] shadow-sm'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                Flamantyou & Samatya
              </button>
            </div>

            <div className="text-[11px] text-[#10B981] font-semibold flex items-center gap-1.5 hidden sm:flex">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
              Canlıda Aktif
            </div>
          </div>

          {/* Tab 1: KGLEX LegalTech AI */}
          {activeTab === 'kglex' && (
            <div className="p-4 sm:p-6 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-black/[0.04]">
                  <span className="text-xs text-[#86868B] font-medium">Aktif Dava & İcra Dosyası</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-semibold text-[#1D1D1F]">18.420</span>
                    <span className="text-xs text-[#10B981] font-medium flex items-center">
                      <TrendingUp className="w-3 h-3 mr-0.5" /> %100 Senkron
                    </span>
                  </div>
                </div>

                <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-black/[0.04]">
                  <span className="text-xs text-[#86868B] font-medium">Otonom UYAP Taraması</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-semibold text-[#0071E3]">450.000+</span>
                    <span className="text-xs text-[#86868B] font-medium">Bu Ay</span>
                  </div>
                </div>

                <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-black/[0.04]">
                  <span className="text-xs text-[#86868B] font-medium">Tevkil & Arabuluculuk</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-semibold text-[#1D1D1F]">2.400 Avukat</span>
                    <span className="text-xs text-[#10B981] font-medium">81 İl Ağı</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#F5F5F7] p-5 rounded-2xl border border-black/[0.04] flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-xs text-[#6E6E73] leading-relaxed">
                  <span className="font-semibold text-[#1D1D1F] block text-sm mb-1">
                    KGLEX: Avukatlar ve Hukuk Büroları İçin Tam Otonom İşletim Sistemi
                  </span>
                  Duruşma ajandası, müvekkil sanal POS tahsilatı, KEP entegrasyonu ve yapay zeka mevzuat arama robotu.
                </div>
                <button
                  onClick={() => onSelectProduct('kglex-hukuk')}
                  className="apple-pill-btn px-5 py-2.5 text-xs font-medium whitespace-nowrap"
                >
                  KGLEX Detaylarını Aç
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: HaritaPlan 3D CBS */}
          {activeTab === 'harita' && (
            <div className="p-4 sm:p-6 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-black/[0.04]">
                  <span className="text-xs text-[#86868B] font-medium">3194 Md. 18 DOP Motoru</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-semibold text-[#10B981]">1.2 sn</span>
                    <span className="text-xs text-[#10B981] font-medium">Resmi Format</span>
                  </div>
                </div>

                <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-black/[0.04]">
                  <span className="text-xs text-[#86868B] font-medium">CAD Dosya Desteği</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-semibold text-[#1D1D1F]">Netcad & DXF</span>
                    <span className="text-xs text-[#0071E3] font-medium">Çift Yönlü</span>
                  </div>
                </div>

                <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-black/[0.04]">
                  <span className="text-xs text-[#86868B] font-medium">3D Gabari & Kesit</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-semibold text-[#1D1D1F]">Three.js WebGL</span>
                    <span className="text-xs text-[#86868B] font-medium">Tarayıcıda</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#F5F5F7] p-5 rounded-2xl border border-black/[0.04] flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-xs text-[#6E6E73] leading-relaxed">
                  <span className="font-semibold text-[#1D1D1F] block text-sm mb-1">
                    HaritaPlan: İmar, Kadastro ve Kamulaştırma Mühendisliği SaaS
                  </span>
                  İfraz, tevhid, terk hesapları, tapu harcı dökümü, kentsel dönüşüm %50+1 ve HKMO antetli teklif modülleri.
                </div>
                <button
                  onClick={() => onSelectProduct('haritaplan-geoplan')}
                  className="apple-pill-btn px-5 py-2.5 text-xs font-medium whitespace-nowrap"
                >
                  HaritaPlan İncele
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Panelde Multi-Tenant */}
          {activeTab === 'panelde' && (
            <div className="p-4 sm:p-6 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-black/[0.04]">
                  <span className="text-xs text-[#86868B] font-medium">Bağlı Ofis & Acente</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-semibold text-[#8B5CF6]">1.500+ Ofis</span>
                    <span className="text-xs text-[#86868B] font-medium">Multi-Tenant</span>
                  </div>
                </div>

                <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-black/[0.04]">
                  <span className="text-xs text-[#86868B] font-medium">Canlı Soket Bağlantısı</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-semibold text-[#1D1D1F]">25.000+</span>
                    <span className="text-xs text-[#10B981] font-medium">Socket.IO Anlık</span>
                  </div>
                </div>

                <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-black/[0.04]">
                  <span className="text-xs text-[#86868B] font-medium">Mobil & Web Senkronu</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-semibold text-[#0071E3]">Expo / RN</span>
                    <span className="text-xs text-[#86868B] font-medium">Tek API</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#F5F5F7] p-5 rounded-2xl border border-black/[0.04] flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-xs text-[#6E6E73] leading-relaxed">
                  <span className="font-semibold text-[#1D1D1F] block text-sm mb-1">
                    Panelde: Çok Kiracılı Emlak, İlan ve Kurumsal Müşteri Yönetim Platformu
                  </span>
                  Müşteri talep eşleme motoru, sanal POS, çoklu şube yetkilendirme ve otomatik e-fatura altyapısı.
                </div>
                <button
                  onClick={() => onSelectProduct('panelde-saas')}
                  className="apple-pill-btn px-5 py-2.5 text-xs font-medium whitespace-nowrap"
                >
                  Panelde Detayları
                </button>
              </div>
            </div>
          )}

          {/* Tab 4: Flamantyou & Samatya */}
          {activeTab === 'ecommerce' && (
            <div className="p-4 sm:p-6 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-black/[0.04]">
                  <span className="text-xs text-[#86868B] font-medium">AI Cilt Analizi (Flamantyou)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-semibold text-[#EC4899]">%94 İsabet</span>
                    <span className="text-xs text-[#10B981] font-medium">+%42 Sepet</span>
                  </div>
                </div>

                <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-black/[0.04]">
                  <span className="text-xs text-[#86868B] font-medium">Samatya Gurme & QR Sipariş</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-semibold text-[#F59E0B]">3.500 Sipariş/Gün</span>
                    <span className="text-xs text-[#86868B] font-medium">Soğuk Zincir</span>
                  </div>
                </div>

                <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-black/[0.04]">
                  <span className="text-xs text-[#86868B] font-medium">Dolphin Bodrum Rezervasyon</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-semibold text-[#0284C7]">€4.2M Hacim</span>
                    <span className="text-xs text-[#10B981] font-medium">Çok Dilli VIP</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#F5F5F7] p-5 rounded-2xl border border-black/[0.04] flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-xs text-[#6E6E73] leading-relaxed">
                  <span className="font-semibold text-[#1D1D1F] block text-sm mb-1">
                    Özel E-Ticaret, Restoran ve Turizm Lüks Çözümleri
                  </span>
                  Kamera ile AI cilt taraması, restoran masadan QR menü ve Bodrum lüks villa/transfer rezervasyon motorları.
                </div>
                <button
                  onClick={() => onSelectProduct('flamantyou-kozmetik')}
                  className="apple-pill-btn px-5 py-2.5 text-xs font-medium whitespace-nowrap"
                >
                  Flamantyou & Samatya İncele
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
