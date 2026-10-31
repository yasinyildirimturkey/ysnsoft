'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Check, 
  Clock, 
  ShieldCheck, 
  Cpu 
} from 'lucide-react';

interface ProjectCalculatorProps {
  onConfigureSubmit: (summary: string) => void;
}

interface ProjectType {
  id: string;
  name: string;
  baseWeeks: number;
  recommendedStack: string;
}

const PROJECT_TYPES: ProjectType[] = [
  { id: 'kglex', name: 'KGLEX Hukuk & UYAP Robotu', baseWeeks: 4, recommendedStack: 'Next.js 16 + Python UYAP Bot + PostgreSQL' },
  { id: 'hg', name: 'HG Avukatlık / Açıkel Law Portalı', baseWeeks: 3, recommendedStack: 'Next.js 16 + Çok Dilli Müvekkil Portalı + Iyzico' },
  { id: 'harita', name: 'HaritaPlan 3D CBS & İmar Motoru', baseWeeks: 5, recommendedStack: 'Next.js 15 + Three.js + Leaflet CAD' },
  { id: 'panelde', name: 'Panelde Multi-Tenant SaaS Portalı', baseWeeks: 6, recommendedStack: 'Express 4 + Next.js + Socket.IO + MariaDB' },
  { id: 'ecommerce', name: 'Flamantyou / Samatya E-Ticaret & AI', baseWeeks: 4, recommendedStack: 'Next.js 16 + AI Cilt/QR Sipariş + Iyzico' },
  { id: 'tourism', name: 'Bodrum Lüks Rezervasyon & VIP Concierge', baseWeeks: 4, recommendedStack: 'Next.js + Stripe Global + Harita Entegrasyonu' },
  { id: 'custom', name: 'Şirketinize Özel Anahtar Teslim Yazılım', baseWeeks: 6, recommendedStack: 'React Native / Flutter + Golang / Node.js' }
];

const SCALES = [
  { id: 'startup', name: 'KOBİ / Girişim Ölçeği', multiplier: 1, desc: 'Hızlı canlıya geçiş ve temel modüller' },
  { id: 'growth', name: 'Büyüyen Kurumsal', multiplier: 1.3, desc: 'Yüksek işlem hacmi ve çift yönlü API' },
  { id: 'enterprise', name: 'Holding & Çoklu Şube', multiplier: 1.8, desc: 'Multi-tenant, tam yedekli ve 7/24 SLA' }
];

const ADDONS = [
  { id: 'ai-bot', name: 'Yapay Zeka Asistanı & Otonom Bot', weeks: 1 },
  { id: 'payment-efat', name: 'Sanal POS, GİB E-Fatura & E-İmza', weeks: 1 },
  { id: 'mobile-app', name: 'iOS & Android Native Mobil Ek', weeks: 3 },
  { id: 'multilang', name: 'Çoklu Dil & Küresel Para Birimi', weeks: 0.5 },
  { id: 'data-migration', name: 'Eski Sistemden %100 Veri Aktarımı', weeks: 0.5 },
  { id: 'sla', name: '7/24 Kesintisiz SLA & Mühendislik', weeks: 0 }
];

export default function ProjectCalculator({ onConfigureSubmit }: ProjectCalculatorProps) {
  const [selectedType, setSelectedType] = useState<string>('kglex');
  const [selectedScale, setSelectedScale] = useState<string>('growth');
  const [selectedAddons, setSelectedAddons] = useState<string[]>(['payment-efat', 'ai-bot']);

  const toggleAddon = (addonId: string) => {
    setSelectedAddons(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId) 
        : [...prev, addonId]
    );
  };

  const currentType = PROJECT_TYPES.find(t => t.id === selectedType) || PROJECT_TYPES[0];
  const currentScale = SCALES.find(s => s.id === selectedScale) || SCALES[1];

  const addonWeeks = selectedAddons.reduce((acc, id) => {
    const addon = ADDONS.find(a => a.id === id);
    return acc + (addon ? addon.weeks : 0);
  }, 0);

  const estimatedWeeks = Math.round((currentType.baseWeeks + addonWeeks) * currentScale.multiplier);

  const handleProceed = () => {
    const addonNames = selectedAddons.map(id => ADDONS.find(a => a.id === id)?.name).filter(Boolean);
    const summary = `${currentType.name} (${currentScale.name}) | Ekler: ${addonNames.join(', ')} | Süre: ${estimatedWeeks} Hafta`;
    onConfigureSubmit(summary);
  };

  return (
    <section id="calculator" className="py-24 bg-white border-y border-black/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F5F7] border border-black/[0.08] text-xs font-semibold text-[#1D1D1F] mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#0071E3]" />
            <span>İnteraktif Proje Yapılandırıcı</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#1D1D1F] mb-4">
            Projenizi yapılandırın, <br />
            <span className="text-[#0071E3]">anında süre ve mimari alın.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#6E6E73]">
            İster KGLEX veya HaritaPlan benzeri bir SaaS mimarisi, ister Flamantyou tarzı bir e-ticaret platformu tasarlayın.
          </p>
        </div>

        {/* Configurator Box */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Choices (7 Cols) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Step 1: Project Type */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#86868B] block mb-3">
                1. Yazılım / SaaS Türünü Seçin
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PROJECT_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`p-4 rounded-2xl text-left border transition-all ${
                      selectedType === type.id
                        ? 'bg-[#F5F5F7] border-[#0071E3] ring-2 ring-[#0071E3]/20'
                        : 'bg-white border-black/[0.08] hover:border-black/[0.2]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-[#1D1D1F]">{type.name}</span>
                      {selectedType === type.id && (
                        <span className="w-5 h-5 rounded-full bg-[#0071E3] text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#86868B]">Önerilen: {type.recommendedStack.split('+')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Company Scale */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#86868B] block mb-3">
                2. Şirket & Kullanıcı Ölçeği
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SCALES.map(scale => (
                  <button
                    key={scale.id}
                    onClick={() => setSelectedScale(scale.id)}
                    className={`p-4 rounded-2xl text-left border transition-all ${
                      selectedScale === scale.id
                        ? 'bg-[#F5F5F7] border-[#0071E3] ring-2 ring-[#0071E3]/20'
                        : 'bg-white border-black/[0.08] hover:border-black/[0.2]'
                    }`}
                  >
                    <span className="text-sm font-semibold text-[#1D1D1F] block mb-1">{scale.name}</span>
                    <span className="text-xs text-[#86868B] leading-tight block">{scale.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Add-on Modules */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#86868B] block mb-3">
                3. Ek Modüller & Entegrasyonlar
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ADDONS.map(addon => {
                  const isChecked = selectedAddons.includes(addon.id);
                  return (
                    <div
                      key={addon.id}
                      onClick={() => toggleAddon(addon.id)}
                      className={`p-3.5 rounded-2xl cursor-pointer border flex items-center justify-between transition-all ${
                        isChecked 
                          ? 'bg-[#F5F5F7] border-[#0071E3]/60' 
                          : 'bg-white border-black/[0.08] hover:border-black/[0.15]'
                      }`}
                    >
                      <span className="text-xs font-medium text-[#1D1D1F]">{addon.name}</span>
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        isChecked ? 'bg-[#0071E3] border-[#0071E3] text-white' : 'border-black/20 bg-white'
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Dynamic Output Card (5 Cols) */}
          <div className="lg:col-span-5 sticky top-28">
            <div className="apple-card p-6 sm:p-8 bg-[#F5F5F7] border border-black/[0.08]">
              <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] mb-6">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">
                  Canlı Yapılandırma Özeti
                </span>
                <span className="text-xs font-semibold text-[#10B981] bg-[#10B981]/10 px-2.5 py-0.5 rounded-full">
                  Hazır
                </span>
              </div>

              {/* Selected Type & Scale */}
              <div className="mb-6">
                <span className="text-xs text-[#86868B]">Seçilen Altyapı</span>
                <h4 className="text-xl font-semibold text-[#1D1D1F] mt-0.5">{currentType.name}</h4>
                <p className="text-xs text-[#6E6E73] mt-1">{currentScale.name}</p>
              </div>

              {/* Estimated Timeline */}
              <div className="bg-white p-4 rounded-2xl border border-black/[0.06] mb-6 shadow-xs">
                <div className="flex items-center gap-2 text-xs text-[#86868B] mb-1">
                  <Clock className="w-4 h-4 text-[#0071E3]" />
                  <span>Tahmini Canlıya Alış Süresi</span>
                </div>
                <div className="text-2xl sm:text-3xl font-semibold text-[#1D1D1F]">
                  {estimatedWeeks - 1} - {estimatedWeeks + 1} Hafta
                </div>
                <p className="text-[11px] text-[#86868B] mt-1">
                  Sprint bazlı haftalık test ortamı ve aşamalı teslimat dahildir.
                </p>
              </div>

              {/* Architecture Blueprint */}
              <div className="bg-white p-4 rounded-2xl border border-black/[0.06] mb-6 shadow-xs">
                <div className="flex items-center gap-2 text-xs text-[#86868B] mb-1">
                  <Cpu className="w-4 h-4 text-[#8B5CF6]" />
                  <span>Önerilen Mimari Yığın</span>
                </div>
                <p className="text-xs font-semibold text-[#1D1D1F] mt-1">
                  {currentType.recommendedStack}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#10B981] font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Bulut Yedekleme & SSL Koruması Dahil</span>
                </div>
              </div>

              {/* CTA Action */}
              <button
                onClick={handleProceed}
                className="w-full apple-pill-btn py-4 text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-[#0071E3]/25"
              >
                <span>Bu Yapılandırma İçin Teklif Al</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-center text-[11px] text-[#86868B] mt-3">
                Ücretsiz teknik danışmanlık ve 24 saat içinde detaylı teklif dökümü.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
