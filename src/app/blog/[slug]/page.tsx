import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BLOG_POSTS, getPost } from '@/data/blog';
import { PORTFOLIO } from '@/data/products';
import { ogBase, postGraph, projectPath } from '@/lib/seo';
import { Breadcrumbs, ContactCta, JsonLd, SiteFooter, SiteHeader } from '@/components/SiteChrome';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: 'Yazı bulunamadı', robots: { index: false } };
  return {
    title: post.title,
    description: post.summary,
    keywords: post.tags,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      ...ogBase,
      title: post.title,
      description: post.summary,
      url: `/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.isoDate,
      tags: post.tags,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  // Yazının etiketlerinde adı geçen proje (varsa) sayfasına bağlantı
  const project = PORTFOLIO.find((p) => post.tags.some((t) => p.name.toLowerCase().startsWith(t.toLowerCase())));
  const others = BLOG_POSTS.filter((p) => p.slug !== post.slug);

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] selection:bg-blue-500 selection:text-white">
      <JsonLd data={postGraph(post)} />
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        <Breadcrumbs items={[{ name: 'Ana Sayfa', href: '/' }, { name: 'Blog', href: '/blog' }, { name: post.title }]} />

        <article className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200/90 space-y-6">
          <header>
            <div className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">{post.category}</div>
            <h1 className="text-2xl sm:text-4xl font-bold leading-tight tracking-tight">{post.title}</h1>
            <p className="text-xs text-[#6E6E73] mt-4">
              {post.author.name} • <time dateTime={post.isoDate}>{post.date}</time> • {post.readTime}
            </p>
            <p className="text-base text-[#333] mt-5 leading-relaxed">{post.summary}</p>
          </header>

          <section>
            <h2 className="font-bold text-lg mb-1.5">Mühendislik problemi</h2>
            <p className="text-sm sm:text-base leading-relaxed text-[#333]">{post.content.problem}</p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-1.5">YSNSOFT çözüm mimarisi</h2>
            <p className="text-sm sm:text-base leading-relaxed text-[#333]">{post.content.solution}</p>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-2">Örnek kod kesiti</h2>
            <pre className="p-4 bg-[#141416] text-blue-300 font-mono text-xs overflow-x-auto rounded-xl border border-gray-800">
              <code>{post.content.architectureSnippet}</code>
            </pre>
          </section>

          <ul className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
            {post.tags.map((tag) => (
              <li key={tag} className="px-2.5 py-1 bg-gray-100 text-xs font-medium rounded-lg">
                #{tag}
              </li>
            ))}
          </ul>

          {project && (
            <p className="text-sm text-[#333]">
              İlgili proje:{' '}
              <Link href={projectPath(project)} className="font-semibold text-[#0071E3] hover:underline">
                {project.name}
              </Link>
            </p>
          )}
        </article>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">Diğer yazılar</h2>
          <ul className="mt-4 space-y-3">
            {others.map((o) => (
              <li key={o.slug} className="apple-card p-5">
                <Link href={`/blog/${o.slug}`} className="font-semibold hover:underline">
                  {o.title}
                </Link>
                <p className="text-xs text-[#6E6E73] mt-1.5 leading-relaxed">{o.summary}</p>
              </li>
            ))}
          </ul>
        </section>

        <ContactCta />
      </main>
      <SiteFooter />
    </div>
  );
}
