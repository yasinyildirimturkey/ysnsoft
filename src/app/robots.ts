import { MetadataRoute } from 'next';

/** Kişiye özel bağlantılar ve yönetim alanları; hiçbir tarayıcı için açılmaz. */
const PRIVATE = [
  '/admin',
  '/api/',
  '/portal',
  '/check/',
  '/angebot/',
  '/feedback/',
  '/bericht/',
  '/korrektur/',
  '/partner',
  '/demo/',
];

/**
 * Yapay zekâ arama ve yanıt motorları (GEO). Adları açıkça yazılır ki
 * "izin var mı" sorusu belirsiz kalmasın; kurallar herkesle aynıdır.
 */
const AI_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Amazonbot',
  'Bytespider',
  'meta-externalagent',
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://ysnsoft.com';

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      { userAgent: AI_AGENTS, allow: ['/', '/llms.txt', '/llms-full.txt'], disallow: PRIVATE },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
