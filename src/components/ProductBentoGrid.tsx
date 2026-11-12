'use client';

import React, { useState } from 'react';
import { Product, PRODUCTS } from '@/data/products';
import { 
  ExternalLink, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  ChevronRight,
  Scale,
  Compass,
  ShoppingBag,
  Palmtree,
  Globe
} from 'lucide-react';

interface ProductBentoGridProps {
  onSelectProduct: (product: Product) => void;
  onOpenContact: (productName?: string) => void;
}

type FilterId = 'all' | Product['category'];

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'legal', label: 'Hukuk' },
  { id: 'cad', label: 'Harita & CBS' },
  { id: 'saas', label: 'SaaS' },
  { id: 'ecommerce', label: 'E-Ticaret & AI' },
  { id: 'tourism', label: 'Turizm' },
];

export default function ProductBentoGrid({ onSelectProduct, onOpenContact }: ProductBentoGridProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterId>('all');

  const filteredProducts = selectedFilter === 'all' 
    ? PRODUCTS 
    : PRODUCTS.filter(p => p.category === selectedFilter);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'legal': return <Scale className="w-4 h-4 text-[#0071E3]" />;
      case 'cad': return <Compass className="w-4 h-4 text-[#10B981]" />;
      case 'saas': return <Layers className="w-4 h-4 text-[#8B5CF6]" />;
      case 'ecommerce': return <ShoppingBag className="w-4 h-4 text-[#EC4899]" />;
      case 'tourism': return <Palmtree className="w-4 h-4 text-[#0284C7]" />;
      default: return <Sparkles className="w-4 h-4 text-[#0071E3]" />;
    }
  };

  return (
    <section id="products" className="py-16 sm:py-24 bg-[#F5F5F7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="section-eyebrow">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Gerçek Üretim Portföyü & Canlı Siteler</span>
          </div>
          <h2 className="section-title">
            Canlıda yayında olan <br />
            <span>YSNSOFT imza yazılımları.</span>
          </h2>
          <p className="section-lead">
            Hukuk bürolarından harita mühendislerine, e-ticaret sitelerinden multi-tenant portallara kadar gerçek web adreslerine sahip canlı ürünlerimiz.
          </p>

          {/* Apple-style Filter Pill Tabs */}
          <div role="group" aria-label="Ürünleri kategoriye göre filtrele" className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {FILTERS.map(tab => {
              const count = tab.id === 'all' ? PRODUCTS.length : PRODUCTS.filter(p => p.category === tab.id).length;
              const selected = selectedFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedFilter(tab.id)}
                  className={`inline-flex items-center gap-2 pl-4 pr-3 py-2 text-sm font-medium rounded-full transition-colors ${
                    selected
                      ? 'bg-[#1D1D1F] text-white shadow-sm'
                      : 'bg-white text-[#515154] hover:text-[#1D1D1F] border border-black/[0.08] hover:border-black/[0.16]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`min-w-5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold tabular ${selected ? 'bg-white/20 text-white' : 'bg-black/[0.05] text-[#6E6E73]'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 lg:gap-6">
          
          {filteredProducts.map((prod, index) => {
            const row = Math.floor(index / 2);
            const isFirstInRow = index % 2 === 0;
            const isLoneLast = isFirstInRow && index === filteredProducts.length - 1;
            const colSpan = isLoneLast
              ? 'md:col-span-2 lg:col-span-12'
              : (row % 2 === 0) === isFirstInRow ? 'lg:col-span-7' : 'lg:col-span-5';

            return (
              <article 
                key={prod.id} 
                className={`${colSpan} apple-card p-6 sm:p-8 flex flex-col justify-between group bg-white border border-black/[0.07]`}
              >
                <div>
                  {/* Top Badge & Live URL Pill */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <span 
                      style={{ color: prod.accentColor, backgroundColor: `${prod.accentColor}15` }}
                      className="text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5"
                    >
                      {getCategoryIcon(prod.category)}
                      <span>{prod.badge}</span>
                    </span>

                    {/* Prominent Live Link Chip */}
                    <a
                      href={prod.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F5F7] hover:bg-[#0071E3] text-[#1D1D1F] hover:text-white border border-black/[0.08] text-xs font-semibold transition-all group/link"
                      title={`${prod.displayDomain} sitesine git`}
                    >
                      <Globe className="w-3.5 h-3.5 text-[#0071E3] group-hover/link:text-white" />
                      <span>{prod.displayDomain}</span>
                      <ExternalLink className="w-3 h-3 opacity-60 group-hover/link:opacity-100" />
                    </a>
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="text-2xl sm:text-3xl font-semibold text-[#1D1D1F] mb-1.5 tracking-tight flex items-center justify-between">
                    <span>{prod.name}</span>
                  </h3>

                  <p className="text-[13px] font-medium text-[#0071E3] mb-3">
                    {prod.tagline}
                  </p>
                  <p className="text-[15px] text-[#515154] leading-relaxed mb-6">
                    {prod.shortDesc}
                  </p>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2.5 mb-6">
                    {prod.metrics.map((m, idx) => (
                      <div key={idx} className="bg-[#F5F5F7] p-3 rounded-xl border border-black/[0.03]">
                        <div className="text-[11px] text-[#6E6E73] font-medium leading-tight">{m.label}</div>
                        <div className="text-base sm:text-lg font-semibold tracking-tight text-[#1D1D1F] mt-1 tabular">{m.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Feature Highlights */}
                  <div className="space-y-2 mb-6">
                    {prod.features.slice(0, 3).map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-[13px] text-[#1D1D1F] font-medium">
                        <CheckCircle2 
                          style={{ color: prod.accentColor }} 
                          className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" 
                        />
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Action Row */}
                <div className="pt-4 border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {prod.techStack.slice(0, 2).map((tech, i) => (
                      <span key={i} className="text-[11px] font-medium text-[#6E6E73] bg-[#F5F5F7] px-2 py-0.5 rounded-md whitespace-nowrap">
                        {tech}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={prod.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="apple-pill-btn-secondary px-3.5 py-2 text-[13px] font-medium flex items-center gap-1.5"
                    >
                      <span>Siteyi Aç</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => onSelectProduct(prod)}
                      aria-label={`${prod.name} — detayları gör`}
                      className="apple-pill-btn px-4 py-2 text-[13px] font-medium flex items-center gap-1"
                    >
                      <span>Detayları Gör</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

        </div>
      </div>
    </section>
  );
}
