'use client';

import React from 'react';
import { Layers, ArrowRight, MessageCircle, Mail, Phone } from 'lucide-react';

interface FooterProps {
  onOpenContact: (productName?: string) => void;
  onScrollTo: (id: string) => void;
}

export default function Footer({ onOpenContact, onScrollTo }: FooterProps) {
  return (
    <footer className="bg-[#F5F5F7] border-t border-black/[0.08] pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* High Conversion Banner (Apple CTA) */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-black/[0.08] shadow-sm mb-20 text-center max-w-4xl mx-auto">
          <span className="text-xs font-semibold text-[#0071E3] uppercase tracking-wider block mb-3">
            Harekete Geçin
          </span>
          <h3 className="text-3xl sm:text-4xl font-semibold text-[#1D1D1F] tracking-tight mb-4">
            Şirketinizi kanıtlanmış yazılım gücüyle ölçeklendirin.
          </h3>
          <p className="text-base text-[#6E6E73] max-w-xl mx-auto mb-8 font-normal">
            KGLEX, HaritaPlan, Panelde gibi çalışan büyük SaaS ürünlerimizi keşfedin veya şirketinizin vizyonunu birlikte hayata geçirelim.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onOpenContact()}
              className="w-full sm:w-auto apple-pill-btn px-8 py-4 text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-[#0071E3]/20"
            >
              <span>Ücretsiz Demo & Teklif İste</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="https://wa.me/905327255098"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto apple-pill-btn-secondary px-6 py-4 text-sm font-medium flex items-center justify-center gap-2 border border-black/[0.08]"
            >
              <MessageCircle className="w-4 h-4 text-[#10B981]" />
              <span>WhatsApp Hızlı Danışma</span>
            </a>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16 text-xs text-[#6E6E73]">
          
          {/* Brand Info (2 Cols) */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#1D1D1F] flex items-center justify-center text-white">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-base tracking-tight text-[#1D1D1F]">
                YSN<span className="text-[#0071E3]">SOFT</span>
              </span>
            </div>
            <p className="leading-relaxed text-[#86868B] max-w-sm mb-3">
              Hukuk teknolojileri (KGLEX), Harita & CBS (HaritaPlan), Multi-Tenant yönetim (Panelde) ve e-ticaret alanında canlıda çalışan büyük SaaS ve web sistemleri üreten yazılım evi.
            </p>
            <div className="text-xs text-[#1D1D1F] font-semibold mb-3 flex flex-col gap-1">
              <a href="tel:05327255098" className="hover:text-blue-600 transition-colors">
                📞 0532 725 50 98
              </a>
              <span className="text-[#86868B] font-normal text-[11px]">
                📍 Pendik / İstanbul • destek@ysnsoft.com
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#10B981] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span>Tüm SaaS Kümeleri Aktif (%99.99 Uptime)</span>
            </div>
          </div>

          {/* Col 1: Canlı Ürünlerimiz */}
          <div>
            <h5 className="font-semibold text-[#1D1D1F] mb-3 text-xs tracking-wider uppercase">
              Ürünlerimiz
            </h5>
            <ul className="space-y-2.5">
              <li>
                <button onClick={() => onScrollTo('products')} className="hover:text-[#1D1D1F] transition-colors">
                  KGLEX LegalTech AI
                </button>
              </li>
              <li>
                <button onClick={() => onScrollTo('products')} className="hover:text-[#1D1D1F] transition-colors">
                  HaritaPlan / GeoPlan
                </button>
              </li>
              <li>
                <button onClick={() => onScrollTo('products')} className="hover:text-[#1D1D1F] transition-colors">
                  Panelde Multi-Tenant
                </button>
              </li>
              <li>
                <button onClick={() => onScrollTo('products')} className="hover:text-[#1D1D1F] transition-colors">
                  Flamantyou Kozmetik
                </button>
              </li>
              <li>
                <button onClick={() => onScrollTo('products')} className="hover:text-[#1D1D1F] transition-colors">
                  Tarihi Samatya Mezecisi
                </button>
              </li>
              <li>
                <button onClick={() => onScrollTo('products')} className="hover:text-[#1D1D1F] transition-colors">
                  Dolphin & ARM Bodrum
                </button>
              </li>
            </ul>
          </div>

          {/* Col 2: Çözümlerimiz */}
          <div>
            <h5 className="font-semibold text-[#1D1D1F] mb-3 text-xs tracking-wider uppercase">
              Çözümlerimiz
            </h5>
            <ul className="space-y-2.5">
              <li><span className="hover:text-[#1D1D1F] cursor-pointer">UYAP Robot Otomasyonu</span></li>
              <li><span className="hover:text-[#1D1D1F] cursor-pointer">3194 Md. 18 & DOP Motoru</span></li>
              <li><span className="hover:text-[#1D1D1F] cursor-pointer">Multi-Tenant Emlak Portalları</span></li>
              <li><span className="hover:text-[#1D1D1F] cursor-pointer">Kamera ile AI Cilt Analizi</span></li>
              <li><span className="hover:text-[#1D1D1F] cursor-pointer">Restoran Masadan QR Sipariş</span></li>
              <li><span className="hover:text-[#1D1D1F] cursor-pointer">Lüks Villa & VIP Rezervasyon</span></li>
            </ul>
          </div>

          {/* Col 3: Kurumsal */}
          <div>
            <h5 className="font-semibold text-[#1D1D1F] mb-3 text-xs tracking-wider uppercase">
              Kurumsal
            </h5>
            <ul className="space-y-2.5">
              <li><span className="hover:text-[#1D1D1F] cursor-pointer">Hakkımızda</span></li>
              <li><span className="hover:text-[#1D1D1F] cursor-pointer">KVKK & Veri Güvenliği</span></li>
              <li><span className="hover:text-[#1D1D1F] cursor-pointer">Gizlilik Politikası</span></li>
              <li><span className="hover:text-[#1D1D1F] cursor-pointer">SLA & Hizmet Şartları</span></li>
              <li><span className="hover:text-[#1D1D1F] cursor-pointer">Kariyer</span></li>
              <li>
                <a href="/blog" className="hover:text-[#1D1D1F] transition-colors flex items-center gap-1.5">
                  <span>Ar-Ge & Mühendislik Blogu</span>
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold">Yeni</span>
                </a>
              </li>
              <li>
                <a href="/portal" className="text-blue-600 font-semibold hover:underline flex items-center gap-1.5">
                  <span>Müşteri Takip Portalı</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">Canlı</span>
                </a>
              </li>
              <li>
                <a href="/admin" className="text-[#0071E3] font-semibold hover:underline flex items-center gap-1">
                  <span>Yönetim Portalı (Admin)</span>
                  <span className="text-[10px] bg-[#0071E3]/10 px-1.5 py-0.5 rounded">Giriş</span>
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 border-t border-black/[0.06] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#86868B] gap-4">
          <p>© 2026 YSNSOFT Bilişim Teknolojileri A.Ş. Tüm hakları saklıdır.</p>
          <div className="flex items-center gap-6">
            <span>Türkiye & Global Bulut Altyapısı</span>
            <span>Designed with Apple Minimalist Philosophy</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
