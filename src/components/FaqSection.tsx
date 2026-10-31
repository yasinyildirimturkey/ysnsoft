'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle, MessageSquare } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'Mevcut muhasebe/ERP sistemimizden (Logo, Mikro, Zirve vb.) veri aktarımı yapıyor musunuz?',
    answer: 'Evet. Uzman veri mühendislerimiz, mevcut sisteminizdeki tüm cari hesapları, stok kartlarını, geçmiş faturaları ve müşteri verilerini hiçbir kayıp yaşamadan PulseERP veya özel yazılımınıza 24-48 saat içinde aktarır.'
  },
  {
    question: 'Yazılımları kendi şirket sunucumuzda (On-Premise) barındırabilir miyiz?',
    answer: 'Kesinlikle. SaaS çözümlerimiz standart olarak yüksek güvenlikli bulut altyapımızda (AWS / DigitalOcean / Cloudflare) barındırılır; ancak talep eden kurumsal müşterilerimiz için Docker ve Kubernetes konteynerleri ile şirket içi sunucularınıza (On-Premise) özel kurulum gerçekleştirebiliyoruz.'
  },
  {
    question: 'Kurulum ve şirkete uyarlama süreci ne kadar sürer?',
    answer: 'Hazır SaaS ürünlerimiz (PulseERP Suite ve NovaCommerce) aynı gün içinde canlıya alınabilir. Şirketinize özel entegrasyonlar ve veri aktarımı içeren projeler genellikle 1 ila 2 hafta; sıfırdan geliştirilen özel mobil ve web yazılımları ise 4 ila 8 hafta arasında teslim edilir.'
  },
  {
    question: 'Şirketimize özel ek modüller veya süreç değişiklikleri geliştirilebilir mi?',
    answer: 'Evet. YSNSOFT olarak en büyük avantajımız bir yazılım evi olmamızdır. İş süreçlerinize özel ek raporlar, yeni pazaryeri entegrasyonları, yapay zeka ajanları veya özel arayüz talepleriniz hızla geliştirilip sisteme eklenir.'
  },
  {
    question: 'Veri güvenliği ve KVKK / ISO 27001 standartları nasıl sağlanıyor?',
    answer: 'Tüm verileriniz dinlenme ve iletim halinde AES-256 ve TLS 1.3 protokolleri ile şifrelenir. Günlük otomatik yedekleme farklı coğrafi bölgelere dağıtılır ve tüm altyapımız KVKK & GDPR mevzuatlarına tam uyumludur.'
  },
  {
    question: 'Satış sonrası teknik destek ve SLA şartları nelerdir?',
    answer: 'Tüm müşterilerimize 7/24 kesintisiz e-posta, WhatsApp ve telefon desteği sunuyoruz. Kritik kurumsal süreçler için %99.99 çalışma garantisi (SLA) ve 30 dakika içinde teknik müdahale taahhüdü veriyoruz.'
  }
];

export default function FaqSection({ onOpenContact }: { onOpenContact: () => void }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-24 bg-[#F5F5F7]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-black/[0.08] text-xs font-semibold text-[#1D1D1F] mb-4 shadow-xs">
            <HelpCircle className="w-3.5 h-3.5 text-[#0071E3]" />
            <span>Sıkça Sorulan Sorular</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#1D1D1F] mb-4">
            Aklınıza takılan tüm sorular, <br />
            <span className="text-[#0071E3]">şeffaf yanıtlar.</span>
          </h2>
          <p className="text-base text-[#6E6E73]">
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
                    isOpen ? 'rotate-180 bg-[#0071E3] text-white' : 'text-[#86868B]'
                  }`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-[#6E6E73] leading-relaxed border-t border-black/[0.04] pt-4 animate-in fade-in duration-200">
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
            <p className="text-xs text-[#86868B]">Kıdemli yazılım mimarlarımızla doğrudan görüşün.</p>
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
