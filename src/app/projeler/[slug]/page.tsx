import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct, PRODUCTS } from '@/data/products';
import { ogBase, projectFaqs, projectGraph, projectPath } from '@/lib/seo';
import { Breadcrumbs, ContactCta, JsonLd, SiteFooter, SiteHeader } from '@/components/SiteChrome';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return { title: 'Proje bulunamadı', robots: { index: false } };
  const title = `${p.name}: ${p.tagline}`;
  return {
    title,
    description: p.shortDesc,
    keywords: [p.name, p.displayDomain, p.categoryLabel, ...p.techStack, 'YSNSOFT'],
    alternates: { canonical: projectPath(p) },
    openGraph: { ...ogBase, title, description: p.shortDesc, url: projectPath(p), type: 'article' },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();

  const faqs = projectFaqs(p);
  const related = [
    ...PRODUCTS.filter((x) => x.id !== p.id && x.category === p.category),
    ...PRODUCTS.filter((x) => x.id !== p.id && x.category !== p.category),
  ].slice(0, 3);

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      <JsonLd data={projectGraph(p)} />
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        <Breadcrumbs items={[{ name: 'Ana Sayfa', href: '/' }, { name: 'Projeler', href: '/projeler' }, { name: p.name }]} />

        <article className="space-y-10">
          <header>
            <div className="text-sm font-semibold" style={{ color: p.accentColor }}>
              {p.categoryLabel}
            </div>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.1] mt-2">{p.name}</h1>
            <p className="text-lg sm:text-xl text-[#515154] mt-3">{p.tagline}</p>
            <p className="text-base text-[#333] mt-5 leading-relaxed">{p.shortDesc}</p>
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="apple-pill-btn px-5 py-2.5 text-sm">
                {p.displayDomain} adresini aç ↗
              </a>
              {p.secondaryUrl && (
                <a
                  href={p.secondaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="apple-pill-btn-secondary px-5 py-2.5 text-sm"
                >
                  {p.secondaryDomain} ↗
                </a>
              )}
            </div>
          </header>

          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {p.metrics.map((m) => (
              <div key={m.label} className="bg-white rounded-2xl border border-black/[0.07] p-4">
                <dt className="text-xs text-[#6E6E73]">{m.label}</dt>
                <dd className="text-sm font-semibold mt-1">{m.value}</dd>
              </div>
            ))}
          </dl>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight">{p.name} nedir?</h2>
            <p className="text-base text-[#333] mt-3 leading-relaxed">{p.longDesc}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight">Özellikler</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {p.features.map((f) => (
                <li key={f} className="bg-white rounded-2xl border border-black/[0.07] p-4 text-sm leading-relaxed">
                  {f}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight">Kullanılan teknolojiler</h2>
            <ul className="flex flex-wrap gap-2 mt-4">
              {p.techStack.map((t) => (
                <li key={t} className="px-3 py-1.5 bg-white border border-black/[0.07] rounded-full text-sm font-medium">
                  {t}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight">Sık sorulan sorular</h2>
            <dl className="mt-4 space-y-3">
              {faqs.map((f) => (
                <div key={f.question} className="bg-white rounded-2xl border border-black/[0.07] p-5">
                  <dt className="font-semibold">{f.question}</dt>
                  <dd className="text-sm text-[#333] mt-2 leading-relaxed">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        </article>

        <ContactCta topic={p.name} />

        <section>
          <h2 className="text-xl font-semibold tracking-tight">Diğer projeler</h2>
          <ul className="grid gap-4 sm:grid-cols-3 mt-4">
            {related.map((r) => (
              <li key={r.id} className="apple-card p-5">
                <div className="text-xs font-semibold" style={{ color: r.accentColor }}>
                  {r.categoryLabel}
                </div>
                <Link href={projectPath(r)} className="block font-semibold mt-1 hover:underline">
                  {r.name}
                </Link>
                <p className="text-xs text-[#6E6E73] mt-1.5 leading-relaxed">{r.tagline}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
