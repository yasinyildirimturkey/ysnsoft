import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://ysnsoft.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/blog',
          '/_next/static/',
          '/favicon.ico',
        ],
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/portal',
          '/check/',
          '/angebot/',
          '/feedback/',
          '/bericht/',
          '/korrektur/',
          '/demo/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/blog',
          '/_next/static/',
        ],
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/portal',
          '/check/',
          '/angebot/',
          '/feedback/',
          '/bericht/',
          '/korrektur/',
          '/demo/',
        ],
      },
      {
        userAgent: 'Bingbot',
        allow: [
          '/',
          '/blog',
          '/_next/static/',
        ],
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/portal',
          '/check/',
          '/angebot/',
          '/feedback/',
          '/bericht/',
          '/korrektur/',
          '/demo/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
