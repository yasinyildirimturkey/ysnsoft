'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, FileText, ArrowUp } from 'lucide-react';

interface FloatingActionsProps {
  onOpenContact: () => void;
}

export default function FloatingActions({ onOpenContact }: FloatingActionsProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-5 duration-300">
      
      {/* Scroll to Top */}
      <button
        onClick={scrollToTop}
        title="Yukarı Çık"
        className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md border border-black/[0.08] text-[#1D1D1F] flex items-center justify-center shadow-lg hover:bg-white hover:scale-105 transition-all"
      >
        <ArrowUp className="w-4 h-4" />
      </button>

      {/* WhatsApp Direct Action */}
      <a
        href="https://wa.me/905327255098"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/90 backdrop-blur-md border border-black/[0.08] shadow-lg text-xs font-semibold text-[#1D1D1F] hover:bg-white hover:scale-105 transition-all group"
      >
        <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
        <MessageCircle className="w-4 h-4 text-[#10B981]" />
        <span className="hidden sm:inline">WhatsApp Destek</span>
      </a>

      {/* Quick Quote Floating Pill */}
      <button
        onClick={onOpenContact}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0071E3] text-white shadow-lg shadow-[#0071E3]/25 text-xs font-medium hover:bg-[#0077ED] hover:scale-105 transition-all"
      >
        <FileText className="w-4 h-4" />
        <span>Hızlı Teklif</span>
      </button>

    </div>
  );
}
