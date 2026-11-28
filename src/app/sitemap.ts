import { MetadataRoute } from 'next';
import { CITIES, landingIndexable, SECTORS } from '@/lib/landing';
import { PORTFOLIO } from '@/data/products';
import { BLOG_POSTS } from '@/data/blog';
import { INTENT_PAGES } from '@/data/intent';
import { CONTENT_UPDATED, hreflangMap, hubLanguages, intentLanguages, postUrl, projectUrl, SITE_URL } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_URL;
  const currentDate = new Date().toISOString();

  // Not: "#bölüm" adresleri ayrı sayfa değildir, sitemap'e yazılmaz.
  return [
    { url: baseUrl, lastModified: CONTENT_UPDATED, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/projeler`, lastModified: CONTENT_UPDATED, changeFrequency: 'weekly', priority: 0.9 },
    ...PORTFOLIO.map((p) => ({
      url: projectUrl(p),
      lastModified: CONTENT_UPDATED,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    // Hizmet (arama niyeti) sayfaları: her dil sürümü ayrı URL, hreflang alternatifleriyle (Almanca yalnız indekslenebilirse)
    ...Object.values(hubLanguages()).map((url) => ({
      url: url as string,
      lastModified: CONTENT_UPDATED,
      changeFrequency: 'monthly' as const,
      priority: 0.85,
      alternates: { languages: hreflangMap(hubLanguages()) },
    })),
    ...INTENT_PAGES.flatMap((page) => {
      const langs = intentLanguages(page);
      return Object.values(langs).map((url) => ({
        url: url as string,
        lastModified: CONTENT_UPDATED,
        changeFrequency: 'monthly' as const,
        priority: 0.85,
        alternates: { languages: hreflangMap(langs) },
      }));
    }),
    { url: `${baseUrl}/blog`, lastModified: BLOG_POSTS[0]?.isoDate ?? CONTENT_UPDATED, changeFrequency: 'weekly', priority: 0.7 },
    ...BLOG_POSTS.map((p) => ({
      url: postUrl(p),
      lastModified: p.isoDate,
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    })),
    // Almanca şehir + sektör sayfaları: yalnız Impressum/Datenschutz tanımlanıp indeksleme açılınca
    ...(landingIndexable() ? [
      `${baseUrl}/de/webdesign`,
      ...SECTORS.map((s) => `${baseUrl}/de/webdesign/${s.slug}`),
      ...SECTORS.flatMap((s) => CITIES.map((c) => `${baseUrl}/de/webdesign/${s.slug}/${c.slug}`)),
    ].map((url) => ({ url, lastModified: currentDate, changeFrequency: 'monthly' as const, priority: 0.6 })) : []),
  ];
}
