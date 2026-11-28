'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle, MessageSquare } from 'lucide-react';
import { FAQS } from '@/data/faq';


export default function FaqSection({ onOpenContact }: { onOpenContact: () => void }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-16 sm:py-24 bg-[#F5F5F7]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="section-eyebrow">
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sıkça Sorulan Sorular</span>
          </div>
          <h2 className="section-title">
            Aklınıza takılan tüm sorular, <br />
            <span>şeffaf yanıtlar.</span>
          </h2>
          <p className="section-lead">
            Süreçlerimiz, geçiş planlarımız ve güvenlik altyapımız hakkında merak edilenler.
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="apple-card bg-white border border-black/[0.06] overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4"
                >
                  <span className="text-sm sm:text-base font-semibold text-[#1D1D1F]">
                    {faq.question}
                  </span>
                  <div className={`w-7 h-7 rounded-full bg-[#F5F5F7] flex items-center justify-center shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180 bg-[#0071E3] text-white' : 'text-[#6E6E73]'
                  }`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-[#515154] leading-relaxed border-t border-black/[0.04] pt-4 animate-in fade-in duration-200">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Support Callout */}
        <div className="mt-12 text-center p-6 bg-white rounded-2xl border border-black/[0.06] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <span className="text-sm font-semibold text-[#1D1D1F] block">Farklı bir sorunuz mu var?</span>
            <p className="text-xs text-[#6E6E73]">Kıdemli yazılım mimarlarımızla doğrudan görüşün.</p>
          </div>
          <button
            onClick={onOpenContact}
            className="apple-pill-btn px-6 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap"
          >
            Bize Ulaşın
          </button>
        </div>

      </div>
    </section>
  );
}
