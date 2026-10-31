'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Layers, 
  Cpu, 
  Database, 
  Cloud, 
  Terminal, 
  Lock, 
  Zap, 
  CheckCircle2, 
  Network,
  Bot
} from 'lucide-react';

export default function ArchitectureBlueprint() {
  const [activeLayer, setActiveLayer] = useState<'client' | 'gateway' | 'intelligence' | 'data' | 'security'>('client');

  const layers = [
    {
      id: 'client',
      title: '1. İstemci & Edge Katmanı',
      icon: Layers,
      color: '#0071E3',
      badge: 'Turbopack Edge',
      tech: ['Next.js 16 App Router', 'React 19', 'Three.js 3D WebGL', 'Expo / React Native Mobil'],
      description: 'Kullanıcının karşılaştığı tüm ekranlar coğrafi olarak en yakın sunucudan milisaniyeler içinde yüklenir. Three.js ile 3D harita gabarisi doğrudan tarayıcıda işlenir.'
    },
    {
      id: 'gateway',
      title: '2. API Ağ Geçidi & Soketler',
      icon: Network,
      color: '#10B981',
      badge: 'Ultra Düşük Gecikme',
      tech: ['Node.js & Express 4', 'Socket.IO Canlı İletişim', 'RESTful & GraphQL', 'Rate Limiting & CORS'],
      description: 'Panelde’nin 25.000+ eşzamanlı emlak danışmanını senkronize eden, sanal POS ve e-fatura hareketlerini yöneten yüksek verimli servis mimarisi.'
    },
    {
      id: 'intelligence',
      title: '3. Robotik & Yapay Zeka Çekirdeği',
      icon: Bot,
      color: '#8B5CF6',
      badge: 'Otonom Otomasyon',
      tech: ['Python UYAP Botu', 'OCR Belge Ayrıştırıcı', 'Yerel LLM RAG', 'TensorFlow Cilt Analizi'],
      description: 'KGLEX için UYAP portallarını 7/24 tarayan otonom robotlar ve Flamantyou için kamera görüntüsünden cilt tipini tespit eden yapay zeka modelleri.'
    },
    {
      id: 'data',
      title: '4. Veri & Önbellek Mimarisi',
      icon: Database,
      color: '#F59E0B',
      badge: 'Yüksek Erişilebilirlik',
      tech: ['PostgreSQL & Prisma ORM', 'MariaDB (Sequelize)', 'Redis In-Memory Cache', 'Cloudflare R2 / S3'],
      description: 'Milyonlarca UYAP evrakını, kadastro parsel verilerini ve e-ticaret siparişlerini mikrosaniyeler içinde indeksleyen, otomatik çoğaltmalı veri tabanı kümesi.'
    },
    {
      id: 'security',
      title: '5. Kurumsal Güvenlik & KVKK',
      icon: ShieldCheck,
      color: '#EC4899',
      badge: 'ISO 27001 Uyumlu',
      tech: ['TLS 1.3 & AES-256', 'Cloudflare WAF / Anti-DDoS', 'KVKK & GDPR Denetim Logları', 'Mobil E-İmza & KEP'],
      description: 'Avukatların müvekkil sırları ve e-ticaret kullanıcılarının ödeme bilgileri banka düzeyinde şifreleme ve sürekli güvenlik izleme protokolleriyle korunur.'
    }
  ];

  const current = layers.find(l => l.id === activeLayer) || layers[0];

  return (
    <section className="py-24 bg-[#F5F5F7] border-b border-black/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-black/[0.08] text-xs font-semibold text-[#1D1D1F] mb-4 shadow-xs">
            <Cpu className="w-3.5 h-3.5 text-[#0071E3]" />
            <span>Mühendislik & Sistem Mimarisi</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#1D1D1F] mb-4">
            Büyük ölçekler için <br />
            <span className="text-[#0071E3]">kaya gibi sağlam mimari.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#6E6E73]">
            Sistemlerimizin arkasındaki 5 katmanlı yüksek performanslı bulut topolojisini interaktif olarak inceleyin.
          </p>
        </div>

        {/* Interactive Architecture Stack */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-5xl mx-auto">
          
          {/* Layer Selector (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            {layers.map(layer => {
              const Icon = layer.icon;
              const isActive = activeLayer === layer.id;
              return (
                <div
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id as any)}
                  className={`p-4 rounded-2xl cursor-pointer border transition-all flex items-center justify-between ${
                    isActive
                      ? 'bg-white border-[#0071E3] shadow-md ring-2 ring-[#0071E3]/20 translate-x-1'
                      : 'bg-white/70 border-black/[0.06] hover:bg-white hover:border-black/[0.12]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      style={{ color: layer.color, backgroundColor: `${layer.color}15` }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#1D1D1F]">{layer.title}</h4>
                      <span className="text-[11px] text-[#86868B]">{layer.badge}</span>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#0071E3]' : 'bg-transparent'}`} />
                </div>
              );
            })}
          </div>

          {/* Layer Detail Blueprint Box (7 Cols) */}
          <div className="lg:col-span-7">
            <div className="apple-card bg-white p-6 sm:p-8 border border-black/[0.08] shadow-md min-h-[420px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] mb-6">
                  <span 
                    style={{ color: current.color, backgroundColor: `${current.color}15` }}
                    className="text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5"
                  >
                    <current.icon className="w-4 h-4" />
                    <span>{current.badge}</span>
                  </span>
                  <span className="text-xs text-[#86868B] font-medium">
                    Aktif Katman Özellikleri
                  </span>
                </div>

                <h3 className="text-2xl font-semibold text-[#1D1D1F] mb-3">
                  {current.title}
                </h3>
                <p className="text-sm text-[#6E6E73] leading-relaxed mb-6">
                  {current.description}
                </p>

                {/* Tech Badges in this layer */}
                <div className="mb-6">
                  <span className="text-xs font-bold text-[#86868B] uppercase tracking-wider block mb-2.5">
                    Kullanılan Kütüphaneler & Motorlar:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {current.tech.map((t, idx) => (
                      <div key={idx} className="p-3 bg-[#F5F5F7] rounded-xl border border-black/[0.04] text-xs font-semibold text-[#1D1D1F] flex items-center gap-2">
                        <CheckCircle2 style={{ color: current.color }} className="w-4 h-4 shrink-0" />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Security & Reliability Callout */}
              <div className="p-4 bg-[#F5F5F7] rounded-2xl border border-black/[0.04] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#1D1D1F] font-medium">
                  <Lock className="w-4 h-4 text-[#10B981]" />
                  <span>Sıfır Güven (Zero-Trust) & Otomatik Yedeklilik</span>
                </div>
                <span className="text-[#10B981] font-semibold">99.99% Uptime</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
