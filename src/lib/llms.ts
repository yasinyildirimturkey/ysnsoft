import { PRODUCTS } from '@/data/products';
import { BLOG_POSTS } from '@/data/blog';
import { FAQS } from '@/data/faq';
import { CONTACT, postUrl, projectUrl, SITE_URL } from '@/lib/seo';

/**
 * llms.txt (llmstxt.org): yapay zekâ asistanlarının siteyi doğru özetlemesi için
 * düz metin kılavuz. İçerik ürün verisinden üretilir; elle ayrı tutulmaz.
 */
const intro = `# YSNSOFT

> YSNSOFT, İstanbul Pendik merkezli bir yazılım şirketidir. Kurumsal web siteleri, çok dilli portallar, SaaS ürünleri, e-ticaret ve rezervasyon sistemleri geliştirir. Kurucu: Yasin Yıldırım.

- Web: ${SITE_URL}
- Telefon / WhatsApp: ${CONTACT.phoneDisplay}
- E-posta: ${CONTACT.email}
- Konum: ${CONTACT.place}, Türkiye
- Dil: Türkçe (Almanya'daki işletmeler için Almanca web tasarım hizmeti de verilir)

Fiyat, teslim süresi ve müşteri sayısı gibi rakamlar bu sitede yayımlanmaz; projeye göre yazılı teklif verilir.`;

export function llmsTxt(): string {
  return [
    intro,
    '## Projeler',
    PRODUCTS.map((p) => `- [${p.name}](${projectUrl(p)}): ${p.tagline}. Canlı adres: ${p.liveUrl}`).join('\n'),
    '## Blog',
    BLOG_POSTS.map((p) => `- [${p.title}](${postUrl(p)}): ${p.summary}`).join('\n'),
    '## Diğer',
    [
      `- [Tüm projeler](${SITE_URL}/projeler)`,
      `- [Ayrıntılı sürüm](${SITE_URL}/llms-full.txt): proje açıklamaları, özellikler ve sık sorulan sorular tek dosyada`,
      `- [Site haritası](${SITE_URL}/sitemap.xml)`,
    ].join('\n'),
  ].join('\n\n') + '\n';
}

export function llmsFullTxt(): string {
  const projects = PRODUCTS.map((p) =>
    [
      `### ${p.name}`,
      `- Sayfa: ${projectUrl(p)}`,
      `- Canlı adres: ${p.liveUrl}${p.secondaryUrl ? ` (ayrıca ${p.secondaryUrl})` : ''}`,
      `- Tür: ${p.categoryLabel}`,
      `- Özet: ${p.tagline}`,
      '',
      p.longDesc,
      '',
      'Özellikler:',
      ...p.features.map((f) => `- ${f}`),
      '',
      `Teknolojiler: ${p.techStack.join(', ')}`,
    ].join('\n'),
  ).join('\n\n');

  const posts = BLOG_POSTS.map((p) =>
    [`### ${p.title}`, `- Sayfa: ${postUrl(p)}`, `- Tarih: ${p.isoDate}`, '', p.summary, '', `Problem: ${p.content.problem}`, '', `Çözüm: ${p.content.solution}`].join('\n'),
  ).join('\n\n');

  const faqs = FAQS.map((f) => `### ${f.question}\n\n${f.answer}`).join('\n\n');

  return [intro, '## Projeler', projects, '## Blog yazıları', posts, '## Sık sorulan sorular', faqs].join('\n\n') + '\n';
}

export const TEXT_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'public, max-age=3600',
};
