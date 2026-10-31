'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, CheckCircle2, Clock, ShieldCheck, AlertCircle, 
  FileText, Download, GitCommit, Users, Terminal, ExternalLink, 
  Send, Sparkles, Server, Layers, Cpu, Check
} from 'lucide-react';

interface ProjectMilestone {
  title: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  date: string;
  description: string;
  deliverables: string[];
}

interface ProjectData {
  code: string;
  clientName: string;
  projectName: string;
  domain: string;
  category: string;
  overallProgress: number;
  currentSprint: string;
  startDate: string;
  targetLaunch: string;
  techStack: string[];
  team: { name: string; role: string; avatar: string }[];
  milestones: ProjectMilestone[];
  gitActivity: { hash: string; msg: string; time: string; branch: string }[];
  invoices: { no: string; title: string; amount: string; status: 'paid' | 'pending' }[];
}

const mockProjects: Record<string, ProjectData> = {
  'YSN-KGLEX-2026': {
    code: 'YSN-KGLEX-2026',
    clientName: 'Açıkel Hukuk & Arabuluculuk',
    projectName: 'KGLEX Hukuk & UYAP Bot Otomasyonu',
    domain: 'kglex.com',
    category: 'LegalTech SaaS',
    overallProgress: 92,
    currentSprint: 'Sprint 6 / 6 (Canlıya Alım & UYAP Stres Testleri)',
    startDate: '15 Ağustos 2026',
    targetLaunch: '10 Kasım 2026',
    techStack: ['Next.js 16', 'Python Playwright', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes'],
    team: [
      { name: 'Yasin Yıldırım', role: 'Lead Solutions Architect & Founder', avatar: '👨‍💼' },
      { name: 'Eren K.', role: 'Senior Backend & UYAP Bot Eng', avatar: '⚡' },
      { name: 'Deniz A.', role: 'Frontend & UI/UX Specialist', avatar: '🎨' }
    ],
    milestones: [
      {
        title: 'Mimari Tasarım & UYAP Protokol Analizi',
        status: 'completed',
        date: '20 Ağustos 2026',
        description: 'T.C. Adalet Bakanlığı UYAP Portal API & bot simülasyon protokolleri belirlendi.',
        deliverables: ['Yazılım Mimari Şartnamesi (SRS)', 'Veritabanı ER Diyagramı', 'Siber Güvenlik Matrisi']
      },
      {
        title: 'Çekirdek Dava & İcra Takip Motoru',
        status: 'completed',
        date: '10 Eylül 2026',
        description: 'Dava dosya indeksleme, tensip zaptı OCR ayrıştırıcı ve mazeret botu tamamlandı.',
        deliverables: ['Dava Yönetim API', 'İcra Dosyası Sorgulama Servisi', 'Webhook Dinleyiciler']
      },
      {
        title: 'Müvekkil Portalı & E-Tahsilat Entegrasyonu',
        status: 'completed',
        date: '05 Ekim 2026',
        description: 'Müvekkillerin dosya safahatını SMS doğrulamasıyla takip edebileceği web arayüzü kuruldu.',
        deliverables: ['Client Portal UI', 'İyzico / PayTR Sanal POS', 'SMS OTP Servisi']
      },
      {
        title: 'UYAP Otomatik Bot Entegrasyonu & Yük Testi',
        status: 'in_progress',
        date: '30 Ekim 2026',
        description: 'Günde 15.000 dosya taraması yapan bot kümesinin yük ve re-captcha dayanıklılık testleri sürüyor.',
        deliverables: ['K8s Worker Pool', 'Prometheus Uptime Monitor', 'Otomatik Hata Loglama']
      },
      {
        title: 'Resmi Prodüksiyon Lansmanı & Personel Eğitimi',
        status: 'upcoming',
        date: '10 Kasım 2026',
        description: 'Büro avukatlarına interaktif onboarding ve canlı sistem geçişi.',
        deliverables: ['Kullanıcı El Kitabı', 'Video Eğitim Seti', '7/24 SLA Desteği']
      }
    ],
    gitActivity: [
      { hash: 'e9a4f21', msg: 'fix(uyap-bot): optimize proxy rotation pool during night scans', time: '2 saat önce', branch: 'main' },
      { hash: '7c8b10d', msg: 'feat(portal): add instant PDF export for court hearing timeline', time: '6 saat önce', branch: 'release/v1.0' },
      { hash: '3a1f94e', msg: 'perf(db): add composite index on case_number and court_id', time: '1 gün önce', branch: 'main' }
    ],
    invoices: [
      { no: 'YSN2026000000142', title: 'KGLEX SaaS Yıllık Lisans & UYAP Bot Entegrasyonu', amount: '₺180.000', status: 'paid' },
      { no: 'YSN2026000000145', title: 'Sprint 5-6 Canlıya Alım & Cloud Sunucu Bakımı', amount: '₺65.000', status: 'pending' }
    ]
  },
  'YSN-HARITA-2026': {
    code: 'YSN-HARITA-2026',
    clientName: 'HaritaPlan CBS & Mühendislik',
    projectName: 'HaritaPlan 3194 Md. 18 & 3D WebGL Parselasyon',
    domain: 'haritaplan.com',
    category: 'GIS & CAD Platform',
    overallProgress: 85,
    currentSprint: 'Sprint 5 / 6 (WebGL 3D Render & İmar Cetvelleri)',
    startDate: '01 Eylül 2026',
    targetLaunch: '25 Kasım 2026',
    techStack: ['React 19', 'Three.js / WebGL', 'PostGIS', 'Node.js GeoJSON', 'Tailwind CSS'],
    team: [
      { name: 'Yasin Ş. (YSN)', role: 'GIS Architect & Tech Lead', avatar: '🗺️' },
      { name: 'Kerem B.', role: 'Three.js / WebGL Developer', avatar: '📐' }
    ],
    milestones: [
      {
        title: '3194 Sayılı Kanun Md. 18 Matematiksel Hesap Motoru',
        status: 'completed',
        date: '15 Eylül 2026',
        description: 'DOP (Düzenleme Ortaklık Payı) algoritması ve hisse dağıtım tabloları oluşturuldu.',
        deliverables: ['DOP Hesap Motoru', 'Hisse Çözümleme Algoritması', 'Birim Test Paketi']
      },
      {
        title: 'DXF / Netcad NCN Dosya Ayrıştırıcı API',
        status: 'completed',
        date: '08 Ekim 2026',
        description: 'Kadastro mühendislerinin CAD dosyalarını web tarayıcısına sürükleyip bırakabilmesi sağlandı.',
        deliverables: ['DXF Parser', 'GeoJSON Koordinat Dönüştürücü', 'ITRF95 Projeksiyon Motoru']
      },
      {
        title: 'WebGL 3D Uydu & Parsel Görüntüleyici',
        status: 'in_progress',
        date: '28 Ekim 2026',
        description: 'Arazi eğimi ve bina gabarilerini interaktif 3D sahneye döken görselleştirici entegre ediliyor.',
        deliverables: ['Three.js Shaders', '3D Parsel Extrusion', 'Yükseklik Haritası Doku Katmanı']
      },
      {
        title: 'Resmi Belediye İmar Dağıtım Cetveli PDF Motoru',
        status: 'upcoming',
        date: '15 Kasım 2026',
        description: 'Mevzuata uygun formatta resmi tapu sicil ve belediye onay cetvelleri üretimi.',
        deliverables: ['A3/A4 Vektörel PDF Çıktı', 'E-İmza Entegrasyonu']
      }
    ],
    gitActivity: [
      { hash: 'f21a89c', msg: 'feat(cad): support polyline smoothing for irregular parcel borders', time: '4 saat önce', branch: 'feature/cad-engine' },
      { hash: '109dbca', msg: 'fix(dop): handle rounding precision edge cases on 0.45 threshold', time: '1 gün önce', branch: 'main' }
    ],
    invoices: [
      { no: 'YSN2026000000143', title: '3194 Madde 18 DOP Hesaplama Motoru (Sprint 1-3)', amount: '₺342.000', status: 'paid' },
      { no: 'YSN2026000000146', title: '3D WebGL Parselasyon & İmar Dağıtım Modülü', amount: '₺120.000', status: 'pending' }
    ]
  },
  'YSN-PANELDE-2026': {
    code: 'YSN-PANELDE-2026',
    clientName: 'Panelde Emlak Teknolojileri',
    projectName: 'Panelde Multi-Tenant Gayrimenkul SaaS',
    domain: 'panelde.com',
    category: 'PropTech SaaS',
    overallProgress: 100,
    currentSprint: 'Sprint Tamamlandı (Canlıda & Aktif Bakım)',
    startDate: '10 Mayıs 2026',
    targetLaunch: '15 Eylül 2026',
    techStack: ['Next.js 16', 'NestJS Microservices', 'PostgreSQL', 'AWS S3', 'Redis'],
    team: [
      { name: 'Yasin Ş. (YSN)', role: 'Enterprise Cloud Architect', avatar: '🏢' },
      { name: 'Bora T.', role: 'DevOps & Multi-Tenant Specialist', avatar: '☁️' }
    ],
    milestones: [
      {
        title: 'Multi-Tenant Çoklu Kiracılı Veritabanı Mimarisi',
        status: 'completed',
        date: '01 Haziran 2026',
        description: 'Her emlak ofisi için izole şema ve özel alt alan adı (subdomain) altyapısı.',
        deliverables: ['Multi-Tenant Routing', 'PostgreSQL Row Level Security']
      },
      {
        title: 'Portal Çapraz İlan Senkronizasyon Botları',
        status: 'completed',
        date: '20 Temmuz 2026',
        description: 'Tek tıkla Sahibinden ve HepsiEmlak ilan aktarım köprüsü.',
        deliverables: ['Sync Engine', 'Watermark Görsel İşleme']
      },
      {
        title: 'Canlı Prodüksiyon Lansmanı & %99.98 Uptime',
        status: 'completed',
        date: '15 Eylül 2026',
        description: '350+ aktif emlak ofisiyle başarılı prodüksiyon açılışı.',
        deliverables: ['Canlı Domain (panelde.com)', 'SLA Bakım Protokolü']
      }
    ],
    gitActivity: [
      { hash: 'a1b2c3d', msg: 'chore: routine security update for Next 16 edge functions', time: '3 gün önce', branch: 'main' }
    ],
    invoices: [
      { no: 'YSN2026000000120', title: 'Panelde Core SaaS Platform Geliştirme Bedeli', amount: '₺420.000', status: 'paid' }
    ]
  },
  'YSN-HG-2026': {
    code: 'YSN-HG-2026',
    clientName: 'HG Avukatlık & Açıkel Hukuk',
    projectName: 'HG Avukatlık & Açıkel Law Çok Dilli Portalı',
    domain: 'hgavukatlik.com',
    category: 'LegalTech & Kurumsal Portal',
    overallProgress: 96,
    currentSprint: 'Sprint 4 / 4 (Çok Dilli SEO & Sanal POS Canlı Geçiş)',
    startDate: '10 Temmuz 2026',
    targetLaunch: '05 Kasım 2026',
    techStack: ['Next.js 16', 'React 19', 'Iyzico 3D Secure', 'Tailwind CSS', 'TypeScript'],
    team: [
      { name: 'Yasin Yıldırım', role: 'Solutions Architect & Founder', avatar: '👨‍💼' },
      { name: 'Deniz A.', role: 'Frontend & Multilingual Specialist', avatar: '🌐' }
    ],
    milestones: [
      {
        title: 'Çok Dilli Mimari (TR/EN/DE/AR) ve Kurumsal Tasarım',
        status: 'completed',
        date: '25 Temmuz 2026',
        description: 'Uluslararası tahkim ve şirketler hukuku için SEO uyumlu Cupertino arayüzü kodlandı.',
        deliverables: ['i18n Dil Motoru', 'Responsive Apple Tasarım Şablonları']
      },
      {
        title: 'Şifreli Müvekkil Dosya Kasası & Portal Girişi',
        status: 'completed',
        date: '15 Ağustos 2026',
        description: 'Müvekkillerin dava dosyalarını, duruşma tarihlerini ve raporları incelediği portal tamamlandı.',
        deliverables: ['Client Portal Authentication', 'Güvenli Evrak İndirme']
      },
      {
        title: 'Iyzico Sanal POS Online Vekalet & Harç Tahsilatı',
        status: 'completed',
        date: '20 Eylül 2026',
        description: 'Tek tıkla kredi kartıyla güvenli 3D Secure ödeme altyapısı devreye alındı.',
        deliverables: ['Sanal POS Entegrasyonu', 'Otomatik E-Makbuz Üretici']
      },
      {
        title: 'Açıkel Hukuk (acikellaw.com) Entegrasyonu & Canlı Lansman',
        status: 'in_progress',
        date: '02 Kasım 2026',
        description: 'Açıkel Law kardeş domaini ile tek merkezden yönetilen içerik ağı aktif ediliyor.',
        deliverables: ['Multi-Domain Routing', 'Canlı SSL Yapılandırması']
      }
    ],
    gitActivity: [
      { hash: 'b4c5d6e', msg: 'feat(i18n): finalize German and Arabic legal disclaimer translations', time: '1 saat önce', branch: 'main' },
      { hash: '8e9f0a1', msg: 'fix(iyzico): ensure callback URL handles multi-currency GBP and EUR', time: '12 saat önce', branch: 'main' }
    ],
    invoices: [
      { no: 'YSN2026000000138', title: 'HG & Açıkel Çok Dilli Portal Tasarım & Geliştirme', amount: '₺160.000', status: 'paid' },
      { no: 'YSN2026000000147', title: 'Sanal POS & Müvekkil Kasası Canlıya Geçiş', amount: '₺45.000', status: 'pending' }
    ]
  },
  'YSN-SAMATYA-2026': {
    code: 'YSN-SAMATYA-2026',
    clientName: 'Tarihi Samatya Mezecisi Gıda Ltd.',
    projectName: 'Tarihi Samatya Mezecisi B2B/B2C & QR POS',
    domain: 'tarihisamatyamezecisi.com',
    category: 'Gıda & Restoran SaaS',
    overallProgress: 100,
    currentSprint: 'Sprint Tamamlandı (Canlıda & Aktif Hizmet Veriyor)',
    startDate: '10 Haziran 2026',
    targetLaunch: '15 Ekim 2026',
    techStack: ['Next.js 16', 'React 19', 'Socket.io', 'Thermal Printer Driver', 'Tailwind CSS'],
    team: [
      { name: 'Yasin Yıldırım', role: 'Solutions Architect & Founder', avatar: '👨‍💼' },
      { name: 'Eren K.', role: 'POS & Mutfak Entegrasyon Mühendisi', avatar: '🍳' }
    ],
    milestones: [
      {
        title: 'QR Menü & Masadan Sipariş Arayüzü',
        status: 'completed',
        date: '01 Temmuz 2026',
        description: 'Müşterilerin telefon kamerasıyla menü açıp sipariş ilettiği mobil arayüz.',
        deliverables: ['PWA Menü', 'Kategori & Varyasyon Motoru']
      },
      {
        title: 'Akıllı Mutfak Ekranı (KDS) ve Termal Fiş Entegrasyonu',
        status: 'completed',
        date: '10 Ağustos 2026',
        description: 'Masanın siparişi verildiği anda mutfaktaki ve bardaki termal yazıcılardan anında fiş basımı.',
        deliverables: ['ESC/POS Protokol Sürücüsü', 'WebSocket İletişim']
      },
      {
        title: 'Soğuk Zincir Gurme E-Ticaret & Kurye Takip Motoru',
        status: 'completed',
        date: '15 Eylül 2026',
        description: 'İstanbul geneli soğuk meze teslimatı için canlı kurye harita takibi.',
        deliverables: ['GPS Takip API', 'Soğuk Zincir Sıcaklık Uyarısı']
      },
      {
        title: 'Resmi Canlı Lansman (tarihisamatyamezecisi.com)',
        status: 'completed',
        date: '15 Ekim 2026',
        description: '3.500+ günlük sipariş hacmiyle kesintisiz canlı hizmet.',
        deliverables: ['Canlı Domain & SSL', '%99.95 Uptime Garantisi']
      }
    ],
    gitActivity: [
      { hash: 'c7d8e9f', msg: 'perf(pos): optimize socket reconnection on unstable restaurant wifi', time: '5 gün önce', branch: 'main' }
    ],
    invoices: [
      { no: 'YSN2026000000146', title: 'Restoran QR Menü & Mutfak Yazıcı Entegrasyonu', amount: '₺38.400', status: 'paid' }
    ]
  }
};

export default function ClientPortalPage() {
  const [projectCodeInput, setProjectCodeInput] = useState('YSN-KGLEX-2026');
  const [selectedCode, setSelectedCode] = useState('YSN-KGLEX-2026');
  const [feedback, setFeedback] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const currentProject = mockProjects[selectedCode] || mockProjects['YSN-KGLEX-2026'];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = projectCodeInput.trim().toUpperCase();
    if (mockProjects[clean]) {
      setSelectedCode(clean);
    } else {
      alert(`Girilen proje kodu (${clean}) bulunamadı. Lütfen size iletilen YSN-XXXX-2026 formatındaki kodu giriniz.`);
    }
  };

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setFeedbackSuccess(true);
    setFeedback('');
    setTimeout(() => setFeedbackSuccess(false), 4000);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] selection:bg-blue-500 selection:text-white pb-24">
      {/* Top Navbar */}
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
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-semibold">
                Müşteri Takip Portalı
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/login"
              className="text-xs font-medium text-[#86868B] hover:text-[#1D1D1F] px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors hidden sm:block"
            >
              Yönetici Girişi (Admin)
            </Link>
            <a
              href="https://wa.me/905327255098"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold px-3.5 py-1.5 bg-[#0071E3] text-white rounded-full hover:bg-blue-600 transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>Canlı Mimar Desteği</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* Header & Code Switcher */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
              <Sparkles className="w-4 h-4" /> Şeffaf & Canlı Yazılım Süreci Takibi
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F]">
              {currentProject.projectName}
            </h1>
            <p className="text-sm text-[#86868B] mt-1 flex items-center gap-3 flex-wrap">
              <span>Müşteri: <strong>{currentProject.clientName}</strong></span>
              <span>•</span>
              <span>Proje Kodu: <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono font-bold text-blue-600">{currentProject.code}</code></span>
              <span>•</span>
              <a
                href={`https://${currentProject.domain}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
              >
                {currentProject.domain} <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          {/* Quick Demo Switcher & Code Form */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl">
              {Object.keys(mockProjects).map(code => (
                <button
                  key={code}
                  onClick={() => {
                    setSelectedCode(code);
                    setProjectCodeInput(code);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedCode === code
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  {code.replace('YSN-', '').replace('-2026', '')}
                </button>
              ))}
            </div>

            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input
                type="text"
                value={projectCodeInput}
                onChange={e => setProjectCodeInput(e.target.value)}
                placeholder="Proje Kodu (YSN-XXXX-2026)"
                className="px-3.5 py-2 bg-[#F5F5F7] border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-500 w-44"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-[#1D1D1F] hover:bg-black text-white text-xs font-semibold rounded-xl transition-all"
              >
                Getir
              </button>
            </form>
          </div>
        </div>

        {/* Progress & KPI Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
            <div className="text-xs text-[#86868B] font-medium flex items-center justify-between">
              Genel Tamamlanma
              <span className="font-bold text-blue-600">{currentProject.overallProgress}%</span>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-[#1D1D1F]">
              {currentProject.overallProgress >= 100 ? 'Lansman Yapıldı' : '% ' + currentProject.overallProgress}
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-[#0071E3] h-full rounded-full transition-all duration-700"
                style={{ width: `${currentProject.overallProgress}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
            <div className="text-xs text-[#86868B] font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Aktif Sprint & Aşama
            </div>
            <div className="mt-2 text-sm font-bold text-[#1D1D1F] line-clamp-1">
              {currentProject.currentSprint}
            </div>
            <div className="text-xs text-[#86868B] mt-2">
              Hedef Canlıya Alım: <strong className="text-[#1D1D1F]">{currentProject.targetLaunch}</strong>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
            <div className="text-xs text-[#86868B] font-medium flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-500" /> SLA & Çalışma Süresi
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600 flex items-center gap-1.5">
              %99.98 <span className="text-xs font-normal text-[#86868B]">Uptime</span>
            </div>
            <div className="text-xs text-[#86868B] mt-2">
              Ortalama Yanıt: <strong className="text-emerald-700">24ms (Edge)</strong>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
            <div className="text-xs text-[#86868B] font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Güvenlik & KVKK Uyumu
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-600 flex items-center gap-1.5">
              A+ Seviye
            </div>
            <div className="text-xs text-[#86868B] mt-2">
              Sıfır Güvenlik Zafiyeti (OWASP Denetimli)
            </div>
          </div>
        </div>

        {/* 2-Column Grid: Milestones & Project Team/Tech Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Milestone Roadmap */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-[#1D1D1F]">Proje Fazları & Aşama Detayları</h2>
                  <p className="text-xs text-[#86868B] mt-0.5">Sözleşme ve teknik şartname kapsamındaki teslimatlar</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                  Agile Scrum 2-Haftalık Sprintler
                </span>
              </div>

              <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:top-3 before:bottom-3 before:left-3 sm:before:left-4 before:w-[2px] before:bg-gray-200">
                {currentProject.milestones.map((m, idx) => (
                  <div key={idx} className="relative group">
                    {/* Status Dot */}
                    <div
                      className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs shadow-xs transition-transform group-hover:scale-110 ${
                        m.status === 'completed'
                          ? 'bg-emerald-500'
                          : m.status === 'in_progress'
                          ? 'bg-blue-600 ring-4 ring-blue-100 animate-pulse'
                          : 'bg-gray-300'
                      }`}
                    >
                      {m.status === 'completed' ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : m.status === 'in_progress' ? (
                        <Clock className="w-3.5 h-3.5" />
                      ) : (
                        <span className="text-[10px] font-bold">{idx + 1}</span>
                      )}
                    </div>

                    <div className="bg-[#F5F5F7] hover:bg-gray-50 border border-gray-200/70 p-5 rounded-2xl transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <h3 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2">
                          {m.title}
                          {m.status === 'completed' && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-md">
                              Tamamlandı
                            </span>
                          )}
                          {m.status === 'in_progress' && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 rounded-md">
                              Geliştiriliyor
                            </span>
                          )}
                          {m.status === 'upcoming' && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-200 text-gray-700 rounded-md">
                              Sıradaki Faz
                            </span>
                          )}
                        </h3>
                        <span className="text-xs text-[#86868B] font-medium">{m.date}</span>
                      </div>
                      <p className="text-xs text-[#555] leading-relaxed mb-3">{m.description}</p>
                      
                      {/* Deliverables tags */}
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-200/60">
                        {m.deliverables.map((d, i) => (
                          <span
                            key={i}
                            className="text-[11px] font-medium px-2 py-0.5 bg-white border border-gray-200 text-[#1D1D1F] rounded-md flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Git Changelog / Commit Stream */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-[#1D1D1F]">Canlı Git Geliştirme Akışı</h3>
                </div>
                <span className="text-xs text-[#86868B] font-mono">YSNSOFT Private Repo (GitHub Enterprise)</span>
              </div>
              <div className="space-y-2.5">
                {currentProject.gitActivity.map((git, i) => (
                  <div
                    key={i}
                    className="p-3 bg-[#F5F5F7] rounded-xl flex items-center justify-between text-xs font-mono border border-gray-200/60"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-semibold text-[11px]">
                        {git.hash}
                      </span>
                      <span className="text-[#1D1D1F] font-sans font-medium line-clamp-1">{git.msg}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-[#86868B]">
                      <span className="hidden sm:inline bg-gray-200 px-2 py-0.5 rounded text-[10px]">
                        {git.branch}
                      </span>
                      <span>{git.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Col: Team, Tech Stack, Invoices & Revision Form */}
          <div className="space-y-6">
            {/* Assigned Team */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs">
              <h3 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-blue-600" /> Atanan Yazılım Ekibi
              </h3>
              <div className="space-y-3">
                {currentProject.team.map((member, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F5F5F7]">
                    <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-lg shadow-2xs">
                      {member.avatar}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1D1D1F]">{member.name}</div>
                      <div className="text-[11px] text-[#86868B]">{member.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech Stack */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs">
              <h3 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-indigo-600" /> Kullanılan Teknolojiler
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {currentProject.techStack.map((tech, i) => (
                  <span
                    key={i}
                    className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-[#1D1D1F] rounded-lg border border-gray-200/60"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Project Invoices / E-Fatura */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" /> Proje Faturaları
                </h3>
                <span className="text-xs text-[#86868B]">E-Fatura (GİB)</span>
              </div>
              <div className="space-y-2.5">
                {currentProject.invoices.map((inv, i) => (
                  <div key={i} className="p-3 bg-[#F5F5F7] rounded-xl border border-gray-200/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[#86868B] font-semibold">{inv.no}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.status === 'paid' ? 'Ödendi' : 'Ödeme Bekliyor'}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-[#1D1D1F]">{inv.title}</div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-bold text-blue-600">{inv.amount}</span>
                      <button
                        onClick={() => alert(`${inv.no} numaralı e-fatura PDF'i indirildi.`)}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> PDF İndir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Revision / Feedback Form */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs">
              <h3 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2 mb-2">
                <Send className="w-4 h-4 text-blue-600" /> Revizyon & Geri Bildirim Talebi
              </h3>
              <p className="text-xs text-[#86868B] mb-3">
                Doğrudan Çözüm Mimarımız ve Lead Geliştiricimize iletilir.
              </p>
              {feedbackSuccess ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  Geri bildiriminiz Jira / Slack sprint panomuza başarıyla eklendi.
                </div>
              ) : (
                <form onSubmit={handleSendFeedback} className="space-y-3">
                  <textarea
                    rows={3}
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="Örn: UYAP bot tarama saatlerinin 02:00 yerine 04:00'e çekilmesini rica ederiz..."
                    className="w-full p-3 bg-[#F5F5F7] border border-gray-200 rounded-xl text-xs text-[#1D1D1F] focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#0071E3] hover:bg-blue-600 text-white font-semibold text-xs rounded-xl transition-all shadow-xs"
                  >
                    Talebi Sprint Panosuna İlet
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
