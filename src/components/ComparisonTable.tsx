'use client';

import React from 'react';
import { Check, X, Sparkles, Scale, Compass, Layers } from 'lucide-react';

export default function ComparisonTable() {
  const comparisonItems = [
    {
      feature: 'Hukuk & UYAP Entegrasyonu (KGLEX)',
      traditional: 'Manuel portal taraması, kaçan tebligatlar ve süreli duruşma riskleri',
      ysnsoft: 'Otonom Python UYAP robotu ile 7/24 otomatik tarama ve anlık SMS',
      advantage: true
    },
    {
      feature: 'Harita & İmar CAD Desteği (HaritaPlan)',
      traditional: 'Pahalı masaüstü CAD lisansları, saatler süren manuel DOP hesabı',
      ysnsoft: 'Tarayıcıda Netcad (.ncn) & DXF okuma, 1.2 saniyede resmi 3194 Md. 18 çıktısı',
      advantage: true
    },
    {
      feature: 'Çok Kiracılı Portal Mimarisi (Panelde)',
      traditional: 'Her şubeye ayrı veritabanı kurma masrafı ve senkronizasyon kopukluğu',
      ysnsoft: 'Tek altyapıda binlerce bağımsız ofis/acente, Socket.IO ve Expo mobil API',
      advantage: true
    },
    {
      feature: 'E-Ticarette Yapay Zeka (Flamantyou)',
      traditional: 'Standart ürün listesi, statik filtreler ve %70 sepet terk oranı',
      ysnsoft: 'Kamerayla AI Cilt Analizi, kişiye özel reçete ve %42 sepet dönüşüm artışı',
      advantage: true
    },
    {
      feature: 'Açılış & İşlem Hızı',
      traditional: 'Hantal monolitik eski kodlar (3 ila 8 saniye)',
      ysnsoft: 'Next.js 16 + React 19 Turbopack mimarisi ile < 0.2 saniye',
      advantage: true
    },
    {
      feature: 'Sunucu ve Bakım Masrafları',
      traditional: 'Fahiş yıllık yenileme ücretleri ve şirket içi sunucu elektrik masrafı',
      ysnsoft: 'Sıfır donanım masrafı; otomatik yedekli bulut ve kesintisiz arka plan güncellemeleri',
      advantage: true
    }
  ];

  return (
    <section className="py-24 bg-[#F5F5F7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-black/[0.08] text-xs font-semibold text-[#1D1D1F] mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#0071E3]" />
            <span>Fark Yaratan Mühendislik</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#1D1D1F] mb-4">
            Eski nesil çözümler vs. <br />
            <span className="text-[#0071E3]">YSNSOFT Canlı Ürün Ekosistemi.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#6E6E73]">
            Şirketinizi geleceğe taşırken operasyonel verimi nasıl 10 katına çıkardığımızı gerçek ürün kabiliyetlerimizle görün.
          </p>
        </div>

        {/* Comparison Table Card */}
        <div className="apple-card bg-white p-6 sm:p-10 border border-black/[0.07] overflow-x-auto shadow-sm">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-black/[0.08]">
                <th className="pb-5 text-sm font-semibold text-[#86868B] uppercase tracking-wider w-1/3">
                  Sektörel Kriter
                </th>
                <th className="pb-5 text-sm font-semibold text-[#86868B] w-1/3">
                  Geleneksel Yazılımlar
                </th>
                <th className="pb-5 text-sm font-bold text-[#0071E3] w-1/3 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0071E3]" />
                  YSNSOFT Çözümleri
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05] text-sm">
              {comparisonItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#F5F5F7]/50 transition-colors">
                  <td className="py-4.5 font-semibold text-[#1D1D1F] pr-4">
                    {item.feature}
                  </td>
                  <td className="py-4.5 text-[#6E6E73] pr-4 flex items-center gap-2">
                    <X className="w-4 h-4 text-[#FF5F56] shrink-0" />
                    <span>{item.traditional}</span>
                  </td>
                  <td className="py-4.5 text-[#1D1D1F] font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-[#10B981]/15 text-[#10B981] flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                      <span className="text-[#1D1D1F]">{item.ysnsoft}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </section>
  );
}
