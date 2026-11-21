import { MetadataRoute } from 'next';
import { CITIES, landingIndexable, SECTORS } from '@/lib/landing';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://ysnsoft.com';
  const currentDate = new Date().toISOString();

  return [
    {
      url: `${baseUrl}`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: {
        languages: {
          tr: `${baseUrl}`,
          en: `${baseUrl}`,
        },
      },
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.80,
    },
    {
      url: `${baseUrl}/#products`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.90,
    },
    {
      url: `${baseUrl}/#live-sites`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/#sandbox`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/#architecture`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/#calculator`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/#faq`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.70,
    },
    // Almanca şehir + sektör sayfaları: yalnız Impressum/Datenschutz tanımlanıp indeksleme açılınca
    ...(landingIndexable() ? [
      `${baseUrl}/de/webdesign`,
      ...SECTORS.map((s) => `${baseUrl}/de/webdesign/${s.slug}`),
      ...SECTORS.flatMap((s) => CITIES.map((c) => `${baseUrl}/de/webdesign/${s.slug}/${c.slug}`)),
    ].map((url) => ({ url, lastModified: currentDate, changeFrequency: 'monthly' as const, priority: 0.6 })) : []),
  ];
}
