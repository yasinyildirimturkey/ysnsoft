import Link from 'next/link';
import { PORTFOLIO } from '@/data/products';
import { BASE, intentPath, intentsIn, type Lang } from '@/data/intent';
import { CONTACT, jsonLdString, projectPath } from '@/lib/seo';

/** Alt sayfalar (projeler, blog, hizmetler) için sunucuda çizilen sade üst ve alt bölüm; tr/en/de. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />;
}

const T = {
  tr: { nav: 'Ana menü', services: 'Hizmetler', projects: 'Projeler', blog: 'Blog', quote: 'Teklif Al', crumbs: 'Sayfa yolu',
    ctaTopic: (t: string) => `${t} benzeri bir proje mi düşünüyorsunuz?`, ctaTitle: 'Projenizi konuşalım',
    ctaLead: 'İhtiyacınızı yazın veya arayın; kapsamı birlikte netleştirip size yazılı teklif gönderelim.', whatsapp: 'WhatsApp ile yazın',
    tagline: 'Kurumsal web siteleri, SaaS ürünleri ve özel yazılım.', place: CONTACT.place, home: 'Ana Sayfa', allProjects: 'Tüm Projeler', llms: 'Yapay zekâ özeti (llms.txt)' },
  en: { nav: 'Main menu', services: 'Services', projects: 'Projects', blog: 'Blog', quote: 'Get a quote', crumbs: 'Breadcrumb',
    ctaTopic: (t: string) => `Planning a project like ${t}?`, ctaTitle: 'Let’s talk about your project',
    ctaLead: 'Write or call us; we will clarify the scope together and send you a written quote.', whatsapp: 'Message us on WhatsApp',
    tagline: 'Corporate websites, SaaS products and custom software.', place: 'Pendik, Istanbul, Turkey', home: 'Home', allProjects: 'All projects', llms: 'AI summary (llms.txt)' },
  de: { nav: 'Hauptmenü', services: 'Leistungen', projects: 'Projekte', blog: 'Blog', quote: 'Angebot anfragen', crumbs: 'Seitenpfad',
    ctaTopic: (t: string) => `Ein Projekt wie ${t} geplant?`, ctaTitle: 'Sprechen wir über Ihr Projekt',
    ctaLead: 'Schreiben oder rufen Sie uns an; wir klären den Umfang und senden Ihnen ein schriftliches Angebot.', whatsapp: 'Per WhatsApp schreiben',
    tagline: 'Websites, SaaS-Produkte und individuelle Software.', place: 'Pendik, Istanbul, Türkei', home: 'Startseite', allProjects: 'Alle Projekte', llms: 'KI-Zusammenfassung (llms.txt)' },
} satisfies Record<Lang, unknown>;

export const chromeText = (lang: Lang) => T[lang];

export function SiteHeader({ lang = 'tr' }: { lang?: Lang }) {
  const t = T[lang];
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        <Link href="/" className="font-bold tracking-tight text-lg text-[#1D1D1F]">
          YSNSOFT
        </Link>
        <nav aria-label={t.nav} className="flex items-center gap-0.5 sm:gap-2 text-sm font-medium text-[#515154]">
          <Link href={BASE[lang]} className="px-2.5 sm:px-3 py-2 rounded-full hover:bg-black/[0.05] hover:text-[#1D1D1F]">
            {t.services}
          </Link>
          <Link href="/projeler" className="px-2.5 sm:px-3 py-2 rounded-full hover:bg-black/[0.05] hover:text-[#1D1D1F]">
            {t.projects}
          </Link>
          <Link href="/blog" className="hidden sm:inline px-3 py-2 rounded-full hover:bg-black/[0.05] hover:text-[#1D1D1F]">
            {t.blog}
          </Link>
          <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="apple-pill-btn px-3.5 sm:px-4 py-2 text-sm whitespace-nowrap">
            {t.quote}
          </a>
        </nav>
      </div>
    </header>
  );
}

export function Breadcrumbs({ items, lang = 'tr' }: { items: { name: string; href?: string }[]; lang?: Lang }) {
  return (
    <nav aria-label={T[lang].crumbs} className="text-xs text-[#6E6E73]">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={it.name} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {it.href ? (
              <Link href={it.href} className="hover:text-[#1D1D1F] hover:underline">
                {it.name}
              </Link>
            ) : (
              <span aria-current="page" className="text-[#1D1D1F] font-medium">
                {it.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ContactCta({ topic, lang = 'tr' }: { topic?: string; lang?: Lang }) {
  const t = T[lang];
  return (
    <section className="apple-card p-6 sm:p-8 text-center">
      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#1D1D1F]">
        {topic ? t.ctaTopic(topic) : t.ctaTitle}
      </h2>
      <p className="text-sm text-[#6E6E73] mt-2 max-w-xl mx-auto">{t.ctaLead}</p>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
        <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="apple-pill-btn px-5 py-2.5 text-sm">
          {t.whatsapp}
        </a>
        <a href={CONTACT.phoneHref} className="apple-pill-btn-secondary px-5 py-2.5 text-sm">
          {lang === 'tr' ? CONTACT.phoneDisplay : '+90 532 725 50 98'}
        </a>
        <a href={`mailto:${CONTACT.email}`} className="apple-pill-btn-secondary px-5 py-2.5 text-sm">
          {CONTACT.email}
        </a>
      </div>
    </section>
  );
}

export function SiteFooter({ lang = 'tr' }: { lang?: Lang }) {
  const t = T[lang];
  return (
    <footer className="mt-20 border-t border-black/[0.06] bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-3 text-sm">
        <div>
          <div className="font-bold tracking-tight text-lg text-[#1D1D1F]">YSNSOFT</div>
          <p className="text-[#6E6E73] mt-2 leading-relaxed">
            {t.tagline} {t.place}.
          </p>
          <p className="mt-3 text-[#515154]">
            <a href={CONTACT.phoneHref} className="hover:underline">{lang === 'tr' ? CONTACT.phoneDisplay : '+90 532 725 50 98'}</a>
            <br />
            <a href={`mailto:${CONTACT.email}`} className="hover:underline">{CONTACT.email}</a>
          </p>
          <div className="font-semibold text-[#1D1D1F] mt-6 mb-3">{t.services}</div>
          <ul className="space-y-2 text-[#515154]">
            {intentsIn(lang).map((p) => (
              <li key={p.key}>
                <Link href={intentPath(lang, p.content[lang]!.slug)} className="hover:text-[#1D1D1F] hover:underline">
                  {p.content[lang]!.h1}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="sm:col-span-2">
          <div className="font-semibold text-[#1D1D1F] mb-3">{t.projects}</div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[#515154]">
            {PORTFOLIO.map((p) => (
              <li key={p.id}>
                <Link href={projectPath(p)} className="hover:text-[#1D1D1F] hover:underline">
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 text-[#515154]">
            <Link href="/" className="hover:underline">{t.home}</Link>
            <Link href={BASE[lang]} className="hover:underline">{t.services}</Link>
            <Link href="/projeler" className="hover:underline">{t.allProjects}</Link>
            <Link href="/blog" className="hover:underline">{t.blog}</Link>
            <a href="/llms.txt" className="hover:underline">{t.llms}</a>
          </div>
          {lang === 'tr' && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-[#6E6E73] text-xs">
              <Link href={BASE.en} className="hover:underline" hrefLang="en">English</Link>
              <Link href={BASE.de} className="hover:underline" hrefLang="de">Deutsch</Link>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
