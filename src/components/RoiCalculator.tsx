'use client';

import React, { useState } from 'react';
import { Calculator, ArrowRight, TrendingUp, Clock, DollarSign, Sparkles } from 'lucide-react';

interface RoiCalculatorProps {
  onOpenContact: (summary?: string) => void;
}

export default function RoiCalculator({ onOpenContact }: RoiCalculatorProps) {
  const [employees, setEmployees] = useState(25);
  const [monthlyTransactions, setMonthlyTransactions] = useState(2500);

  // Dynamic calculations based on industry operational research
  // Average employee spends ~6 hours/week on manual data entry/invoicing/reporting
  // YSNSOFT SaaS automates ~65% of this.
  const hoursSavedPerYear = Math.round(employees * 52 * 4);
  const costSavingsPerYear = Math.round(hoursSavedPerYear * 220); // ~₺220/hour avg employer cost
  const roiMonths = (costSavingsPerYear > 400000) ? '1.5 - 2 Ay' : '2.5 - 3 Ay';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <section className="py-24 bg-white border-b border-black/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F5F7] border border-black/[0.08] text-xs font-semibold text-[#1D1D1F] mb-4">
            <Calculator className="w-3.5 h-3.5 text-[#0071E3]" />
            <span>Finansal Getiri (ROI) Simülatörü</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#1D1D1F] mb-4">
            Yazılım bir masraf değil, <br />
            <span className="text-[#0071E3]">en karlı yatırımınızdır.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#6E6E73]">
            Şirket büyüklüğünüzü ve işlem hacminizi girin; YSNSOFT SaaS altyapısının yılda kaç saat ve kaç lira tasarruf ettireceğini görün.
          </p>
        </div>

        {/* Calculator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
          
          {/* Sliders (7 Cols) */}
          <div className="lg:col-span-7 apple-card p-6 sm:p-8 bg-[#F5F5F7] border border-black/[0.07] space-y-8">
            
            {/* Slider 1: Employees */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-[#1D1D1F]">
                  Aktif Çalışan / Kullanıcı Sayısı
                </span>
                <span className="text-base font-bold text-[#0071E3] bg-white px-3 py-1 rounded-full border border-black/[0.06] shadow-2xs">
                  {employees} Kişi
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={250}
                step={5}
                value={employees}
                onChange={e => setEmployees(Number(e.target.value))}
                className="w-full accent-[#0071E3] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#86868B] mt-1.5">
                <span>5 Kişi</span>
                <span>100 Kişi</span>
                <span>250+ Kişi</span>
              </div>
            </div>

            {/* Slider 2: Monthly Transactions */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-[#1D1D1F]">
                  Aylık Ortalama Fatura & Sipariş Hacmi
                </span>
                <span className="text-base font-bold text-[#0071E3] bg-white px-3 py-1 rounded-full border border-black/[0.06] shadow-2xs">
                  {monthlyTransactions.toLocaleString('tr-TR')} Adet
                </span>
              </div>
              <input
                type="range"
                min={200}
                max={30000}
                step={200}
                value={monthlyTransactions}
                onChange={e => setMonthlyTransactions(Number(e.target.value))}
                className="w-full accent-[#0071E3] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#86868B] mt-1.5">
                <span>200 İşlem</span>
                <span>15.000 İşlem</span>
                <span>30.000+ İşlem</span>
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-black/[0.06] text-xs text-[#6E6E73] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0071E3] shrink-0" />
              <span>
                Hesaplama; otomatik e-fatura kesimi, stok senkronizasyonu ve AI müşteri desteğinin rutin iş gücünden tasarruf ettiği verilerle modellenmiştir.
              </span>
            </div>

          </div>

          {/* Results Output (5 Cols) */}
          <div className="lg:col-span-5 apple-card p-6 sm:p-8 bg-white border border-black/[0.08] shadow-md">
            <span className="text-xs font-bold uppercase tracking-wider text-[#86868B] block mb-4">
              Öngörülen Yıllık Tasarruf
            </span>

            <div className="space-y-5 mb-8">
              <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-black/[0.04]">
                <div className="flex items-center gap-2 text-xs text-[#86868B] mb-1">
                  <DollarSign className="w-4 h-4 text-[#10B981]" />
                  <span>Tahmini Yıllık Finansal Kazanç</span>
                </div>
                <div className="text-3xl font-bold text-[#10B981] tracking-tight">
                  {formatCurrency(costSavingsPerYear)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#F5F5F7] p-3.5 rounded-2xl border border-black/[0.04]">
                  <div className="flex items-center gap-1.5 text-xs text-[#86868B] mb-1">
                    <Clock className="w-3.5 h-3.5 text-[#0071E3]" />
                    <span>Zaman Tasarrufu</span>
                  </div>
                  <div className="text-xl font-bold text-[#1D1D1F]">
                    {hoursSavedPerYear.toLocaleString('tr-TR')} Saat
                  </div>
                </div>

                <div className="bg-[#F5F5F7] p-3.5 rounded-2xl border border-black/[0.04]">
                  <div className="flex items-center gap-1.5 text-xs text-[#86868B] mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span>Geri Dönüş (ROI)</span>
                  </div>
                  <div className="text-xl font-bold text-[#1D1D1F]">
                    {roiMonths}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => onOpenContact(`ROI Hesaplayıcı: ${employees} Kişi, ${monthlyTransactions} İşlem, Tahmini Tasarruf: ${formatCurrency(costSavingsPerYear)}`)}
              className="w-full apple-pill-btn py-3.5 text-sm font-medium flex items-center justify-center gap-2 shadow-md shadow-[#0071E3]/20"
            >
              <span>Bu Tasarrufu Başlatın</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </section>
  );
}
