'use client';

import React from 'react';
import { CLIENT_TESTIMONIALS } from '@/data/products';
import { Star, Quote, Award, TrendingUp, CheckCircle, Building } from 'lucide-react';

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-24 bg-white border-b border-black/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F5F7] border border-black/[0.08] text-xs font-semibold text-[#1D1D1F] mb-4">
            <Award className="w-3.5 h-3.5 text-[#0071E3]" />
            <span>Müşteri Başarı Hikayeleri</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#1D1D1F] mb-4">
            Gerçek şirketler, <br />
            <span className="text-[#0071E3]">ölçülebilir başarılar.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#6E6E73]">
            Yazılım çözümlerimizle dijital dönüşümünü tamamlayan ve operasyonlarını katlayan iş ortaklarımızın deneyimleri.
          </p>
        </div>

        {/* Global Impact Numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          <div className="bg-[#F5F5F7] p-6 rounded-2xl border border-black/[0.04] text-center">
            <span className="text-3xl sm:text-4xl font-semibold text-[#1D1D1F] tracking-tight">45+</span>
            <p className="text-xs sm:text-sm text-[#86868B] mt-1 font-medium">Teslim Edilen Proje</p>
          </div>
          <div className="bg-[#F5F5F7] p-6 rounded-2xl border border-black/[0.04] text-center">
            <span className="text-3xl sm:text-4xl font-semibold text-[#10B981] tracking-tight">%99.8</span>
            <p className="text-xs sm:text-sm text-[#86868B] mt-1 font-medium">Müşteri Memnuniyeti</p>
          </div>
          <div className="bg-[#F5F5F7] p-6 rounded-2xl border border-black/[0.04] text-center">
            <span className="text-3xl sm:text-4xl font-semibold text-[#0071E3] tracking-tight">10x</span>
            <p className="text-xs sm:text-sm text-[#86868B] mt-1 font-medium">Ortalama Verimlilik Artışı</p>
          </div>
          <div className="bg-[#F5F5F7] p-6 rounded-2xl border border-black/[0.04] text-center">
            <span className="text-3xl sm:text-4xl font-semibold text-[#8B5CF6] tracking-tight">₺150M+</span>
            <p className="text-xs sm:text-sm text-[#86868B] mt-1 font-medium">İşlenen Aylık Veri Hacmi</p>
          </div>
        </div>

        {/* Testimonials Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CLIENT_TESTIMONIALS.map((t, idx) => (
            <div 
              key={idx} 
              className="apple-card p-6 sm:p-8 bg-white border border-black/[0.07] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1 text-[#FFBD2E]">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <span className="bg-[#10B981]/10 text-[#10B981] text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                    {t.result}
                  </span>
                </div>

                <p className="text-sm text-[#1D1D1F] leading-relaxed mb-6 font-normal">
                  "{t.comment}"
                </p>
              </div>

              <div className="pt-4 border-t border-black/[0.06] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F5F5F7] border border-black/[0.08] flex items-center justify-center font-bold text-[#1D1D1F] text-sm">
                  {t.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-[#1D1D1F]">{t.name}</h4>
                  <p className="text-xs text-[#86868B]">{t.role} — {t.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
