'use client';

import React, { useState, useEffect } from 'react';
import { Layers, ArrowRight, Menu, X, Calendar, UserRound } from 'lucide-react';

interface NavbarProps {
  onOpenContact: (productName?: string) => void;
  onScrollTo: (id: string) => void;
}

// Sayfa içi bölümler — sıra, sayfadaki sırayla aynı olmalı (scroll-spy buna güvenir)
const SECTION_LINKS = [
  { id: 'products', label: 'Ürünler' },
  { id: 'live-sites', label: 'Canlı Siteler' },
  { id: 'sandbox', label: 'Simülatör' },
  { id: 'cases', label: 'Vakalar' },
  { id: 'calculator', label: 'Fiyat' },
  { id: 'faq', label: 'SSS' },
] as const;

export default function Navbar({ onOpenContact, onScrollTo }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Kaydırma durumu + okuma ilerlemesi + aktif bölüm (tek, rAF ile sınırlanmış dinleyici)
  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrolled(y > 20);
      setProgress(max > 0 ? Math.min(1, y / max) : 0);

      // Görünüm alanının üst üçte birini geçen son bölüm aktiftir
      const probe = y + window.innerHeight * 0.35;
      let current = '';
      for (const link of SECTION_LINKS) {
        const el = document.getElementById(link.id);
        if (el && el.getBoundingClientRect().top + y <= probe) current = link.id;
      }
      setActiveId(current);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Mobil menü: Escape ile kapanır, açıkken sayfa kaymaz
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileMenuOpen]);

  const go = (id: string) => {
    setMobileMenuOpen(false);
    onScrollTo(id);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* İçeriğe atla — yalnızca klavye odağında görünür */}
      <a
        href="#products"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-full focus:bg-[#1D1D1F] focus:text-white focus:text-sm focus:font-medium"
      >
        İçeriğe atla
      </a>

      <div className={`transition-[padding] duration-300 ${scrolled ? 'py-2.5' : 'py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            aria-label="Ana menü"
            className={`relative flex items-center justify-between gap-4 pl-3 pr-2.5 py-2 rounded-full border transition-[background-color,box-shadow,border-color] duration-300 overflow-hidden ${
              scrolled || mobileMenuOpen
                ? 'bg-white/85 backdrop-blur-xl backdrop-saturate-150 border-black/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.06)]'
                : 'bg-white/60 backdrop-blur-md border-black/[0.05]'
            }`}
          >
            {/* Logo */}
            <button
              type="button"
              onClick={() => go('hero')}
              aria-label="YSNSOFT — sayfa başına dön"
              className="flex items-center gap-2.5 group shrink-0 rounded-full pr-2"
            >
              <span className="w-9 h-9 rounded-full bg-[#1D1D1F] flex items-center justify-center text-white shadow-sm transition-transform duration-300 group-hover:rotate-[-8deg]">
                <Layers className="w-[18px] h-[18px]" aria-hidden="true" />
              </span>
              <span className="font-semibold text-[17px] tracking-tight text-[#1D1D1F] leading-none">
                YSN<span className="text-[#0071E3]">SOFT</span>
              </span>
            </button>

            {/* Masaüstü bölüm linkleri */}
            <ul className="hidden lg:flex items-center gap-0.5">
              {SECTION_LINKS.map((link) => {
                const active = activeId === link.id;
                return (
                  <li key={link.id}>
                    <button
                      type="button"
                      onClick={() => go(link.id)}
                      aria-current={active ? 'true' : undefined}
                      className={`px-3 py-2 text-[13px] font-medium rounded-full transition-colors ${
                        active
                          ? 'bg-black/[0.06] text-[#1D1D1F]'
                          : 'text-[#515154] hover:text-[#1D1D1F] hover:bg-black/[0.04]'
                      }`}
                    >
                      {link.label}
                    </button>
                  </li>
                );
              })}
              <li>
                <a
                  href="/blog"
                  className="px-3 py-2 text-[13px] font-medium rounded-full text-[#515154] hover:text-[#1D1D1F] hover:bg-black/[0.04] transition-colors"
                >
                  Blog
                </a>
              </li>
            </ul>

            {/* Sağ taraf: ikincil ve birincil eylemler */}
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href="/portal"
                className="hidden xl:inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#515154] hover:text-[#1D1D1F] hover:bg-black/[0.04] rounded-full transition-colors"
              >
                <UserRound className="w-4 h-4" aria-hidden="true" />
                <span>Müşteri Portalı</span>
              </a>
              <button
                type="button"
                onClick={() => go('demo')}
                className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-[#1D1D1F] hover:bg-black/[0.05] rounded-full transition-colors"
              >
                <Calendar className="w-4 h-4 text-[#0071E3]" aria-hidden="true" />
                <span>Demo</span>
              </button>
              <button
                type="button"
                data-contact-trigger
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenContact();
                }}
                className="apple-pill-btn px-4 py-2.5 text-[13px] font-semibold flex items-center gap-1.5 group/cta"
              >
                <span>Teklif Alın</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/cta:translate-x-0.5" aria-hidden="true" />
              </button>

              {/* Mobil menü düğmesi */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
                aria-label={mobileMenuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
                className="lg:hidden w-10 h-10 flex items-center justify-center text-[#1D1D1F] rounded-full hover:bg-black/[0.05] transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

            {/* Okuma ilerleme çizgisi */}
            <span
              aria-hidden="true"
              className="absolute left-0 bottom-0 h-[2px] w-full origin-left bg-[#0071E3] transition-opacity duration-300"
              style={{ transform: `scaleX(${progress})`, opacity: scrolled ? 0.9 : 0 }}
            />
          </nav>

          {/* Mobil açılır menü */}
          {mobileMenuOpen && (
            <div
              id="mobile-menu"
              className="lg:hidden mt-2 p-2 bg-white/95 backdrop-blur-2xl rounded-3xl border border-black/[0.08] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 max-h-[calc(100dvh-6rem)] overflow-y-auto"
            >
              <ul className="flex flex-col">
                {SECTION_LINKS.map((link) => (
                  <li key={link.id}>
                    <button
                      type="button"
                      onClick={() => go(link.id)}
                      aria-current={activeId === link.id ? 'true' : undefined}
                      className={`w-full text-left px-4 py-3 text-[15px] font-medium rounded-2xl transition-colors ${
                        activeId === link.id
                          ? 'bg-black/[0.05] text-[#1D1D1F]'
                          : 'text-[#1D1D1F] hover:bg-black/[0.04]'
                      }`}
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>

              <div className="my-2 mx-4 border-t border-black/[0.06]" />

              <ul className="flex flex-col">
                <li>
                  <a href="/blog" className="block px-4 py-3 text-[15px] font-medium text-[#1D1D1F] rounded-2xl hover:bg-black/[0.04]">
                    Ar-Ge & Blog
                  </a>
                </li>
                <li>
                  <a href="/portal" className="flex items-center gap-2 px-4 py-3 text-[15px] font-medium text-[#1D1D1F] rounded-2xl hover:bg-black/[0.04]">
                    <UserRound className="w-4 h-4 text-[#0071E3]" aria-hidden="true" />
                    Müşteri Portalı
                  </a>
                </li>
              </ul>

              <div className="grid grid-cols-2 gap-2 p-2 pt-3">
                <button
                  type="button"
                  onClick={() => go('demo')}
                  className="apple-pill-btn-secondary py-3 text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4 text-[#0071E3]" aria-hidden="true" />
                  Demo Randevusu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenContact();
                  }}
                  className="apple-pill-btn py-3 text-sm font-semibold"
                >
                  Teklif Alın
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
