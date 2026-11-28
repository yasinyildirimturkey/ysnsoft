import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PORTFOLIO } from '@/data/products';
import { BASE, findIntent, HUB, intentPath, intentsIn, type IntentPage, type Lang } from '@/data/intent';
import { hreflangMap, hubGraph, hubLanguages, intentGraph, intentLanguages, langIndexable, ogBase, projectPath } from '@/lib/seo';
import { Breadcrumbs, chromeText, ContactCta, JsonLd, SiteFooter, SiteHeader } from '@/components/SiteChrome';

/**
 * Arama niyeti sayfası şablonu (tr/en/de). Tek H1; ilk paragraf doğrudan cevap; bölüm başına H2;
 * kanıt olarak canlı projeler; görünür SSS = FAQPage JSON-LD. İçerik: src/data/intent.ts
 */
const L = {
  tr: { home: 'Ana Sayfa', faq: 'Sık sorulan sorular', proof: 'Bu hizmetle ilgili canlı projeler', detail: 'Proje ayrıntıları', other: 'Diğer hizmetler', og: 'tr_TR' },
  en: { home: 'Home', faq: 'Frequently asked questions', proof: 'Live projects related to this service', detail: 'Project details', other: 'Other services', og: 'en_US' },
  de: { home: 'Startseite', faq: 'Häufige Fragen', proof: 'Live-Projekte zu dieser Leistung', detail: 'Projektdetails', other: 'Weitere Leistungen', og: 'de_DE' },
} satisfies Record<Lang, unknown>;

const robotsFor = (lang: Lang): Metadata['robots'] => (langIndexable(lang) ? undefined : { index: false, follow: true });

export function intentStaticParams(lang: Lang) {
  return intentsIn(lang).map((p) => ({ slug: p.content[lang]!.slug }));
}

export function intentMetadata(lang: Lang, slug: string): Metadata {
  const page = findIntent(lang, slug);
  if (!page) return { robots: { index: false } };
  const c = page.content[lang]!;
  const path = intentPath(lang, c.slug);
  return {
    title: c.title,
    description: c.description,
    alternates: { canonical: path, languages: hreflangMap(intentLanguages(page)) },
    openGraph: { ...ogBase, locale: L[lang].og, title: c.title, description: c.description, url: path, type: 'article' },
    robots: robotsFor(lang),
  };
}

export function hubMetadata(lang: Lang): Metadata {
  const h = HUB[lang];
  return {
    title: h.title,
    description: h.description,
    alternates: { canonical: BASE[lang], languages: hreflangMap(hubLanguages()) },
    openGraph: { ...ogBase, locale: L[lang].og, title: h.title, description: h.description, url: BASE[lang], type: 'website' },
    robots: robotsFor(lang),
  };
}

function ProjectCards({ page, lang }: { page: IntentPage; lang: Lang }) {
  const projects = page.projects.map((id) => PORTFOLIO.find((p) => p.id === id)).filter((p) => p !== undefined);
  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight">{L[lang].proof}</h2>
      <ul className="grid gap-4 sm:grid-cols-2 mt-4">
        {projects.map((p) => (
          <li key={p.id} className="apple-card p-5 flex flex-col">
            <div className="text-xs font-semibold" style={{ color: p.accentColor }}>{p.categoryLabel}</div>
            <h3 className="font-semibold mt-1">{p.name}</h3>
            <p className="text-sm text-[#515154] mt-1.5 leading-relaxed flex-1">{p.tagline}</p>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-black/[0.06] text-sm">
              <Link href={projectPath(p)} className="font-semibold text-[#0071E3] hover:underline">{L[lang].detail}</Link>
              <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-[#515154] hover:underline">
                {p.displayDomain} ↗
              </a>
            </div>
          </li>
        ))}
        {page.extraLink && (
          <li className="apple-card p-5 flex flex-col justify-center">
            <a href={page.extraLink.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0071E3] hover:underline">
              {page.extraLink.label[lang]} ↗
            </a>
            <span className="font-mono text-xs text-[#515154] mt-1">{new URL(page.extraLink.href).host}</span>
          </li>
        )}
      </ul>
    </section>
  );
}

export function IntentView({ lang, slug }: { lang: Lang; slug: string }) {
  const page = findIntent(lang, slug);
  if (!page) notFound();
  const c = page.content[lang]!;
  const t = chromeText(lang);
  const others = intentsIn(lang).filter((p) => p.key !== page.key);

  return (
    <div lang={lang} className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      <JsonLd data={intentGraph(page, lang)} />
      <SiteHeader lang={lang} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        <Breadcrumbs lang={lang} items={[{ name: L[lang].home, href: '/' }, { name: t.services, href: BASE[lang] }, { name: c.h1 }]} />

        <article className="space-y-10">
          <header>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">{c.h1}</h1>
            <p className="text-lg text-[#1D1D1F] mt-5 leading-relaxed">{c.answer}</p>
          </header>

          {c.sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-2xl font-semibold tracking-tight">{s.h}</h2>
              <p className="text-base text-[#333] mt-3 leading-relaxed">{s.p}</p>
            </section>
          ))}

          <ul className="grid gap-3 sm:grid-cols-2">
            {c.points.map((pt) => (
              <li key={pt} className="bg-white rounded-2xl border border-black/[0.07] p-4 text-sm leading-relaxed">{pt}</li>
            ))}
          </ul>

          <ProjectCards page={page} lang={lang} />

          <section>
            <h2 className="text-2xl font-semibold tracking-tight">{L[lang].faq}</h2>
            <dl className="mt-4 space-y-3">
              {c.faqs.map((f) => (
                <div key={f.question} className="bg-white rounded-2xl border border-black/[0.07] p-5">
                  <dt className="font-semibold">{f.question}</dt>
                  <dd className="text-sm text-[#333] mt-2 leading-relaxed">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        </article>

        <ContactCta lang={lang} />

        <section>
          <h2 className="text-xl font-semibold tracking-tight">{L[lang].other}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 mt-4">
            {others.map((o) => (
              <li key={o.key}>
                <Link href={intentPath(lang, o.content[lang]!.slug)} className="block apple-card p-4 text-sm font-semibold hover:underline">
                  {o.content[lang]!.h1}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter lang={lang} />
    </div>
  );
}

export function HubView({ lang }: { lang: Lang }) {
  const h = HUB[lang];
  const pages = intentsIn(lang);
  return (
    <div lang={lang} className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      <JsonLd data={hubGraph(lang, pages, h.h1)} />
      <SiteHeader lang={lang} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        <Breadcrumbs lang={lang} items={[{ name: L[lang].home, href: '/' }, { name: chromeText(lang).services }]} />
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">{h.h1}</h1>
          <p className="text-base sm:text-lg text-[#515154] mt-4 leading-relaxed">{h.lead}</p>
        </div>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((p) => {
            const c = p.content[lang]!;
            return (
              <li key={p.key} className="apple-card p-6 flex flex-col">
                <h2 className="text-lg font-semibold tracking-tight">
                  <Link href={intentPath(lang, c.slug)} className="hover:underline">{c.h1}</Link>
                </h2>
                <p className="text-sm text-[#6E6E73] mt-3 leading-relaxed flex-1">{c.answer}</p>
              </li>
            );
          })}
        </ul>
        <ContactCta lang={lang} />
      </main>
      <SiteFooter lang={lang} />
    </div>
  );
}
