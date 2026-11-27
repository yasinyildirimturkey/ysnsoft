import Link from 'next/link';
import { PRODUCTS } from '@/data/products';
import { CONTACT, jsonLdString, projectPath } from '@/lib/seo';

/** Alt sayfalar (projeler, blog) için sunucuda çizilen sade üst ve alt bölüm. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />;
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="font-bold tracking-tight text-lg text-[#1D1D1F]">
          YSNSOFT
        </Link>
        <nav aria-label="Ana menü" className="flex items-center gap-1 sm:gap-2 text-sm font-medium text-[#515154]">
          <Link href="/projeler" className="px-3 py-2 rounded-full hover:bg-black/[0.05] hover:text-[#1D1D1F]">
            Projeler
          </Link>
          <Link href="/blog" className="px-3 py-2 rounded-full hover:bg-black/[0.05] hover:text-[#1D1D1F]">
            Blog
          </Link>
          <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="apple-pill-btn px-4 py-2 text-sm">
            Teklif Al
          </a>
        </nav>
      </div>
    </header>
  );
}

export function Breadcrumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Sayfa yolu" className="text-xs text-[#6E6E73]">
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

export function ContactCta({ topic }: { topic?: string }) {
  return (
    <section className="apple-card p-6 sm:p-8 text-center">
      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#1D1D1F]">
        {topic ? `${topic} benzeri bir proje mi düşünüyorsunuz?` : 'Projenizi konuşalım'}
      </h2>
      <p className="text-sm text-[#6E6E73] mt-2 max-w-xl mx-auto">
        İhtiyacınızı yazın veya arayın; kapsamı birlikte netleştirip size yazılı teklif gönderelim.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
        <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="apple-pill-btn px-5 py-2.5 text-sm">
          WhatsApp ile yazın
        </a>
        <a href={CONTACT.phoneHref} className="apple-pill-btn-secondary px-5 py-2.5 text-sm">
          {CONTACT.phoneDisplay}
        </a>
        <a href={`mailto:${CONTACT.email}`} className="apple-pill-btn-secondary px-5 py-2.5 text-sm">
          {CONTACT.email}
        </a>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-black/[0.06] bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-3 text-sm">
        <div>
          <div className="font-bold tracking-tight text-lg text-[#1D1D1F]">YSNSOFT</div>
          <p className="text-[#6E6E73] mt-2 leading-relaxed">
            Kurumsal web siteleri, SaaS ürünleri ve özel yazılım. {CONTACT.place}.
          </p>
          <p className="mt-3 text-[#515154]">
            <a href={CONTACT.phoneHref} className="hover:underline">{CONTACT.phoneDisplay}</a>
            <br />
            <a href={`mailto:${CONTACT.email}`} className="hover:underline">{CONTACT.email}</a>
          </p>
        </div>
        <div className="sm:col-span-2">
          <div className="font-semibold text-[#1D1D1F] mb-3">Projeler</div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[#515154]">
            {PRODUCTS.map((p) => (
              <li key={p.id}>
                <Link href={projectPath(p)} className="hover:text-[#1D1D1F] hover:underline">
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 text-[#515154]">
            <Link href="/" className="hover:underline">Ana Sayfa</Link>
            <Link href="/projeler" className="hover:underline">Tüm Projeler</Link>
            <Link href="/blog" className="hover:underline">Blog</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
