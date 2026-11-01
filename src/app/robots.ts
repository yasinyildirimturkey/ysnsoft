import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://ysnsoft.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/portal',
          '/blog',
          '/_next/static/',
          '/favicon.ico',
        ],
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/portal',
          '/blog',
          '/_next/static/',
        ],
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
        ],
      },
      {
        userAgent: 'Bingbot',
        allow: [
          '/',
          '/portal',
          '/blog',
          '/_next/static/',
        ],
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
