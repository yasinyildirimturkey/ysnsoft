'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import ProductBentoGrid from '@/components/ProductBentoGrid';
import LiveSiteShowcase from '@/components/LiveSiteShowcase';
import InteractiveSandbox from '@/components/InteractiveSandbox';
import WorkProcess from '@/components/WorkProcess';
import ProjectCalculator from '@/components/ProjectCalculator';
import ArchitectureBlueprint from '@/components/ArchitectureBlueprint';
import CodeRadar from '@/components/CodeRadar';
import ComparisonTable from '@/components/ComparisonTable';
import RoiCalculator from '@/components/RoiCalculator';
import MeetingScheduler from '@/components/MeetingScheduler';
import TechStack from '@/components/TechStack';
import Testimonials from '@/components/Testimonials';
import FaqSection from '@/components/FaqSection';
import Footer from '@/components/Footer';
import ProductModal from '@/components/ProductModal';
import ContactModal from '@/components/ContactModal';
import FloatingActions from '@/components/FloatingActions';
import AiAssistant from '@/components/AiAssistant';
import Reveal from '@/components/Reveal';
import { Product, PRODUCTS } from '@/data/products';

export default function Home() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [prefilledContactProduct, setPrefilledContactProduct] = useState<string>('');

  const handleOpenContact = (productName?: string) => {
    setPrefilledContactProduct(productName || '');
    setContactModalOpen(true);
  };

  const handleSelectProductById = (productId: string) => {
    const prod = PRODUCTS.find(p => p.id === productId);
    if (prod) {
      setSelectedProduct(prod);
    }
  };

  const handleConfigureSubmit = (summary: string) => {
    setPrefilledContactProduct(summary);
    setContactModalOpen(true);
  };

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] selection:bg-[#0071E3] selection:text-white">
      {/* 1. Frosted Glass Sticky Navbar */}
      <Navbar 
        onOpenContact={handleOpenContact}
        onScrollTo={handleScrollTo}
      />

      {/* 2. Apple Studio Display Hero Section */}
      <Hero 
        onOpenContact={handleOpenContact}
        onScrollTo={handleScrollTo}
        onSelectProduct={handleSelectProductById}
      />

      {/* 3. Real Product Bento Grid (KGLEX, HaritaPlan, Panelde, Flamantyou, Samatya, Bodrum) */}
      <Reveal><ProductBentoGrid 
        onSelectProduct={setSelectedProduct}
        onOpenContact={handleOpenContact}
      /></Reveal>

      {/* 4. Canlı Web Siteleri İstasyonu & Cihaz Konsolu */}
      <Reveal><LiveSiteShowcase /></Reveal>

      {/* 4. Live Interactive Experience Simulator */}
      <Reveal><InteractiveSandbox /></Reveal>

      {/* 5. Documented Case Studies & Real Results */}
      <div id="cases">
      </div>

      {/* 6. 4-Step Agile Work & Delivery Process */}
      <Reveal><WorkProcess onOpenContact={() => handleOpenContact('İş Süreci & Proje Başlatma')} /></Reveal>

      {/* 7. Interactive Scope & Cost Configurator */}
      <Reveal><ProjectCalculator 
        onConfigureSubmit={handleConfigureSubmit}
      /></Reveal>

      {/* 8. 5-Layer Enterprise Cloud Architecture & Security */}
      <div id="architecture">
        <Reveal><ArchitectureBlueprint /></Reveal>
      </div>

      {/* 9. Engineering Code Radar */}
      <Reveal><CodeRadar /></Reveal>

      {/* 10. Comparison Matrix: Traditional Software vs YSNSOFT */}
      <Reveal><ComparisonTable /></Reveal>

      {/* 11. Interactive Financial ROI Simulator */}
      <Reveal><RoiCalculator 
        onOpenContact={handleOpenContact}
      /></Reveal>

      {/* 12. 30-Minute Live 1-on-1 Google Meet Scheduler */}
      <Reveal><MeetingScheduler /></Reveal>

      {/* 13. Technology Stack & Modern Tooling */}
      <Reveal><TechStack /></Reveal>

      {/* 14. Client Stories & Ratings */}

      {/* 15. FAQ Accordion */}
      {/* Yalnız müşterinin izin verdiği ve panelde onaylanan gerçek yorumlar; yoksa görünmez */}
      <Reveal><Testimonials /></Reveal>

      <Reveal><FaqSection 
        onOpenContact={() => handleOpenContact('Genel Danışmanlık')}
      /></Reveal>

      {/* 16. Footer & High-Conversion Banner */}
      <Footer 
        onOpenContact={handleOpenContact}
        onScrollTo={handleScrollTo}
      />

      {/* 17. Product Details Sheet Modal */}
      <ProductModal 
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onRequestQuote={handleOpenContact}
      />

      {/* 18. Fast Lead Capture Modal */}
      <ContactModal 
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        prefilledProduct={prefilledContactProduct}
      />

      {/* 19. Floating Fast Action Bar (WhatsApp & Fast Quote) */}
      <FloatingActions 
        onOpenContact={() => handleOpenContact()}
      />

      {/* 20. Apple Intelligence AI Assistant Widget */}
      <AiAssistant />
    </main>
  );
}
