'use client';

import React, { useState } from 'react';
import { PRODUCTS, Product } from '@/data/products';
import { 
  Globe, 
  ExternalLink, 
  Monitor, 
  Smartphone, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Layers,
  ArrowRight,
  Maximize2,
  RefreshCw,
  Sliders,
  Check,
  Search,
  Calendar,
  FileText,
  Scale,
  Compass,
  Cpu,
  Zap,
  Building,
  UserCheck
} from 'lucide-react';

export default function LiveSiteShowcase() {
  const [selectedProduct, setSelectedProduct] = useState<Product>(PRODUCTS[0]);
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [viewMode, setViewMode] = useState<'interactive' | 'proxy'>('interactive');
  const [iframeKey, setIframeKey] = useState(0);

  // Interactive Simulator States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'modules' | 'stats'>('dashboard');
  const [simDopRatio, setSimDopRatio] = useState(0.3842);
  const [simUyapQuery, setSimUyapQuery] = useState('2026/1429 Esas');
  const [simLang, setSimLang] = useState<'TR' | 'EN' | 'DE'>('TR');

  const proxyUrl = `/api/preview-proxy?url=${encodeURIComponent(selectedProduct.liveUrl)}`;

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
  };

  return (
    <section id="live-sites" className="py-24 bg-white border-b border-black/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F5F7] border border-black/[0.08] text-xs font-semibold text-[#1D1D1F] mb-4 shadow-xs">
            <Globe className="w-3.5 h-3.5 text-[#0071E3]" />
            <span>Canlı Web Siteleri & Sistem İstasyonu</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#1D1D1F] mb-4">
            Gerçek domainler, <br />
            <span className="text-[#0071E3]">canlıda çalışan web sitelerimiz.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#6E6E73]">
            Aşağıdaki cihaz konsolundan istediğiniz projemizi seçin; tarayıcıda canlı olarak inceleyin veya tek tıkla doğrudan resmi adresine gidin.
          </p>

          {/* Product Selectors */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {PRODUCTS.map(prod => (
              <button
                key={prod.id}
                onClick={() => {
                  setSelectedProduct(prod);
                  setIframeKey(prev => prev + 1);
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-full border transition-all flex items-center gap-1.5 ${
                  selectedProduct.id === prod.id
                    ? 'bg-[#1D1D1F] text-white border-[#1D1D1F] shadow-sm'
                    : 'bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F] border-black/[0.06]'
                }`}
              >
                <span>{prod.displayDomain}</span>
                <span className="text-[10px] opacity-70 font-normal">({prod.categoryLabel.split(' ')[0]})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live Device Studio Frame */}
        <div className="max-w-5xl mx-auto">
          <div className="apple-card bg-[#F5F5F7] p-4 sm:p-7 border border-black/[0.08] shadow-xl">
            
            {/* Browser Window Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/[0.06] mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
                
                {/* URL Bar */}
                <div className="ml-2 flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-black/[0.06] text-xs font-mono text-[#1D1D1F] shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="font-semibold">{selectedProduct.liveUrl}</span>
                </div>

                <button
                  onClick={handleRefresh}
                  title="Yeniden Yükle"
                  className="p-1.5 hover:bg-white rounded-lg text-gray-500 hover:text-black transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Viewport & Mode Switch */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Mode toggle */}
                <div className="flex items-center bg-white p-1 rounded-lg border border-black/[0.06] text-[11px] font-semibold">
                  <button
                    onClick={() => setViewMode('interactive')}
                    className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                      viewMode === 'interactive' ? 'bg-[#0071E3] text-white shadow-2xs' : 'text-[#86868B]'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>İnteraktif Konsol</span>
                  </button>
                  <button
                    onClick={() => setViewMode('proxy')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      viewMode === 'proxy' ? 'bg-[#0071E3] text-white shadow-2xs' : 'text-[#86868B]'
                    }`}
                  >
                    Canlı Site (Web)
                  </button>
                </div>

                {/* Device switch */}
                <div className="flex items-center bg-white p-1 rounded-lg border border-black/[0.06]">
                  <button
                    onClick={() => setDeviceView('desktop')}
                    title="Masaüstü Görünümü"
                    className={`p-1.5 rounded-md transition-all ${
                      deviceView === 'desktop' ? 'bg-[#0071E3] text-white' : 'text-[#86868B]'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeviceView('mobile')}
                    title="Mobil Görünümü"
                    className={`p-1.5 rounded-md transition-all ${
                      deviceView === 'mobile' ? 'bg-[#0071E3] text-white' : 'text-[#86868B]'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>

                <a
                  href={selectedProduct.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="apple-pill-btn px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                >
                  <span>Yeni Sekmede Aç</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Frame Container */}
            <div className={`mx-auto transition-all duration-300 ${
              deviceView === 'mobile' ? 'max-w-sm' : 'w-full'
            }`}>
              <div className="relative rounded-2xl overflow-hidden border border-black/[0.1] bg-white shadow-inner h-[560px]">
                {viewMode === 'proxy' ? (
                  <div className="relative w-full h-full">
                    {/* Security notice hint */}
                    <div className="absolute top-2 left-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-black/[0.06] shadow-xs flex items-center justify-between text-[11px] text-[#6E6E73] z-10">
                      <div className="flex items-center gap-1.5 truncate">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#0071E3] shrink-0" />
                        <span className="truncate">Same-Origin & CSP Korumalı Canlı Görünüm</span>
                      </div>
                      <a
                        href={selectedProduct.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0071E3] font-semibold hover:underline flex items-center gap-0.5 shrink-0 ml-2"
                      >
                        <span>Yeni Sekmede Aç</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>

                    <iframe
                      key={`${selectedProduct.id}-${iframeKey}`}
                      src={proxyUrl}
                      title={selectedProduct.name}
                      className="w-full h-full border-0 bg-white pt-9"
                      loading="eager"
                    />
                    
                    {/* Floating Quick Action Footer inside frame */}
                    <div className="absolute bottom-3 left-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-black/[0.08] shadow-lg flex items-center justify-between z-20">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-semibold text-[#1D1D1F]">Canlı Görünüm Aktif:</span>
                        <span className="text-[#6E6E73] font-mono">{selectedProduct.displayDomain}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewMode('interactive')}
                          className="px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0071E3] text-xs font-semibold transition-colors"
                        >
                          İnteraktif Konsola Geç
                        </button>
                        <a
                          href={selectedProduct.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 rounded-lg bg-[#1D1D1F] hover:bg-black text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span>Siteye Git</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Custom Interactive In-Memory Digital Twin */
                  <div className="w-full h-full p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex flex-col justify-between overflow-y-auto">
                    <div>
                      {/* Top Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4 mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#1D1D1F] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                            {selectedProduct.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-[#1D1D1F] text-base flex items-center gap-2">
                              {selectedProduct.name}
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">
                                {selectedProduct.displayDomain}
                              </span>
                            </h3>
                            <p className="text-xs text-[#86868B]">{selectedProduct.tagline}</p>
                          </div>
                        </div>

                        {/* Interactive Tabs */}
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs">
                          <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                              activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-2xs' : 'text-[#86868B]'
                            }`}
                          >
                            Canlı Arayüz
                          </button>
                          <button
                            onClick={() => setActiveTab('modules')}
                            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                              activeTab === 'modules' ? 'bg-white text-blue-600 shadow-2xs' : 'text-[#86868B]'
                            }`}
                          >
                            Modül Detayı
                          </button>
                          <button
                            onClick={() => setActiveTab('stats')}
                            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                              activeTab === 'stats' ? 'bg-white text-blue-600 shadow-2xs' : 'text-[#86868B]'
                            }`}
                          >
                            Metrikler & SLA
                          </button>
                        </div>
                      </div>

                      {/* Content Based on Tab & Product */}
                      {activeTab === 'dashboard' && (
                        <div className="space-y-4 animate-in fade-in">
                          {/* KGLEX SPECIFIC SIMULATOR */}
                          {selectedProduct.id.includes('kglex') && (
                            <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-[#1D1D1F] flex items-center gap-1.5">
                                  <Scale className="w-4 h-4 text-blue-600" /> UYAP Otonom Dava & İcra Sorgu Konsolu
                                </span>
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                  Robot Aktif (0.33.45)
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={simUyapQuery}
                                  onChange={e => setSimUyapQuery(e.target.value)}
                                  placeholder="Dosya No / Esas No Giriniz..."
                                  className="flex-1 px-3 py-2 text-xs bg-[#F5F5F7] rounded-xl border border-gray-200 font-mono"
                                />
                                <button
                                  type="button"
                                  onClick={() => alert(`${simUyapQuery} için UYAP safahat kaydı getirildi: Tensip zaptı hazırlandı, mazeret onaylandı.`)}
                                  className="px-4 py-2 bg-[#0071E3] hover:bg-blue-600 text-white rounded-xl text-xs font-semibold"
                                >
                                  UYAP Sorgula
                                </button>
                              </div>

                              <div className="grid grid-cols-3 gap-2 pt-2 text-[11px]">
                                <div className="p-2 bg-[#F5F5F7] rounded-xl">
                                  <span className="text-gray-500 block">Mahkeme:</span>
                                  <strong className="text-[#1D1D1F]">İstanbul 14. Asliye Ticaret</strong>
                                </div>
                                <div className="p-2 bg-[#F5F5F7] rounded-xl">
                                  <span className="text-gray-500 block">Son Safahat:</span>
                                  <strong className="text-emerald-700">Tensip Zaptı Düzenlendi</strong>
                                </div>
                                <div className="p-2 bg-[#F5F5F7] rounded-xl">
                                  <span className="text-gray-500 block">Duruşma:</span>
                                  <strong className="text-blue-700">18 Kasım 2026 10:30</strong>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* HARITAPLAN SPECIFIC SIMULATOR */}
                          {selectedProduct.id.includes('harita') && (
                            <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-[#1D1D1F] flex items-center gap-1.5">
                                  <Compass className="w-4 h-4 text-emerald-600" /> 3194 Sayılı İmar Kanunu Md. 18 DOP Hesap Motoru
                                </span>
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                  DOP: %{(simDopRatio * 100).toFixed(2)} (Yasal Sınır İçinde)
                                </span>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                  <span>DOP Terk Oranı Kaydırıcısı:</span>
                                  <span className="font-mono font-bold text-emerald-700">{(simDopRatio * 100).toFixed(2)}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="0.10"
                                  max="0.45"
                                  step="0.005"
                                  value={simDopRatio}
                                  onChange={e => setSimDopRatio(parseFloat(e.target.value))}
                                  className="w-full accent-emerald-600 cursor-pointer"
                                />
                              </div>

                              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                                <div className="p-2 bg-[#F5F5F7] rounded-xl">
                                  <span className="text-gray-500 block">Kadastro Alanı:</span>
                                  <strong className="text-[#1D1D1F]">124.500 m²</strong>
                                </div>
                                <div className="p-2 bg-[#F5F5F7] rounded-xl">
                                  <span className="text-gray-500 block">Kamuya Terk:</span>
                                  <strong className="text-emerald-700">{Math.round(124500 * simDopRatio)} m²</strong>
                                </div>
                                <div className="p-2 bg-[#F5F5F7] rounded-xl">
                                  <span className="text-gray-500 block">Net İmar Parseli:</span>
                                  <strong className="text-blue-700">{Math.round(124500 * (1 - simDopRatio))} m²</strong>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* HG AVUKATLIK & ACIKEL LAW SPECIFIC SIMULATOR */}
                          {(selectedProduct.id.includes('hg') || selectedProduct.id.includes('acikel')) && (
                            <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-[#1D1D1F] flex items-center gap-1.5">
                                  <Building className="w-4 h-4 text-blue-600" /> Çok Dilli Uluslararası Hukuk Portalı
                                </span>
                                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold">
                                  {(['TR', 'EN', 'DE'] as const).map(l => (
                                    <button
                                      key={l}
                                      onClick={() => setSimLang(l)}
                                      className={`px-2 py-0.5 rounded ${simLang === l ? 'bg-white text-blue-600 shadow-2xs' : 'text-gray-500'}`}
                                    >
                                      {l}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="p-3 bg-[#F5F5F7] rounded-xl text-xs space-y-2">
                                <div className="font-semibold text-[#1D1D1F]">
                                  {simLang === 'TR' && 'Uluslararası Ticaret, Şirketler Hukuku & Tahkim'}
                                  {simLang === 'EN' && 'International Commercial Law, Corporate & Arbitration'}
                                  {simLang === 'DE' && 'Internationales Wirtschaftsrecht, Unternehmen & Schiedsverfahren'}
                                </div>
                                <p className="text-[11px] text-gray-600">
                                  {simLang === 'TR' && 'Müvekkillerimiz için online dosya takibi, randevu alma ve güvenli sanal POS ödeme entegrasyonu.'}
                                  {simLang === 'EN' && 'Online case tracking, consultation scheduling and secure payment infrastructure for clients.'}
                                  {simLang === 'DE' && 'Online-Fallverfolgung, Terminvereinbarung und sichere Zahlungsinfrastruktur für Mandanten.'}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* PANELDE / FLAMANT / DIĞER */}
                          {!selectedProduct.id.includes('kglex') && !selectedProduct.id.includes('harita') && !selectedProduct.id.includes('hg') && !selectedProduct.id.includes('acikel') && (
                            <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-[#1D1D1F] flex items-center gap-1.5">
                                  <Cpu className="w-4 h-4 text-purple-600" /> Multi-Tenant Bulut Altyapısı
                                </span>
                                <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                                  Canlıda Yayında
                                </span>
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed">
                                {selectedProduct.longDesc}
                              </p>
                            </div>
                          )}

                          {/* Features grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {selectedProduct.features.map((feat, i) => (
                              <div key={i} className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-gray-200/70 text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="font-medium text-[#1D1D1F] truncate">{feat}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeTab === 'modules' && (
                        <div className="space-y-3 animate-in fade-in text-xs">
                          <div className="p-3.5 bg-white rounded-2xl border border-gray-200/80 space-y-2">
                            <h4 className="font-bold text-[#1D1D1F] flex items-center gap-1.5">
                              <Zap className="w-4 h-4 text-amber-500" /> Mimari Katmanlar ve Çekirdek Servisler
                            </h4>
                            <p className="text-gray-600 text-[11px]">
                              {selectedProduct.longDesc}
                            </p>
                            <div className="flex flex-wrap gap-1.5 pt-2">
                              {selectedProduct.techStack.map((tech, i) => (
                                <span key={i} className="px-2.5 py-1 bg-gray-100 text-[#1D1D1F] font-semibold rounded-lg text-[11px] border border-gray-200/60">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === 'stats' && (
                        <div className="space-y-3 animate-in fade-in text-xs">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div className="p-3 bg-white rounded-xl border border-gray-200 text-center">
                              <span className="text-[10px] text-gray-500 block">Kullanıcı Hacmi</span>
                              <strong className="text-sm text-[#1D1D1F] mt-1 block">{selectedProduct.liveStats.users}</strong>
                            </div>
                            <div className="p-3 bg-white rounded-xl border border-gray-200 text-center">
                              <span className="text-[10px] text-gray-500 block">Uptime Garantisi</span>
                              <strong className="text-sm text-emerald-600 mt-1 block">{selectedProduct.liveStats.uptime}</strong>
                            </div>
                            <div className="p-3 bg-white rounded-xl border border-gray-200 text-center">
                              <span className="text-[10px] text-gray-500 block">İşlem Hacmi</span>
                              <strong className="text-sm text-[#1D1D1F] mt-1 block">{selectedProduct.liveStats.processedVolume}</strong>
                            </div>
                            <div className="p-3 bg-white rounded-xl border border-gray-200 text-center">
                              <span className="text-[10px] text-gray-500 block">Ortalama Yanıt</span>
                              <strong className="text-sm text-blue-600 mt-1 block">{selectedProduct.liveStats.speed}</strong>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Status Bar */}
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-mono text-[#86868B] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                        Domain: https://{selectedProduct.displayDomain}
                      </span>
                      <a
                        href={selectedProduct.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="apple-pill-btn px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                      >
                        <span>Resmi Canlı Siteye Git</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Bottom Overlay Info Banner */}
                <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-black/[0.08] shadow-md flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-[#1D1D1F] block">{selectedProduct.name}</strong>
                    <span className="text-[#86868B] text-[11px]">{selectedProduct.tagline}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={selectedProduct.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="apple-pill-btn px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap"
                    >
                      Siteye Git ({selectedProduct.displayDomain}) ↗
                    </a>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
