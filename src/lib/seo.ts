import { PORTFOLIO, type Product } from '@/data/products';
import { FAQS } from '@/data/faq';
import type { BlogPost } from '@/data/blog';

/** Arama motorları ve yapay zekâ asistanları için tek kaynak: adres, kimlik ve yapılandırılmış veri üreticileri. */
export const SITE_URL = 'https://ysnsoft.com';
export const SITE_NAME = 'YSNSOFT';
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
/** Proje ve genel sayfaların son içerik güncellemesi (sitemap lastmod) */
export const CONTENT_UPDATED = '2026-11-27';

export const CONTACT = {
  phone: '+90-532-725-5098',
  phoneDisplay: '0532 725 50 98',
  phoneHref: 'tel:+905327255098',
  whatsapp: 'https://wa.me/905327255098',
  email: 'destek@ysnsoft.com',
  place: 'Pendik / İstanbul',
};

export const projectPath = (p: Pick<Product, 'id'>) => `/projeler/${p.id}`;
export const projectUrl = (p: Pick<Product, 'id'>) => `${SITE_URL}${projectPath(p)}`;
export const postUrl = (p: Pick<BlogPost, 'slug'>) => `${SITE_URL}/blog/${p.slug}`;

/** Sayfa openGraph'ı üst düzeni tümüyle ezdiği için ortak alanlar her sayfada yeniden verilir. */
export const OG_IMAGE = { url: '/opengraph-image.png', width: 1200, height: 630, alt: 'YSNSOFT: canlıda çalışan web siteleri ve özel yazılım' };
export const ogBase = { siteName: SITE_NAME, locale: 'tr_TR', images: [OG_IMAGE] };

/** <script type="application/ld+json"> içine güvenle yazılacak metin */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

const address = {
  '@type': 'PostalAddress',
  streetAddress: 'Pendik Merkez Mahallesi',
  addressLocality: 'Pendik',
  addressRegion: 'İstanbul',
  postalCode: '34890',
  addressCountry: 'TR',
};

/** Her sayfada: kurum + site kimliği */
export function organizationGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Organization', 'ProfessionalService'],
        '@id': ORG_ID,
        name: SITE_NAME,
        alternateName: ['YSNSOFT Bilişim', 'YSN Soft'],
        url: SITE_URL,
        logo: `${SITE_URL}/favicon.ico`,
        image: `${SITE_URL}/opengraph-image.png`,
        description:
          'İstanbul Pendik merkezli yazılım şirketi. Kurumsal web siteleri, çok dilli portallar, SaaS ürünleri, e-ticaret ve rezervasyon sistemleri geliştirir.',
        telephone: CONTACT.phone,
        email: CONTACT.email,
        foundingDate: '2024',
        founder: { '@type': 'Person', name: 'Yasin Yıldırım', jobTitle: 'Kurucu, Yazılım Mimarı' },
        address,
        geo: { '@type': 'GeoCoordinates', latitude: 40.8795, longitude: 29.2578 },
        areaServed: [
          { '@type': 'Country', name: 'Türkiye' },
          { '@type': 'Country', name: 'Deutschland' },
        ],
        knowsAbout: [
          'Web sitesi geliştirme',
          'SaaS yazılım geliştirme',
          'Hukuk teknolojileri (LegalTech)',
          'Coğrafi bilgi sistemleri (CBS)',
          'E-ticaret',
          'Rezervasyon ve pazaryeri sistemleri',
          'Next.js',
          'React',
        ],
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            opens: '09:00',
            closes: '18:30',
          },
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          telephone: CONTACT.phone,
          email: CONTACT.email,
          availableLanguage: ['Turkish', 'English', 'German'],
        },
        sameAs: ['https://github.com/yasinyildirimturkey/ysnsoft'],
      },
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: SITE_URL,
        name: SITE_NAME,
        description: 'Kurumsal web siteleri, SaaS ürünleri ve özel yazılım',
        publisher: { '@id': ORG_ID },
        inLanguage: 'tr-TR',
      },
    ],
  };
}

const SOFTWARE_CATEGORY: Partial<Record<Product['category'], string>> = {
  saas: 'BusinessApplication',
  cad: 'DesignApplication',
};

/** KGLEX, HaritaPlan, Panelde ve DMyacht birer yazılım ürünü/platform; diğerleri müşteri için yapılmış web siteleri. */
const isSoftware = (p: Product) => p.category === 'saas' || p.category === 'cad' || p.id === 'kglex-hukuk' || p.id === 'dmyacht';

export function productSchema(p: Product) {
  const base = {
    '@id': `${projectUrl(p)}#project`,
    name: p.name,
    alternateName: p.displayDomain,
    description: p.shortDesc,
    url: p.liveUrl,
    mainEntityOfPage: projectUrl(p),
    inLanguage: 'tr',
    keywords: [p.categoryLabel, ...p.techStack].join(', '),
  };
  if (isSoftware(p)) {
    return {
      '@type': 'SoftwareApplication',
      ...base,
      applicationCategory: SOFTWARE_CATEGORY[p.category] || 'BusinessApplication',
      operatingSystem: 'Web',
      featureList: p.features,
      author: { '@id': ORG_ID },
    };
  }
  return {
    '@type': 'WebSite',
    ...base,
    creator: { '@id': ORG_ID },
  };
}

const breadcrumb = (items: { name: string; url: string }[]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
});

const faqPage = (id: string, faqs: { question: string; answer: string }[]) => ({
  '@type': 'FAQPage',
  '@id': id,
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: { '@type': 'Answer', text: f.answer },
  })),
});

const projectList = (id: string) => ({
  '@type': 'ItemList',
  '@id': id,
  name: 'YSNSOFT canlı projeler',
  numberOfItems: PORTFOLIO.length,
  itemListElement: PORTFOLIO.map((p, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: p.name,
    url: projectUrl(p),
  })),
});

/** Ana sayfa: proje listesi + SSS (SSS bölümü sayfada görünür) */
export function homeGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [projectList(`${SITE_URL}/#products`), faqPage(`${SITE_URL}/#faq`, FAQS)],
  };
}

export function projectsIndexGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}/projeler#page`,
        url: `${SITE_URL}/projeler`,
        name: 'YSNSOFT Projeleri',
        isPartOf: { '@id': WEBSITE_ID },
        about: { '@id': ORG_ID },
        mainEntity: { '@id': `${SITE_URL}/projeler#list` },
      },
      projectList(`${SITE_URL}/projeler#list`),
      breadcrumb([
        { name: 'Ana Sayfa', url: SITE_URL },
        { name: 'Projeler', url: `${SITE_URL}/projeler` },
      ]),
    ],
  };
}

/** Proje sayfasında görünen soru-yanıtlar; yalnız ürün verisinde yazanlardan üretilir. */
export function projectFaqs(p: Product) {
  return [
    { question: `${p.name} nedir?`, answer: p.longDesc },
    { question: `${p.name} hangi özellikleri içerir?`, answer: `${p.features.join('; ')}.` },
    { question: `${p.name} hangi teknolojilerle geliştirildi?`, answer: `${p.techStack.join(', ')}.` },
    {
      question: `${p.name} projesini kim geliştirdi ve nerede yayında?`,
      answer: `${p.name}, YSNSOFT tarafından geliştirildi ve ${p.displayDomain} adresinde yayında.`,
    },
  ];
}

export function projectGraph(p: Product) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${projectUrl(p)}#page`,
        url: projectUrl(p),
        name: `${p.name}: ${p.tagline}`,
        description: p.shortDesc,
        isPartOf: { '@id': WEBSITE_ID },
        about: { '@id': `${projectUrl(p)}#project` },
        dateModified: CONTENT_UPDATED,
        inLanguage: 'tr-TR',
      },
      productSchema(p),
      faqPage(`${projectUrl(p)}#faq`, projectFaqs(p)),
      breadcrumb([
        { name: 'Ana Sayfa', url: SITE_URL },
        { name: 'Projeler', url: `${SITE_URL}/projeler` },
        { name: p.name, url: projectUrl(p) },
      ]),
    ],
  };
}

export function blogIndexGraph(posts: BlogPost[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        '@id': `${SITE_URL}/blog#blog`,
        url: `${SITE_URL}/blog`,
        name: 'YSNSOFT Mühendislik Blogu',
        publisher: { '@id': ORG_ID },
        inLanguage: 'tr-TR',
        blogPost: posts.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: postUrl(p), datePublished: p.isoDate })),
      },
      breadcrumb([
        { name: 'Ana Sayfa', url: SITE_URL },
        { name: 'Blog', url: `${SITE_URL}/blog` },
      ]),
    ],
  };
}

export function postGraph(p: BlogPost) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        '@id': `${postUrl(p)}#article`,
        headline: p.title,
        description: p.summary,
        url: postUrl(p),
        mainEntityOfPage: postUrl(p),
        datePublished: p.isoDate,
        dateModified: p.isoDate,
        author: { '@type': 'Organization', '@id': ORG_ID, name: SITE_NAME },
        publisher: { '@id': ORG_ID },
        image: `${SITE_URL}/opengraph-image.png`,
        keywords: p.tags.join(', '),
        articleSection: p.category,
        inLanguage: 'tr-TR',
      },
      breadcrumb([
        { name: 'Ana Sayfa', url: SITE_URL },
        { name: 'Blog', url: `${SITE_URL}/blog` },
        { name: p.title, url: postUrl(p) },
      ]),
    ],
  };
}
