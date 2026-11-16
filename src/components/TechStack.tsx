'use client';

import React from 'react';
import { TECH_STACK_ITEMS } from '@/data/products';
import { Zap, ShieldCheck, Sparkles, Terminal, Code2, Server, Database, Cloud } from 'lucide-react';

export default function TechStack() {
  return (
    <section id="tech-stack" className="py-16 sm:py-24 bg-[#F5F5F7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="section-eyebrow">
            <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Mühendislik & Altyapı Standartları</span>
          </div>
          <h2 className="section-title">
            Geleceğin teknolojileriyle <br />
            <span>sağlam temeller üzerine kurulu.</span>
          </h2>
          <p className="section-lead">
            Hantal sistemler yerine modern web ve bulut teknolojilerini kullanıyoruz. Ürünleriniz hem bugün ışık hızında çalışır hem de gelecekteki büyümenize hazır olur.
          </p>
        </div>

        {/* 3 Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="apple-card p-6 sm:p-8 bg-white border border-black/[0.06]">
            <div className="w-12 h-12 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center mb-6">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-[#1D1D1F] mb-2">
              Milisaniyelik Edge Hızı
            </h3>
            <p className="text-sm text-[#515154] leading-relaxed">
              Next.js 15 App Router ve sunucu taraflı önbellekleme (ISR) ile sayfalarınız ve API uç noktalarınız kullanıcıya göz açıp kapayıncaya kadar ulaşır.
            </p>
          </div>

          <div className="apple-card p-6 sm:p-8 bg-white border border-black/[0.06]">
            <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-[#1D1D1F] mb-2">
              Kurumsal Güvenlik & KVKK
            </h3>
            <p className="text-sm text-[#515154] leading-relaxed">
              Tüm veri tabanları şifrelenmiş (AES-256), otomatik yedeklenen ve ISO 27001 bilişim güvenliği yönergelerine tam uyumlu sunucularda barındırılır.
            </p>
          </div>

          <div className="apple-card p-6 sm:p-8 bg-white border border-black/[0.06]">
            <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-[#1D1D1F] mb-2">
              Apple UI/UX Deneyimi
            </h3>
            <p className="text-sm text-[#515154] leading-relaxed">
              Karmaşık kurumsal yazılımları bile herkesin ilk bakışta kolayca kullanabileceği yalınlıkta ve zarafette tasarlıyoruz.
            </p>
          </div>
        </div>

        {/* Tech Badges Grid */}
        <div className="bg-white rounded-3xl p-8 border border-black/[0.07] shadow-sm">
          <div className="text-center mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6E6E73]">
              Aktif Olarak Geliştirdiğimiz Teknolojiler
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {TECH_STACK_ITEMS.map((item, idx) => (
              <div 
                key={idx} 
                className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.04] hover:border-black/[0.12] transition-all flex items-center gap-3.5 group"
              >
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#1D1D1F] group-hover:text-[#0071E3] transition-colors shadow-xs">
                  {idx % 4 === 0 && <Code2 className="w-5 h-5" />}
                  {idx % 4 === 1 && <Terminal className="w-5 h-5" />}
                  {idx % 4 === 2 && <Database className="w-5 h-5" />}
                  {idx % 4 === 3 && <Cloud className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#1D1D1F]">{item.name}</h4>
                  <p className="text-xs text-[#6E6E73]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
