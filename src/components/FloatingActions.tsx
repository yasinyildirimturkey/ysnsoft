'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, ArrowUp } from 'lucide-react';

interface FloatingActionsProps {
  onOpenContact: () => void;
}

/**
 * Sağ altta, AI asistan düğmesinin üstünde duran sade ikon yığını.
 * "Teklif Alın" zaten sabit navbar'da her an erişilebilir olduğu için
 * burada tekrar edilmez; ekran köşesi kalabalıklaşmaz.
 */
export default function FloatingActions({}: FloatingActionsProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 600);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const iconButton =
    'group relative w-11 h-11 rounded-full bg-white/90 backdrop-blur-md border border-black/[0.08] text-[#1D1D1F] flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:bg-white hover:border-black/[0.16] transition-colors';
  const tooltip =
    'pointer-events-none absolute right-full mr-2 px-2.5 py-1 rounded-lg bg-[#1D1D1F] text-white text-xs font-medium whitespace-nowrap opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 transition-all duration-150';

  return (
    <div
      className={`fixed bottom-[4.75rem] sm:bottom-[5.5rem] right-4 sm:right-6 z-40 flex flex-col items-end gap-2 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
      aria-hidden={!visible}
    >
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Sayfa başına dön"
        tabIndex={visible ? 0 : -1}
        className={iconButton}
      >
        <ArrowUp className="w-4 h-4" aria-hidden="true" />
        <span className={tooltip} aria-hidden="true">Yukarı çık</span>
      </button>

      <a
        href="https://wa.me/905327255098"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp üzerinden destek alın (yeni sekmede açılır)"
        tabIndex={visible ? 0 : -1}
        className={iconButton}
      >
        <MessageCircle className="w-[18px] h-[18px] text-[#0E9F6E]" aria-hidden="true" />
        <span className={tooltip} aria-hidden="true">WhatsApp destek</span>
      </a>
    </div>
  );
}
