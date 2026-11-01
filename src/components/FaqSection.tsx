'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle, MessageSquare } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'KGLEX UYAP robotu hukuk büromuzun dava ve icra takiplerini nasıl otomatikleştirir?',
    answer: 'KGLEX, T.C. Adalet Bakanlığı UYAP Avukat Portalı ile entegre çalışan akıllı arka plan robot servislerine sahiptir. Dava ve icra dosyalarınızdaki tensip zabıtlarını, yeni evrakları, tebligatları ve duruşma günlerini gece ve gündüz otomatik tarar; süre kaçırma riskini sıfıra indirir ve müvekkil portalı ile anlık SMS/E-Posta bilgilendirmesi yapar.'
  },
  {
    question: 'HaritaPlan 3194 Sayılı Kanun Madde 18 DOP ve parselasyon hesaplamalarını nasıl yapar?',
    answer: 'HaritaPlan, Netcad (.ncn) ve AutoCAD (.dxf) dosyalarını doğrudan web tarayıcısına sürükleyerek okur. 3194 Sayılı İmar Kanunu Madde 18 kapsamında maksimum %45 Düzenleme Ortaklık Payı (DOP) hesaplarını milisaniyeler içinde tamamlar, tapu dağıtım cetvellerini ve resmi kadastro raporlarını A3/A4 vektörel PDF olarak üretir.'
  },
  {
    question: 'Yazılımları kendi şirket sunucumuzda (On-Premise / Özel Bulut) barındırabilir miyiz?',
    answer: 'Kesinlikle. Çözümlerimiz standart olarak yüksek güvenlikli bulut altyapımızda (IIS, Docker, Kubernetes, Cloudflare) barındırılır; ancak talep eden kurumsal hukuk ofisleri, belediyeler ve işletmeler için On-Premise (şirket içi sunucu) kurulumu ve özel veri tabanı izolasyonu sağlıyoruz.'
  },
  {
    question: 'Tarihi Samatya Mezecisi QR menü ve restoran POS sistemi mevcut fiş yazıcılarıyla uyumlu mu?',
    answer: 'Evet. Tarihi Samatya Mezecisi için geliştirdiğimiz restoran otomasyonu; masadan cep telefonu kamerasıyla QR menü siparişi, mutfak ve bar ekranı (KDS), garson el terminali ve piyasadaki tüm standart ESC/POS termal fiş yazıcılarıyla çift yönlü WebSocket entegrasyonuna sahiptir.'
  },
  {
    question: 'Veri güvenliği, KVKK ve 256-bit SSL şifreleme nasıl sağlanıyor?',
    answer: 'Tüm YSNSOFT altyapısı TLS 1.3 ve 256-bit SSL şifrelemeyle korunur. Veritabanlarımızda Row-Level Security (RLS) uygulanır, günlük otomatik yedekleme coğrafi olarak izole edilir ve tüm sistemlerimiz KVKK & GDPR mevzuatlarına %100 uyumludur.'
  },
  {
    question: 'Satış sonrası teknik destek, SLA garantisi ve acil müdahale şartları nelerdir?',
    answer: 'Tüm kurumsal müşterilerimize 7/24 kesintisiz telefon (+90 532 725 50 98), WhatsApp ve e-posta desteği sunuyoruz. Kritik kurumsal süreçler için %99.99 çalışma garantisi (SLA) ve 15 dakika içinde çözüm mimarı müdahalesi taahhüt ediyoruz.'
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
