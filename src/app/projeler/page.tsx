import type { Metadata } from 'next';
import Link from 'next/link';
import { PORTFOLIO } from '@/data/products';
import { ogBase, projectPath, projectsIndexGraph } from '@/lib/seo';
import { Breadcrumbs, ContactCta, JsonLd, SiteFooter, SiteHeader } from '@/components/SiteChrome';

const description = `YSNSOFT’un canlıda çalışan ${PORTFOLIO.length} projesi: hukuk yazılımı KGLEX, harita ve imar yazılımı HaritaPlan, emlak platformu Panelde, tekne kiralama pazaryeri DMyacht ve hukuk bürosu, restoran, e-ticaret siteleri.`;

export const metadata: Metadata = {
  title: 'Projeler: Canlıda Çalışan Web Siteleri ve Yazılımlar',
  description,
  alternates: { canonical: '/projeler' },
  openGraph: { ...ogBase, title: 'YSNSOFT Projeleri', description, url: '/projeler', type: 'website' },
};

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      <JsonLd data={projectsIndexGraph()} />
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        <Breadcrumbs items={[{ name: 'Ana Sayfa', href: '/' }, { name: 'Projeler' }]} />

        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
            YSNSOFT projeleri
          </h1>
          <p className="text-base sm:text-lg text-[#515154] mt-4 leading-relaxed">
            Aşağıdaki {PORTFOLIO.length} proje YSNSOFT tarafından geliştirildi ve kendi alan adında yayında. Her projenin
            sayfasında ne işe yaradığı, özellikleri ve kullanılan teknolojiler yazıyor.
          </p>
        </div>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PORTFOLIO.map((p) => (
            <li key={p.id} className="apple-card p-6 flex flex-col">
              <div className="text-xs font-semibold" style={{ color: p.accentColor }}>
                {p.categoryLabel}
              </div>
              <h2 className="text-lg font-semibold tracking-tight mt-2">
                <Link href={projectPath(p)} className="hover:underline">
                  {p.name}
                </Link>
              </h2>
              <p className="text-sm text-[#515154] mt-1">{p.tagline}</p>
              <p className="text-sm text-[#6E6E73] mt-3 leading-relaxed flex-1">{p.shortDesc}</p>
              <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-black/[0.06] text-sm">
                <Link href={projectPath(p)} className="font-semibold text-[#0071E3] hover:underline">
                  Proje ayrıntıları
                </Link>
                <a
                  href={p.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-[#515154] hover:text-[#1D1D1F] hover:underline"
                >
                  {p.displayDomain} ↗
                </a>
              </div>
            </li>
          ))}
        </ul>

        <ContactCta />
      </main>
      <SiteFooter />
    </div>
  );
}
