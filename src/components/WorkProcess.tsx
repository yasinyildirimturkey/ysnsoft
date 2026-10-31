'use client';

import React, { useState } from 'react';
import { 
  Search, 
  Palette, 
  Code2, 
  Rocket, 
  CheckCircle2, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';

const STEPS = [
  {
    step: '01',
    title: 'Teknik Keşif & Süreç Analizi',
    badge: '24-48 Saat',
    icon: Search,
    color: '#0071E3',
    summary: 'Mevcut verilerinizi, muhasebe/UYAP/CAD iş akışlarınızı ve hedeflerinizi dinleyip şirketinize özel mimari yol haritası çıkarıyoruz.',
    deliverables: [
      'Mevcut veritabanı ve veri aktarım fizibilite raporu',
      'Önerilen bulut/sunucu mimarisi ve güvenlik planı',
      'Kesin bütçe ve aşamalı sprint takvimi dökümü'
    ]
  },
  {
    step: '02',
    title: 'Apple UI/UX & İnteraktif Prototip',
    badge: '1. Hafta',
    icon: Palette,
    color: '#8B5CF6',
    summary: 'Figma üzerinde tasarlanan akıcı ekranları doğrudan tarayıcınızda tıklanabilir prototip olarak testinize sunuyoruz.',
    deliverables: [
      'Masaüstü, tablet ve mobil uyumlu squircle arayüzler',
      'Kullanıcı rol ve yetkilendirme akış şemaları',
      'Geri bildirimlerinize göre revizyon ve tam tasarım onayı'
    ]
  },
  {
    step: '03',
    title: 'Çevik (Agile) Geliştirme & Canlı Sprintler',
    badge: 'Haftalık Demolar',
    icon: Code2,
    color: '#10B981',
    summary: 'Next.js 16, Python robotları ve mikroservislerle kodlama başlar; her cuma canlı test ortamında ilerlemeyi izlersiniz.',
    deliverables: [
      'Temiz, belgelenmiş ve tip güvenli (TypeScript) kod tabanı',
      'UYAP, Sanal POS, E-Fatura veya CAD API entegrasyonları',
      'Otomatik birim ve uçtan uca (Playwright) güvenlik testleri'
    ]
  },
  {
    step: '04',
    title: 'Kayıpsız Canlıya Geçiş & 7/24 Destek',
    badge: 'Kesintisiz Yayım',
    icon: Rocket,
    color: '#F59E0B',
    summary: 'Mevcut sisteminizden eski veriler aktarılır, SSL ve bulut kalkanları devreye alınır; ekibiniz eğitimle hemen kullanmaya başlar.',
    deliverables: [
      'Sıfır veri kaybıyla eski sistemden (Logo/Mikro vb.) aktarım',
      'Ekip eğitim videoları ve yönetici kullanım kılavuzları',
      'Sözleşmeli %99.99 SLA garantisi ve 7/24 teknik mühendislik'
    ]
  }
];

export default function WorkProcess({ onOpenContact }: { onOpenContact: () => void }) {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section className="py-24 bg-white border-b border-black/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F5F7] border border-black/[0.08] text-xs font-semibold text-[#1D1D1F] mb-4 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-[#0071E3]" />
            <span>Şeffaf & Hızlı İş Süreci</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#1D1D1F] mb-4">
            Fikirden canlı sisteme, <br />
            <span className="text-[#0071E3]">4 adımda pürüzsüz geçiş.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#6E6E73]">
            Sürpriz maliyetler veya aylar süren belirsizlikler yok. Şeffaf sprintler ve haftalık canlı test ortamlarıyla projenizi zamanında teslim ediyoruz.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isSelected = activeStep === idx;
            return (
              <div
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`apple-card p-6 cursor-pointer border transition-all flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-white border-[#0071E3] ring-2 ring-[#0071E3]/20 shadow-md -translate-y-1' 
                    : 'bg-[#F5F5F7] border-black/[0.06] hover:bg-white hover:border-black/[0.12]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
                      {s.step}
                    </span>
                    <span 
                      style={{ color: s.color, backgroundColor: `${s.color}15` }}
                      className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                    >
                      {s.badge}
                    </span>
                  </div>

                  <div 
                    style={{ color: s.color, backgroundColor: `${s.color}15` }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <h3 className="text-base font-semibold text-[#1D1D1F] mb-2">
                    {s.title}
                  </h3>
                  <p className="text-xs text-[#6E6E73] leading-relaxed mb-4">
                    {s.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-black/[0.05] text-[11px] font-semibold flex items-center gap-1 text-[#0071E3]">
                  <span>Ayrıntıları Gör</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Step Detailed Showcase Box */}
        <div className="apple-card bg-[#F5F5F7] p-6 sm:p-8 border border-black/[0.07] max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] mb-6">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-white bg-[#1D1D1F] px-3 py-1 rounded-full">
                Adım {STEPS[activeStep].step}
              </span>
              <h4 className="text-lg font-semibold text-[#1D1D1F]">
                {STEPS[activeStep].title} — Teslim Edilecek Çıktılar
              </h4>
            </div>
            <span className="text-xs text-[#10B981] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sözleşmeli Garanti
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {STEPS[activeStep].deliverables.map((item, i) => (
              <div key={i} className="bg-white p-3.5 rounded-xl border border-black/[0.04] shadow-2xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 
                    style={{ color: STEPS[activeStep].color }} 
                    className="w-4 h-4 shrink-0 mt-0.5" 
                  />
                  <span className="text-xs font-medium text-[#1D1D1F] leading-snug">{item}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-black/[0.06]">
            <span className="text-xs text-[#6E6E73]">
              Projeniz için ücretsiz teknik fizibilite toplantısı talep edin.
            </span>
            <button
              onClick={onOpenContact}
              className="apple-pill-btn px-6 py-2.5 text-xs font-medium whitespace-nowrap"
            >
              Süreci Başlatın
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
