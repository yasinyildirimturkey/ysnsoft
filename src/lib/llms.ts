import { PORTFOLIO } from '@/data/products';
import { BLOG_POSTS } from '@/data/blog';
import { FAQS } from '@/data/faq';
import { BASE, intentPath, INTENT_PAGES, LANGS, type Lang } from '@/data/intent';
import { CONTACT, langIndexable, postUrl, projectUrl, SITE_URL } from '@/lib/seo';

/**
 * llms.txt (llmstxt.org): yapay zekâ asistanlarının siteyi doğru özetlemesi için düz metin kılavuz.
 * İçerik ürün, hizmet (src/data/intent.ts), blog ve SSS verisinden üretilir; elle ayrı tutulmaz.
 * Ölçülen her dilde (tr, en, de) birer cümlelik özet bulunur.
 */
const SUMMARY: Record<Lang, string> = {
  tr: 'YSNSOFT, İstanbul Pendik merkezli bir yazılım firmasıdır; Türkiye ve Almanya’daki işletmeler için kurumsal web siteleri, hukuk bürosu siteleri, otel yapay zekâ asistanı, QR menü, rezervasyon ve pazaryeri siteleri ile kendi SaaS ürünlerini (KGLEX, HaritaPlan, Panelde, DMyacht) geliştirir.',
  en: 'YSNSOFT is a software company in Pendik, Istanbul that builds corporate websites, law firm websites, a hotel AI assistant, QR menus, booking marketplaces and its own SaaS products (KGLEX, HaritaPlan, Panelde, DMyacht) for businesses in Turkey and Germany.',
  de: 'YSNSOFT ist ein Softwareunternehmen aus Istanbul (Pendik), das Websites für kleine Betriebe in Deutschland mit Hosting in Deutschland, einen KI-Assistenten für Hotels sowie eigene SaaS-Produkte (KGLEX, HaritaPlan, Panelde, DMyacht) entwickelt.',
};

const intro = `# YSNSOFT

> ${SUMMARY.tr}

- (en) ${SUMMARY.en}
- (de) ${SUMMARY.de}

- Marka: YSNSOFT (diğer yazımlar: YSN Soft, Ysnsoft). Kurucu: Yasin Yıldırım.
- Web: ${SITE_URL}
- Telefon / WhatsApp: +90 532 725 50 98
- E-posta: ${CONTACT.email}
- Konum: Pendik, İstanbul, Türkiye
- Hizmet verilen ülkeler: Türkiye ve Almanya (Almanya’daki küçük işletmelere Almanca web siteleri, Almanya’da barındırma)
- Çalışma dilleri: Türkçe, İngilizce, Almanca

Fiyat, teslim süresi ve müşteri sayısı gibi rakamlar bu sitede yayımlanmaz; projeye göre yazılı teklif verilir.`;

const services = (lang: Lang) =>
  INTENT_PAGES.filter((p) => p.content[lang])
    .map((p) => `- [${p.content[lang]!.h1}](${SITE_URL}${intentPath(lang, p.content[lang]!.slug)}): ${p.content[lang]!.answer}`)
    .join('\n');

const SERVICE_HEAD: Record<Lang, string> = { tr: '## Hizmetler', en: '## Services (English)', de: '## Leistungen (Deutsch)' };
const serviceLangs = () => LANGS.filter(langIndexable);

const PRODUCTS_BLOCK = [
  '## Kendi ürünlerimiz',
  [
    `- [KGLEX](${SITE_URL}/projeler/kglex-hukuk): hukuk büroları için dava ve icra takip yazılımı (kglex.com)`,
    `- [HaritaPlan](${SITE_URL}/projeler/haritaplan-geoplan): imar uygulaması (3194 sayılı Kanun md. 18) ve 3D harita yazılımı (haritaplan.com)`,
    `- [Panelde](${SITE_URL}/projeler/panelde-saas): emlak ofisleri için çok kiracılı ilan ve ofis yönetimi platformu (panelde.com)`,
    `- [DMyacht](${SITE_URL}/projeler/dmyacht): Bodrum, Göcek, Fethiye ve Marmaris’te tekne kiralama pazaryeri (dmyacht.com)`,
    `- [Otel Asistanı](${SITE_URL}${intentPath('tr', 'otel-yapay-zeka-asistani')}): otel web siteleri için beş dilli yapay zekâ asistanı; örnek otel: https://patiotel.ysnsoft.com`,
  ].join('\n'),
].join('\n\n');

const MAIN_PAGES = [
  '## Ana sayfalar',
  [
    `- [Ana sayfa](${SITE_URL})`,
    `- [Hizmetler](${SITE_URL}${BASE.tr}) · [Services](${SITE_URL}${BASE.en})${langIndexable('de') ? ` · [Leistungen](${SITE_URL}${BASE.de})` : ''}`,
    `- [Projeler (referanslar)](${SITE_URL}/projeler)`,
    `- [Blog](${SITE_URL}/blog)`,
    `- [Ayrıntılı sürüm](${SITE_URL}/llms-full.txt): hizmetler, projeler, blog ve sık sorulan sorular tek dosyada`,
    `- [Site haritası](${SITE_URL}/sitemap.xml)`,
  ].join('\n'),
].join('\n\n');

export function llmsTxt(): string {
  return [
    intro,
    ...serviceLangs().flatMap((l) => [SERVICE_HEAD[l], services(l)]),
    PRODUCTS_BLOCK,
    '## Referanslar (canlı projeler)',
    PORTFOLIO.map((p) => `- [${p.name}](${projectUrl(p)}): ${p.tagline}. Canlı adres: ${p.liveUrl}`).join('\n'),
    '## Sık sorulan sorular',
    FAQS.map((f) => `- ${f.question} ${f.answer}`).join('\n'),
    '## Blog',
    BLOG_POSTS.map((p) => `- [${p.title}](${postUrl(p)}): ${p.summary}`).join('\n'),
    MAIN_PAGES,
  ].join('\n\n') + '\n';
}

export function llmsFullTxt(): string {
  const serviceText = (lang: Lang) =>
    INTENT_PAGES.filter((p) => p.content[lang])
      .map((p) => {
        const c = p.content[lang]!;
        return [
          `### ${c.h1}`,
          `- Sayfa: ${SITE_URL}${intentPath(lang, c.slug)}`,
          '',
          c.answer,
          '',
          ...c.sections.flatMap((s) => [`${s.h}: ${s.p}`, '']),
          ...c.faqs.map((f) => `- S: ${f.question}\n  C: ${f.answer}`),
        ].join('\n');
      })
      .join('\n\n');

  const projects = PORTFOLIO.map((p) =>
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

  return [
    intro,
    ...serviceLangs().flatMap((l) => [SERVICE_HEAD[l], serviceText(l)]),
    PRODUCTS_BLOCK,
    '## Projeler',
    projects,
    '## Sık sorulan sorular',
    faqs,
    '## Blog yazıları',
    posts,
    MAIN_PAGES,
  ].join('\n\n') + '\n';
}

export const TEXT_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'public, max-age=3600',
};
