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
  title: "YSNSOFT | Kurumsal SaaS, Hukuk Teknolojileri & Bilişim Çözümleri",
  description: "KGLEX LegalTech AI, HaritaPlan 3D CBS, Panelde Multi-Tenant SaaS, Flamantyou E-Ticaret ve kurumsal anahtar teslim bilişim mimarisi.",
  keywords: [
    "YSNSOFT",
    "KGLEX",
    "HaritaPlan",
    "Panelde",
    "Flamantyou",
    "UYAP Robotu",
    "Hukuk Yazılımı",
    "3194 Madde 18",
    "DOP Hesabı",
    "Multi-Tenant SaaS",
    "Next.js 16",
    "Bilişim Şirketi"
  ],
  authors: [{ name: "YSNSOFT Mühendislik Ekibi" }],
  openGraph: {
    title: "YSNSOFT | Kurumsal SaaS & Bilişim Ekosistemi",
    description: "Canlıda çalışan büyük yazılımlar: KGLEX, HaritaPlan, Panelde, Flamantyou ve Samatya.",
    url: "https://ysnsoft.com",
    siteName: "YSNSOFT",
    locale: "tr_TR",
    type: "website",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "YSNSOFT Enterprise SaaS Suite",
    "operatingSystem": "Web, iOS, Android, Cloud",
    "applicationCategory": "BusinessApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "TRY"
    },
    "publisher": {
      "@type": "Organization",
      "name": "YSNSOFT Bilişim Teknolojileri A.Ş.",
      "url": "https://ysnsoft.com"
    }
  };

  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} scroll-smooth`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] antialiased">
        {children}
      </body>
    </html>
  );
}
