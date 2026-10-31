'use client';

import React, { useState } from 'react';
import { Product } from '@/data/products';
import { 
  X, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  BarChart3, 
  Layers, 
  Cpu, 
  Check, 
  Copy,
  ExternalLink,
  Globe,
  Maximize2
} from 'lucide-react';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onRequestQuote: (productName: string) => void;
}

export default function ProductModal({ product, onClose, onRequestQuote }: ProductModalProps) {
  const [activeScreenTab, setActiveScreenTab] = useState<'overview' | 'live' | 'analytics' | 'specs'>('overview');
  const [copied, setCopied] = useState(false);

  if (!product) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(product.liveUrl || window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-black/[0.08] overflow-hidden my-8 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-black/[0.06] flex items-center justify-between bg-[#F5F5F7]/80">
          <div className="flex items-center gap-3">
            <span className="bg-[#0071E3]/10 text-[#0071E3] text-xs font-semibold px-3 py-1 rounded-full">
              {product.categoryLabel}
            </span>

            {/* Direct domain link */}
            <a
              href={product.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-[#0071E3] text-[#1D1D1F] hover:text-white border border-black/[0.08] text-xs font-semibold transition-all group"
            >
              <Globe className="w-3.5 h-3.5 text-[#0071E3] group-hover:text-white" />
              <span>{product.displayDomain}</span>
              <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
            </a>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              title="Site Adresini Kopyala"
              className="p-2 text-[#6E6E73] hover:text-[#1D1D1F] rounded-full hover:bg-black/5 transition-colors text-xs flex items-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Kopyalandı' : 'Adresi Paylaş'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#6E6E73] hover:text-[#1D1D1F] rounded-full hover:bg-black/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 max-h-[75vh] overflow-y-auto">
          {/* Title & Tagline & Live Visit Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl sm:text-3xl font-semibold text-[#1D1D1F] tracking-tight mb-1.5">
                {product.name}
              </h3>
              <p className="text-sm text-[#6E6E73]">
                {product.tagline}
              </p>
            </div>

            <a
              href={product.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="apple-pill-btn px-5 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-[#0071E3]/20 shrink-0 self-start sm:self-center"
            >
              <span>Canlı Siteyi Ziyaret Et</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Interactive Screen Preview Container */}
          <div className="bg-[#F5F5F7] rounded-2xl border border-black/[0.06] p-4 sm:p-6 mb-8">
            {/* View Switcher Tabs */}
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] mb-5">
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-black/[0.04]">
                <button
                  onClick={() => setActiveScreenTab('overview')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activeScreenTab === 'overview'
                      ? 'bg-[#1D1D1F] text-white shadow-xs'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  Modül Detayları
                </button>
                <button
                  onClick={() => setActiveScreenTab('live')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activeScreenTab === 'live'
                      ? 'bg-[#1D1D1F] text-white shadow-xs'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  Canlı Site Önizleme ({product.displayDomain})
                </button>
                <button
                  onClick={() => setActiveScreenTab('analytics')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activeScreenTab === 'analytics'
                      ? 'bg-[#1D1D1F] text-white shadow-xs'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  Performans Metrikleri
                </button>
                <button
                  onClick={() => setActiveScreenTab('specs')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activeScreenTab === 'specs'
                      ? 'bg-[#1D1D1F] text-white shadow-xs'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  Mimari & Güvenlik
                </button>
              </div>

              <div className="text-xs text-[#10B981] font-semibold hidden md:flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                Yayında & Aktif
              </div>
            </div>

            {/* TAB: Live Site Iframe / Embed View */}
            {activeScreenTab === 'live' && (
              <div className="bg-white rounded-xl p-4 border border-black/[0.06] shadow-sm animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.04] mb-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#86868B]">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                    <span>{product.liveUrl}</span>
                  </div>
                  <a
                    href={product.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-[#0071E3] hover:underline flex items-center gap-1"
                  >
                    <span>Yeni Sekmede Tam Ekran Aç</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="relative w-full h-[380px] rounded-lg overflow-hidden border border-black/[0.08] bg-[#F5F5F7]">
                  <iframe
                    src={product.liveUrl}
                    title={product.name}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    loading="lazy"
                  />
                  {/* Subtle overlay bar allowing direct open if iframe is restricted */}
                  <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-black/[0.1] text-xs font-medium flex items-center gap-2 shadow-sm">
                    <span className="text-[#6E6E73]">Site açılmıyorsa:</span>
                    <a
                      href={product.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0071E3] font-semibold hover:underline flex items-center gap-1"
                    >
                      {product.displayDomain} ↗
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Overview */}
            {activeScreenTab === 'overview' && (
              <div className="bg-white rounded-xl p-5 border border-black/[0.06] shadow-sm animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.04] mb-4">
                  <div className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0071E3]" />
                    <span>{product.name} — Sistem Mimarisi & Açıklama</span>
                  </div>
                  <span className="text-[11px] font-medium text-[#86868B] bg-[#F5F5F7] px-2.5 py-0.5 rounded-md">
                    {product.displayDomain}
                  </span>
                </div>

                <p className="text-sm text-[#1D1D1F] font-normal leading-relaxed mb-4">
                  {product.longDesc}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {product.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-[#F5F5F7] p-3 rounded-xl border border-black/[0.03]">
                      <CheckCircle2 className="w-4 h-4 text-[#0071E3] shrink-0 mt-0.5" />
                      <span className="text-xs font-medium text-[#1D1D1F]">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: Analytics */}
            {activeScreenTab === 'analytics' && (
              <div className="bg-white rounded-xl p-5 border border-black/[0.06] shadow-sm animate-in fade-in duration-150">
                <span className="text-xs font-semibold text-[#1D1D1F] block mb-4">
                  Gerçek Zamanlı Üretim & Sunucu Metrikleri ({product.displayDomain})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="bg-[#F5F5F7] p-3 rounded-xl">
                    <span className="text-[11px] text-[#86868B]">Aktif Kullanıcı</span>
                    <p className="text-base font-semibold text-[#1D1D1F] mt-1">{product.liveStats.users}</p>
                  </div>
                  <div className="bg-[#F5F5F7] p-3 rounded-xl">
                    <span className="text-[11px] text-[#86868B]">Uptime Oranı</span>
                    <p className="text-base font-semibold text-[#10B981] mt-1">{product.liveStats.uptime}</p>
                  </div>
                  <div className="bg-[#F5F5F7] p-3 rounded-xl">
                    <span className="text-[11px] text-[#86868B]">İşlem Hacmi</span>
                    <p className="text-base font-semibold text-[#1D1D1F] mt-1">{product.liveStats.processedVolume}</p>
                  </div>
                  <div className="bg-[#F5F5F7] p-3 rounded-xl">
                    <span className="text-[11px] text-[#86868B]">Ortalama Yanıt Hızı</span>
                    <p className="text-base font-semibold text-[#0071E3] mt-1">{product.liveStats.speed}</p>
                  </div>
                </div>

                <div className="p-3 bg-[#0071E3]/5 rounded-xl border border-[#0071E3]/15 text-xs text-[#0071E3] font-medium flex items-center justify-between">
                  <span>💡 Bu metrikler son 30 günlük üretim kümesindeki canlı telemetri verilerine dayanmaktadır.</span>
                  <a
                    href={product.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline ml-2 whitespace-nowrap"
                  >
                    Siteye Git ↗
                  </a>
                </div>
              </div>
            )}

            {/* TAB: Specs */}
            {activeScreenTab === 'specs' && (
              <div className="bg-white rounded-xl p-5 border border-black/[0.06] shadow-sm animate-in fade-in duration-150">
                <span className="text-xs font-semibold text-[#1D1D1F] block mb-4">
                  Kullanılan Teknolojiler & Güvenlik Standartları
                </span>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {product.techStack.map((tech, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-[#F5F5F7] text-xs font-semibold text-[#1D1D1F] rounded-lg border border-black/[0.04]">
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="space-y-2 text-xs text-[#6E6E73]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                    <span>Uçtan Uca AES-256 Şifreleme ve TLS 1.3 Protokolü</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#F59E0B]" />
                    <span>Cloudflare Edge Caching & Otomatik DDoS Koruması</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#0071E3]" />
                    <span>RESTful & GraphQL API Uç Noktaları ile Kolay Entegrasyon</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {product.metrics.map((metric, i) => (
              <div key={i} className="text-center p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.04]">
                <div className="text-xs text-[#86868B]">{metric.label}</div>
                <div className="text-xl sm:text-2xl font-semibold text-[#1D1D1F] mt-1">{metric.value}</div>
              </div>
            ))}
          </div>

          {/* Conversion Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-black/[0.06]">
            <div>
              <span className="text-xs text-[#86868B]">Şirketinize Özel Kurulum</span>
              <p className="text-sm font-semibold text-[#1D1D1F]">Canlı demo ve özel fiyat teklifi için hazırız.</p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <a
                href={product.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-5 py-3 text-xs sm:text-sm font-medium text-[#1D1D1F] hover:bg-black/5 rounded-full transition-colors flex items-center justify-center gap-1.5"
              >
                <span>{product.displayDomain}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => {
                  onRequestQuote(product.name);
                  onClose();
                }}
                className="w-full sm:w-auto apple-pill-btn px-6 py-3 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-md shadow-[#0071E3]/20"
              >
                <span>Bu Ürün İçin Teklif Al</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
