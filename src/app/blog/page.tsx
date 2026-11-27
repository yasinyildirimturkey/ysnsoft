import type { Metadata } from 'next';
import Link from 'next/link';
import { BLOG_POSTS } from '@/data/blog';
import { blogIndexGraph, ogBase } from '@/lib/seo';
import { Breadcrumbs, JsonLd, SiteFooter, SiteHeader } from '@/components/SiteChrome';

const description =
  'KGLEX, HaritaPlan ve Flamantyou gibi projelerde aldığımız mimari kararlar: UYAP taraması, 3194 madde 18 DOP hesabı, Next.js ile sayfa hızı.';

export const metadata: Metadata = {
  title: 'Mühendislik Blogu: Nasıl İnşa Ediyoruz?',
  description,
  alternates: { canonical: '/blog' },
  openGraph: { ...ogBase, title: 'YSNSOFT Mühendislik Blogu', description, url: '/blog', type: 'website' },
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] selection:bg-blue-500 selection:text-white">
      <JsonLd data={blogIndexGraph(BLOG_POSTS)} />
      <SiteHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        <Breadcrumbs items={[{ name: 'Ana Sayfa', href: '/' }, { name: 'Blog' }]} />

        <div className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Nasıl İnşa Ediyoruz?</h1>
          <p className="text-sm sm:text-base text-[#6E6E73] mt-3 leading-relaxed">
            KGLEX, HaritaPlan ve Panelde gibi ürünlerimizin mutfağındaki mimari kararlar ve teknik notlar.
          </p>
        </div>

        <div className="space-y-4">
          {BLOG_POSTS.map((post) => (
            <article
              key={post.id}
              className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 hover:border-blue-400 hover:shadow-lg transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200/60 inline-block w-fit">
                  {post.category}
                </span>
                <div className="flex items-center gap-3 text-xs text-[#6E6E73]">
                  <span>{post.readTime}</span>
                  <span aria-hidden="true">•</span>
                  <time dateTime={post.isoDate}>{post.date}</time>
                </div>
              </div>

              <h2 className="text-xl font-bold leading-snug">
                <Link href={`/blog/${post.slug}`} className="hover:text-blue-600 transition-colors">
                  {post.title}
                </Link>
              </h2>

              <p className="text-sm text-[#6E6E73] mt-2.5 leading-relaxed">{post.summary}</p>

              <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-100">
                <ul className="flex flex-wrap gap-1.5">
                  {post.tags.slice(0, 4).map((tag) => (
                    <li key={tag} className="text-[11px] font-medium px-2 py-0.5 bg-gray-100 text-[#555] rounded-md">
                      {tag}
                    </li>
                  ))}
                </ul>
                <Link href={`/blog/${post.slug}`} className="text-xs font-bold text-blue-600 hover:underline">
                  Teknik incelemeyi oku →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
