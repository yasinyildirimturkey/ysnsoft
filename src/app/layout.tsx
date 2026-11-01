import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ysnsoft.com"),
  title: {
    default: "YSNSOFT | Kurumsal SaaS, Hukuk Teknolojileri & Bilişim Çözümleri",
    template: "%s | YSNSOFT",
  },
  description: "KGLEX LegalTech AI (UYAP Robotu), HaritaPlan 3D CBS (3194 Md. 18 DOP Hesabı), Panelde Multi-Tenant SaaS, Tarihi Samatya Mezecisi QR POS ve kurumsal bilişim sistemleri.",
  applicationName: "YSNSOFT",
  keywords: [
    "YSNSOFT",
    "YSNSOFT Bilişim",
    "KGLEX",
    "KGLEX UYAP Robotu",
    "UYAP Otomasyonu",
    "Hukuk Yazılımı",
    "Dava ve İcra Takip Sistemi",
    "HaritaPlan",
    "3194 Madde 18",
    "DOP Hesabı",
    "Parselasyon Hesap Motoru",
    "Netcad NCN DXF Dönüştürücü",
    "3D CBS Harita",
    "Panelde",
    "Multi-Tenant Emlak Portalı",
    "Tarihi Samatya Mezecisi",
    "Restoran QR Menü",
    "Mutfak POS Sistemi",
    "Flamantyou",
    "AI Cilt Analizi",
    "HG Avukatlık",
    "Açıkel Hukuk",
    "Next.js 16",
    "React 19",
    "Bilişim Şirketi İstanbul",
    "Pendik Yazılım Şirketi",
    "Kurumsal Web Portalı"
  ],
  authors: [{ name: "YSNSOFT Mühendislik Ekibi", url: "https://ysnsoft.com" }],
  creator: "Yasin Yıldırım",
  publisher: "YSNSOFT Bilişim Teknolojileri A.Ş.",
  alternates: {
    canonical: "https://ysnsoft.com",
    languages: {
      "tr-TR": "https://ysnsoft.com",
      "en-US": "https://ysnsoft.com",
    },
  },
  openGraph: {
    title: "YSNSOFT | Kurumsal SaaS, Hukuk Teknolojileri & Bilişim Çözümleri",
    description: "Canlıda çalışan büyük yazılımlar: KGLEX UYAP Robotu, HaritaPlan 3D CBS, Panelde Emlak SaaS, Tarihi Samatya Mezecisi ve kurumsal bilişim mimarisi.",
    url: "https://ysnsoft.com",
    siteName: "YSNSOFT",
    locale: "tr_TR",
    type: "website",
    images: [
      {
        url: "/favicon.ico",
        width: 1200,
        height: 630,
        alt: "YSNSOFT Kurumsal Bilişim Ekosistemi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "YSNSOFT | Kurumsal SaaS & Bilişim Ekosistemi",
    description: "Canlıda çalışan büyük yazılımlar: KGLEX, HaritaPlan, Panelde, Flamantyou ve Samatya.",
    creator: "@ysnsoft",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
  other: {
    // GEO & Yerel Konum Hedefleme Meta Etiketleri
    "geo.region": "TR-34",
    "geo.placename": "Pendik, İstanbul, Türkiye",
    "geo.position": "40.8795;29.2578",
    "ICBM": "40.8795, 29.2578",
    "geo.country": "TR",
    "target_country": "tr",
    "DC.title": "YSNSOFT | Kurumsal SaaS, Hukuk Teknolojileri & Bilişim Çözümleri",
    "DC.creator": "YSNSOFT Bilişim Teknolojileri A.Ş.",
    "DC.language": "tr-TR",
    "rating": "general",
    "revisit-after": "1 days",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Çok Katmanlı Schema.org JSON-LD Yapılandırılmış Veri Grafı
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://ysnsoft.com/#organization",
        "name": "YSNSOFT Bilişim Teknolojileri A.Ş.",
        "legalName": "YSNSOFT Bilişim Teknolojileri Anonim Şirketi",
        "url": "https://ysnsoft.com",
        "logo": "https://ysnsoft.com/favicon.ico",
        "telephone": "+90-532-725-5098",
        "email": "destek@ysnsoft.com",
        "foundingDate": "2024",
        "founder": {
          "@type": "Person",
          "name": "Yasin Yıldırım",
          "jobTitle": "Lead Solutions Architect & Founder"
        },
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Pendik Merkez Mahallesi",
          "addressLocality": "Pendik",
          "addressRegion": "İstanbul",
          "postalCode": "34890",
          "addressCountry": "TR"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 40.8795,
          "longitude": 29.2578
        },
        "areaServed": [
          "İstanbul",
          "Ankara",
          "İzmir",
          "Bursa",
          "Antalya",
          "Türkiye",
          "Global"
        ],
        "sameAs": [
          "https://github.com/yasinyildirimturkey/ysnsoft"
        ]
      },
      {
        "@type": "LocalBusiness",
        "@id": "https://ysnsoft.com/#localbusiness",
        "name": "YSNSOFT Bilişim & SaaS Çözüm Merkezi",
        "image": "https://ysnsoft.com/favicon.ico",
        "telephone": "+90-532-725-5098",
        "email": "destek@ysnsoft.com",
        "priceRange": "₺₺₺",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Pendik Merkez Mahallesi",
          "addressLocality": "Pendik",
          "addressRegion": "İstanbul",
          "postalCode": "34890",
          "addressCountry": "TR"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 40.8795,
          "longitude": 29.2578
        },
        "openingHoursSpecification": [
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday"
            ],
            "opens": "09:00",
            "closes": "18:30"
          }
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://ysnsoft.com/#website",
        "url": "https://ysnsoft.com",
        "name": "YSNSOFT",
        "description": "Kurumsal SaaS, Hukuk Teknolojileri & Bilişim Ekosistemi",
        "publisher": {
          "@id": "https://ysnsoft.com/#organization"
        },
        "inLanguage": "tr-TR"
      },
      {
        "@type": "ItemList",
        "@id": "https://ysnsoft.com/#products",
        "name": "YSNSOFT Canlı Ürün Portföyü",
        "itemListElement": [
          {
            "@type": "SoftwareApplication",
            "position": 1,
            "name": "KGLEX LegalTech AI",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web, Cloud, Windows",
            "url": "https://www.kglex.com",
            "description": "UYAP Robotu, Dava & İcra Takibi, Tensip Zaptı Analizi ve Hukuk Otomasyonu."
          },
          {
            "@type": "SoftwareApplication",
            "position": 2,
            "name": "HaritaPlan 3D CBS & İmar Motoru",
            "applicationCategory": "DesignApplication",
            "operatingSystem": "Web, Cloud",
            "url": "https://www.haritaplan.com",
            "description": "3194 Sayılı Kanun Madde 18 DOP Hesabı, 3D Parselasyon ve CAD Dönüştürücü."
          },
          {
            "@type": "SoftwareApplication",
            "position": 3,
            "name": "HG Avukatlık & Açıkel Law Portalı",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web, iOS, Android",
            "url": "https://www.hgavukatlik.com",
            "description": "Çok Dilli Uluslararası Hukuk Portalı, Şifreli Müvekkil Dosya Kasası ve Online Tahsilat."
          },
          {
            "@type": "SoftwareApplication",
            "position": 4,
            "name": "Tarihi Samatya Mezecisi QR POS",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web, POS, Thermal Printer",
            "url": "https://www.tarihisamatyamezecisi.com",
            "description": "B2B/B2C Gurme Gıda, Masadan QR Menü Siparişi ve Termal Fiş Mutfak POS Entegrasyonu."
          },
          {
            "@type": "SoftwareApplication",
            "position": 5,
            "name": "Panelde Multi-Tenant Gayrimenkul",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web, Cloud",
            "url": "https://www.panelde.com",
            "description": "Emlak Ofisleri İçin Çok Kiracılı SaaS ve Çift Yönlü Portföy Senkronizasyonu."
          },
          {
            "@type": "SoftwareApplication",
            "position": 6,
            "name": "Flamantyou Kozmetik & AI",
            "applicationCategory": "LifestyleApplication",
            "operatingSystem": "Web, iOS, Android",
            "url": "https://www.flamantyou.com",
            "description": "Kamera ile Canlı Yapay Zeka Cilt Analizi, Kişisel Bakım Reçetesi ve E-Ticaret."
          }
        ]
      },
      {
        "@type": "FAQPage",
        "@id": "https://ysnsoft.com/#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "KGLEX UYAP robotu hukuk büromuzun dava ve icra takiplerini nasıl otomatikleştirir?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "KGLEX, T.C. Adalet Bakanlığı UYAP Avukat Portalı ile entegre çalışan akıllı arka plan robot servislerine sahiptir. Dava ve icra dosyalarınızdaki tensip zabıtlarını, yeni evrakları, tebligatları ve duruşma günlerini gece ve gündüz otomatik tarar; süre kaçırma riskini sıfıra indirir ve müvekkil portalı ile anlık SMS/E-Posta bilgilendirmesi yapar."
            }
          },
          {
            "@type": "Question",
            "name": "HaritaPlan 3194 Sayılı Kanun Madde 18 DOP ve parselasyon hesaplamalarını nasıl yapar?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "HaritaPlan, Netcad (.ncn) ve AutoCAD (.dxf) dosyalarını doğrudan web tarayıcısına sürükleyerek okur. 3194 Sayılı İmar Kanunu Madde 18 kapsamında maksimum %45 Düzenleme Ortaklık Payı (DOP) hesaplarını milisaniyeler içinde tamamlar, tapu dağıtım cetvellerini ve resmi kadastro raporlarını A3/A4 vektörel PDF olarak üretir."
            }
          },
          {
            "@type": "Question",
            "name": "Yazılımları kendi şirket sunucumuzda (On-Premise / Özel Bulut) barındırabilir miyiz?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Kesinlikle. Çözümlerimiz standart olarak yüksek güvenlikli bulut altyapımızda (IIS, Docker, Kubernetes, Cloudflare) barındırılır; ancak talep eden kurumsal hukuk ofisleri, belediyeler ve işletmeler için On-Premise (şirket içi sunucu) kurulumu ve özel veri tabanı izolasyonu sağlıyoruz."
            }
          },
          {
            "@type": "Question",
            "name": "Tarihi Samatya Mezecisi QR menü ve restoran POS sistemi mevcut fiş yazıcılarıyla uyumlu mu?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Evet. Tarihi Samatya Mezecisi için geliştirdiğimiz restoran otomasyonu; masadan cep telefonu kamerasıyla QR menü siparişi, mutfak ve bar ekranı (KDS), garson el terminali ve piyasadaki tüm standart ESC/POS termal fiş yazıcılarıyla çift yönlü WebSocket entegrasyonuna sahiptir."
            }
          },
          {
            "@type": "Question",
            "name": "Veri güvenliği, KVKK ve 256-bit SSL şifreleme nasıl sağlanıyor?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Tüm YSNSOFT altyapısı TLS 1.3 ve 256-bit SSL şifrelemeyle korunur. Veritabanlarımızda Row-Level Security (RLS) uygulanır, günlük otomatik yedekleme coğrafi olarak izole edilir ve tüm sistemlerimiz KVKK & GDPR mevzuatlarına %100 uyumludur."
            }
          },
          {
            "@type": "Question",
            "name": "Satış sonrası teknik destek, SLA garantisi ve acil müdahale şartları nelerdir?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Tüm kurumsal müşterilerimize 7/24 kesintisiz telefon (+90 532 725 50 98), WhatsApp ve e-posta desteği sunuyoruz. Kritik kurumsal süreçler için %99.99 çalışma garantisi (SLA) ve 15 dakika içinde çözüm mimarı müdahalesi taahhüt ediyoruz."
            }
          }
        ]
      }
    ]
  };

  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} scroll-smooth`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] antialiased">
        {children}
      </body>
    </html>
  );
}
