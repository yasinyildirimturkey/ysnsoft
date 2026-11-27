import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { jsonLdString, organizationGraph } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ysnsoft.com"),
  title: {
    default: "YSNSOFT | Kurumsal SaaS, Hukuk Teknolojileri & Bilişim Çözümleri",
    template: "%s | YSNSOFT",
  },
  description: "YSNSOFT, İstanbul Pendik merkezli yazılım şirketi: KGLEX hukuk yazılımı, HaritaPlan 3D CBS, Panelde emlak SaaS, DMyacht tekne kiralama pazaryeri, hukuk bürosu siteleri, e-ticaret ve QR menü sistemleri.",
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
    "DMyacht",
    "Yat Kiralama Pazaryeri",
    "Av. Kenan Gümüşten",
    "Hukuk Bürosu Web Sitesi",
    "Avukat Web Sitesi",
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
  publisher: "YSNSOFT",
  // canonical her sayfada ayrı tanımlanır; burada verilirse alt sayfalar da ana sayfayı gösterir
  openGraph: {
    title: "YSNSOFT | Kurumsal SaaS, Hukuk Teknolojileri & Bilişim Çözümleri",
    description: "Canlıda çalışan projeler: KGLEX, HaritaPlan 3D CBS, Panelde Emlak SaaS, DMyacht tekne kiralama pazaryeri, hukuk bürosu siteleri ve e-ticaret.",
    url: "https://ysnsoft.com",
    siteName: "YSNSOFT",
    locale: "tr_TR",
    type: "website",
    // Görsel: src/app/opengraph-image.png (dosya tabanlı, tüm sayfalara miras kalır)
  },
  twitter: {
    card: "summary_large_image",
    title: "YSNSOFT | Kurumsal SaaS & Bilişim Ekosistemi",
    description: "Canlıda çalışan projeler: KGLEX, HaritaPlan, Panelde, DMyacht, Flamantyou ve hukuk bürosu siteleri.",
    creator: "@ysnsoft",
    images: ["/opengraph-image.png"],
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
    "DC.creator": "YSNSOFT",
    "DC.language": "tr-TR",
    "rating": "general",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Kurum + site kimliği her sayfada; proje listesi ve SSS yalnız ilgili sayfalarda (src/lib/seo.ts)
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} scroll-smooth`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString(organizationGraph()) }}
        />
      </head>
      <body className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] antialiased">
        {children}
      </body>
    </html>
  );
}
