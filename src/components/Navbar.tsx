'use client';

import React, { useState, useEffect } from 'react';
import { Layers, ArrowRight, Menu, X, Calendar } from 'lucide-react';

interface NavbarProps {
  onOpenContact: (productName?: string) => void;
  onScrollTo: (id: string) => void;
}

export default function Navbar({ onOpenContact, onScrollTo }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      <div className={`mx-auto transition-all duration-300 ${scrolled ? 'py-3' : 'py-5'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            className={`flex items-center justify-between px-5 py-3 rounded-full transition-all duration-300 ${
              scrolled
                ? 'bg-white/80 backdrop-blur-xl border border-black/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.06)]'
                : 'bg-white/60 backdrop-blur-md border border-black/[0.04]'
            }`}
          >
            {/* Logo */}
            <div
              onClick={() => onScrollTo('hero')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#1D1D1F] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-lg tracking-tight text-[#1D1D1F] leading-none">
                  YSN<span className="text-[#0071E3]">SOFT</span>
                </span>
                <span className="text-[10px] text-[#86868B] font-medium tracking-wider uppercase mt-0.5">
                  SaaS & Bilişim
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-6">
              <button
                onClick={() => onScrollTo('products')}
                className="text-xs font-semibold text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
              >
                Ürünlerimiz
              </button>
              <button
                onClick={() => onScrollTo('live-sites')}
                className="text-xs font-semibold text-[#6E6E73] hover:text-[#1D1D1F] transition-colors flex items-center gap-1"
              >
                <span>Canlı Siteler</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              </button>
              <button
                onClick={() => onScrollTo('sandbox')}
                className="text-xs font-semibold text-[#6E6E73] hover:text-[#1D1D1F] transition-colors flex items-center gap-1.5"
              >
                <span>Test Simülatörü</span>
                <span className="bg-[#10B981]/10 text-[#10B981] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  Canlı
                </span>
              </button>
              <button
                onClick={() => onScrollTo('calculator')}
                className="text-xs font-semibold text-[#6E6E73] hover:text-[#1D1D1F] transition-colors flex items-center gap-1.5"
              >
                <span>Fiyat Hesapla</span>
              </button>
              <a
                href="/blog"
                className="text-xs font-semibold text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
              >
                Ar-Ge & Blog
              </a>
              <a
                href="/portal"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60"
              >
                Müşteri Portalı
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden sm:flex items-center gap-3">
              <a
                href="/admin"
                className="px-3 py-1.5 text-xs font-semibold text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] rounded-full transition-colors"
                title="Yönetim Paneli"
              >
                Yönetim
              </a>
              <button
                onClick={() => onScrollTo('demo')}
                className="px-4 py-2 text-xs font-semibold text-[#1D1D1F] hover:bg-black/[0.04] rounded-full transition-colors flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-[#0071E3]" />
                <span>Demo Randevusu</span>
              </button>
              <button
                onClick={() => onOpenContact()}
                className="apple-pill-btn px-5 py-2.5 text-xs font-semibold flex items-center gap-2 shadow-sm"
              >
                <span>Teklif Alın</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#1D1D1F] rounded-lg hover:bg-black/5"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </nav>

          {/* Mobile Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-2 p-4 bg-white/95 backdrop-blur-2xl rounded-3xl border border-black/[0.08] shadow-2xl flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-4 duration-200">
              <button
                onClick={() => {
                  onScrollTo('products');
                  setMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2 text-sm font-medium text-[#1D1D1F] rounded-xl hover:bg-black/5"
              >
                Ürünlerimiz (KGLEX, HaritaPlan, Panelde)
              </button>
              <button
                onClick={() => {
                  onScrollTo('sandbox');
                  setMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2 text-sm font-medium text-[#1D1D1F] rounded-xl hover:bg-black/5 flex items-center justify-between"
              >
                <span>Canlı Deneyim Simülatörü</span>
                <span className="bg-[#10B981]/10 text-[#10B981] text-xs font-semibold px-2 py-0.5 rounded-full">
                  Canlı
                </span>
              </button>
              <button
                onClick={() => {
                  onScrollTo('cases');
                  setMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2 text-sm font-medium text-[#1D1D1F] rounded-xl hover:bg-black/5"
              >
                Vaka İncelemeleri & Sonuçlar
              </button>
              <button
                onClick={() => {
                  onScrollTo('architecture');
                  setMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2 text-sm font-medium text-[#1D1D1F] rounded-xl hover:bg-black/5"
              >
                Bulut & Sistem Mimarisi
              </button>
              <button
                onClick={() => {
                  onScrollTo('calculator');
                  setMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2 text-sm font-medium text-[#1D1D1F] rounded-xl hover:bg-black/5 flex items-center justify-between"
              >
                <span>Fiyat & Kapsam Hesapla</span>
                <span className="bg-[#0071E3]/10 text-[#0071E3] text-xs font-semibold px-2 py-0.5 rounded-full">
                  Hesapla
                </span>
              </button>
              <button
                onClick={() => {
                  onScrollTo('demo');
                  setMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2 text-sm font-medium text-[#1D1D1F] rounded-xl hover:bg-black/5 flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-[#0071E3]" />
                <span>30 Dakikalık Canlı Demo Randevusu</span>
              </button>
              <div className="pt-2 border-t border-black/[0.06] flex flex-col gap-2">
                <a
                  href="/blog"
                  className="text-left px-3 py-2 text-sm font-medium text-[#1D1D1F] rounded-xl hover:bg-black/5"
                >
                  Ar-Ge & Mühendislik Blogu
                </a>
                <a
                  href="/portal"
                  className="text-left px-3 py-2 text-sm font-semibold text-blue-600 rounded-xl hover:bg-blue-50 flex items-center justify-between"
                >
                  <span>Müşteri Proje Takip Portalı</span>
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">Yeni</span>
                </a>
                <a
                  href="/admin"
                  className="text-left px-3 py-2 text-sm font-medium text-[#86868B] rounded-xl hover:bg-black/5"
                >
                  Yönetim Paneli (Admin)
                </a>
                <button
                  onClick={() => {
                    onOpenContact();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full apple-pill-btn py-3 text-center text-xs font-semibold"
                >
                  Proje Teklifi Alın
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
