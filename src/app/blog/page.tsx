'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Clock, Tag, User, Terminal, ChevronRight, Share2, Sparkles } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  readTime: string;
  date: string;
  author: { name: string; role: string; avatar: string };
  summary: string;
  tags: string[];
  content: {
    problem: string;
    solution: string;
    architectureSnippet: string;
    metrics: { label: string; value: string }[];
  };
}

const blogPosts: BlogPost[] = [
  {
    id: 'post-1',
    title: 'UYAP Bot Otomasyonu: 500+ Hukuk Bürosunda Sıfır Kesintiyle Günlük 50.000 Dosya Taraması',
    slug: 'uyap-bot-otomasyonu-kglex-mimari',
    category: 'LegalTech & Bot Architecture',
    readTime: '6 dk okuma',
    date: '28 Ekim 2026',
    author: { name: 'Yasin Yıldırım', role: 'Chief Software Architect & Founder', avatar: '👨‍💼' },
    summary: 'T.C. Adalet Bakanlığı UYAP Portalındaki oturum düşmeleri, dinamik DOM ağacı ve re-captcha engellerini Python Playwright havuzu ve Redis kuyruk mimarisiyle nasıl aştık?',
    tags: ['Next.js 16', 'Python', 'Playwright', 'Redis', 'Kubernetes', 'KGLEX'],
    content: {
      problem: 'Avukatların her sabah tensip zabıtlarını, icra haciz müzekkerelerini ve duruşma tarihlerini UYAP üzerinden tek tek manuel sorgulaması günde ortalama 3 saatlik iş gücü kaybına yol açıyordu.',
      solution: 'KGLEX bünyesinde Kubernetes tabanlı dinamik worker havuzları kurguladık. Her bir işçi bot, SSL mTLS sertifikası ve oturum önbelleği ile gece 02:00 - 06:00 arasında tüm büronun dosyalarını tarayarak değişiklikleri diff algoritmasıyla ayrıştırır ve sabah avukatın ekranına özet bülten olarak sunar.',
      architectureSnippet: `// KGLEX Queue Worker Consumer (Go / Python)
func (w *UyapWorker) ProcessCaseAudit(ctx context.Context, caseRef *LegalCase) (*AuditReport, error) {
    session, err := w.sessionPool.AcquireMTLS(caseRef.BaroNumber)
    if err != nil {
        return nil, fmt.Errorf("uyap session failed: %w", err)
    }
    defer w.sessionPool.Release(session)
    
    events := session.FetchNewSafahatEntries(caseRef.FileID, caseRef.LastSyncDate)
    return w.diffEngine.GenerateReport(events)
}`,
      metrics: [
        { label: 'Günlük Taranan Dosya', value: '50.000+' },
        { label: 'Zaman Tasarrufu', value: '%85' },
        { label: 'Hata Oranı', value: '%0.002' }
      ]
    }
  },
  {
    id: 'post-2',
    title: '3194 Sayılı İmar Kanunu Madde 18: Web Tabanlı 3D Parselasyon ve DOP Hesaplama Algoritması',
    slug: '3194-madde-18-dop-haritaplan-webgl',
    category: 'GIS & Computational Geometry',
    readTime: '8 dk okuma',
    date: '22 Ekim 2026',
    author: { name: 'Harita Müh. Danışman & YSN Ekibi', role: 'GIS Lead', avatar: '📐' },
    summary: 'Masaüstü CAD programlarına bağımlı kalmadan tarayıcı üzerinde 300+ hektarlık imar adalarını saniyeler içinde parselleyen WebGL ve PostGIS matematik motoru.',
    tags: ['WebGL', 'Three.js', 'PostGIS', 'Computational Geometry', 'HaritaPlan'],
    content: {
      problem: 'Geleneksel imar uygulamalarında DOP (Düzenleme Ortaklık Payı) hesabı Excel ve eski CAD eklentilerinde yapıldığından 1 metrekarelik küsurat yuvarlama hataları dahi Danıştay iptal davalarına neden oluyordu.',
      solution: 'HaritaPlan için geliştirdiğimiz ITRF95 projeksiyon motoru ve Voronoi tabanlı parselasyon algoritması ile kamulaştırma bedelleri, belediye hisse oranları ve DOP payları 0.0001 hassasiyetle hesaplanarak anında 3D görselleştirilir.',
      architectureSnippet: `// HaritaPlan DOP Calculation Kernel
export function calculateDOP(kadastroParseller: KadastroParcel[], kamuTerkAlan: number): DOPResult {
    const toplamKadastroAlani = kadastroParseller.reduce((acc, p) => acc + p.alan, 0);
    const dopOrani = kamuTerkAlan / toplamKadastroAlani;
    if (dopOrani > 0.45) {
        throw new Error("DOP oranı yasal %45 tavan sınırını aşıyor (3194 Md. 18)");
    }
    return { dopOrani, tahsisCetveli: kadastroParseller.map(p => ({ ...p, imarTahsis: p.alan * (1 - dopOrani) })) };
}`,
      metrics: [
        { label: 'Hesaplama Süresi', value: '< 180ms' },
        { label: 'Hata Hassasiyeti', value: '0.0001 m²' },
        { label: 'Mevzuat Uyumu', value: '%100' }
      ]
    }
  },
  {
    id: 'post-3',
    title: 'Next.js 16 Edge & React 19 ile 24ms Sayfa Açılış Hızı: E-Ticarette Dönüşüm Optimizasyonu',
    slug: 'nextjs-16-edge-react-19-flamantyou',
    category: 'Frontend Performance & AI',
    readTime: '5 dk okuma',
    date: '16 Ekim 2026',
    author: { name: 'Yasin Yıldırım', role: 'Frontend & Cloud Architect', avatar: '👨‍💼' },
    summary: 'Flamantyou kozmetik platformunda Core Web Vitals skorlarını 100/100 seviyesine nasıl çıkardık? Partial Prerendering ve Edge Image Optimization deneyimleri.',
    tags: ['Next.js 16', 'React 19', 'Edge Network', 'Turbopack', 'Flamantyou'],
    content: {
      problem: 'Görsel yoğunluğu yüksek e-ticaret sitelerinde 3 saniyenin üzerindeki yüklenme süreleri dönüşüm oranlarında %40 düşüşe ve yüksek reklam maliyetlerine sebep oluyordu.',
      solution: 'Next.js 16 App Router ve React 19 Streaming SSR kullanarak sayfa iskeletini 14ms içinde kullanıcıya ulaştırdık. MediaPipe AI cilt analizi modellerini ise istemci tarafında WebAssembly ile GPU hızlandırmalı çalıştırdık.',
      architectureSnippet: `// Next.js 16 App Router Partial Prerendering Config
export const experimental_ppr = true;
export const runtime = 'edge';

export default async function ProductShowcase() {
    return (
        <Suspense fallback={<ProductCardSkeleton />}>
            <DynamicProductStreamer />
        </Suspense>
    );
}`,
      metrics: [
        { label: 'TTFB (İlk Bayt Süresi)', value: '14 ms' },
        { label: 'Lighthouse Performans', value: '100 / 100' },
        { label: 'Dönüşüm Artışı', value: '+%38' }
      ]
    }
  }
];

export default function BlogPage() {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] selection:bg-blue-500 selection:text-white pb-24">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-xs font-semibold text-[#86868B] hover:text-[#1D1D1F] transition-colors bg-gray-100 px-3 py-1.5 rounded-full"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Ana Sayfaya Dön
            </Link>
            <div className="h-4 w-[1px] bg-gray-300 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-lg">YSNSOFT</span>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-semibold">
                Mühendislik & Ar-Ge Günlüğü
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/portal"
              className="text-xs font-semibold px-3.5 py-1.5 bg-[#1D1D1F] text-white rounded-full hover:bg-black transition-all shadow-sm"
            >
              Müşteri Takip Portalı
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Body */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 space-y-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 rounded-full text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Mühendislik Mimarisi & Ar-Ge Notları
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1D1D1F]">
            Nasıl İnşa Ediyoruz?
          </h1>
          <p className="text-sm text-[#86868B] mt-2">
            KGLEX, HaritaPlan ve Panelde gibi enterprise SaaS ürünlerimizin mutfağındaki mimari kararlar, ölçekleme teknikleri ve kaynak kod analizleri.
          </p>
        </div>

        {/* Selected Post Modal / Reader */}
        {selectedPost && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200/90 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <button
                onClick={() => setSelectedPost(null)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Makale Listesine Dön
              </button>
              <span className="text-xs text-[#86868B] flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5" /> {selectedPost.readTime}
              </span>
            </div>

            <div>
              <div className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">
                {selectedPost.category}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F] leading-tight">
                {selectedPost.title}
              </h2>
              <div className="flex items-center gap-3 mt-4 text-xs text-[#86868B]">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-sm">
                  {selectedPost.author.avatar}
                </div>
                <span>{selectedPost.author.name} • {selectedPost.author.role}</span>
                <span>•</span>
                <span>{selectedPost.date}</span>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-[#F5F5F7] rounded-2xl border border-gray-200/60 text-center">
              {selectedPost.content.metrics.map((m, i) => (
                <div key={i}>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{m.value}</div>
                  <div className="text-[11px] text-[#86868B] font-medium mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Problem & Solution */}
            <div className="space-y-4 text-sm leading-relaxed text-[#333]">
              <div>
                <h4 className="font-bold text-[#1D1D1F] text-base mb-1">Mühendislik Problemi</h4>
                <p>{selectedPost.content.problem}</p>
              </div>

              <div>
                <h4 className="font-bold text-[#1D1D1F] text-base mb-1">YSNSOFT Çözüm Mimarisi</h4>
                <p>{selectedPost.content.solution}</p>
              </div>

              {/* Code snippet */}
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-gray-400 bg-[#1D1D1F] px-4 py-2.5 rounded-t-xl">
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <Terminal className="w-3.5 h-3.5 text-blue-400" /> Üretim Kodu Kesiti
                  </span>
                  <span>TypeScript / Go</span>
                </div>
                <pre className="p-4 bg-[#141416] text-blue-300 font-mono text-xs overflow-x-auto rounded-b-xl border border-gray-800">
                  <code>{selectedPost.content.architectureSnippet}</code>
                </pre>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
              {selectedPost.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-gray-100 text-xs font-medium text-[#1D1D1F] rounded-lg"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Blog Post Cards Grid */}
        <div className="space-y-4">
          {blogPosts.map(post => (
            <article
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200/60 inline-block w-fit">
                  {post.category}
                </span>
                <div className="flex items-center gap-3 text-xs text-[#86868B]">
                  <span>{post.readTime}</span>
                  <span>•</span>
                  <span>{post.date}</span>
                </div>
              </div>

              <h3 className="text-xl font-bold text-[#1D1D1F] group-hover:text-blue-600 transition-colors leading-snug">
                {post.title}
              </h3>

              <p className="text-xs sm:text-sm text-[#86868B] mt-2.5 leading-relaxed line-clamp-2">
                {post.summary}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-100">
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.slice(0, 4).map((tag, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-medium px-2 py-0.5 bg-gray-100 text-[#555] rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Teknik İncelemeyi Oku <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
