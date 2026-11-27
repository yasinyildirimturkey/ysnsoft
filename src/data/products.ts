export interface ProductMetric {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  tagline: string;
  category: 'legal' | 'cad' | 'saas' | 'ecommerce' | 'tourism';
  categoryLabel: string;
  badge: string;
  shortDesc: string;
  longDesc: string;
  metrics: ProductMetric[];
  features: string[];
  techStack: string[];
  accentColor: string;
  previewType: 'legal' | 'cad' | 'portal' | 'ecommerce' | 'food' | 'tourism';
  liveUrl: string;
  displayDomain: string;
  secondaryUrl?: string;
  secondaryDomain?: string;
  realCodePath?: string;
  /** Eskiden ölçülmeyen "kullanıcı/uptime/ciro" rakamları vardı; kaldırıldı. Eski kayıtlarla uyum için isteğe bağlı. */
  liveStats?: {
    users?: string;
    uptime?: string;
    processedVolume?: string;
    speed?: string;
  };
}

export const PRODUCTS: Product[] = [
  {
    id: 'kglex-hukuk',
    name: 'KGLEX LegalTech AI',
    tagline: 'UYAP Robotu, Dava & İcra Takibi ve Yapay Zeka Hukuk Asistanı',
    category: 'legal',
    categoryLabel: 'Hukuk Teknolojileri',
    badge: 'Canlıda Yayında',
    shortDesc: 'UYAP otomasyonu, icra ve dava takibi, müvekkil portalı, arabuluculuk ve hukuk bürosu muhasebesini tek çatı altında toplayan yeni nesil LegalTech SaaS ekosistemi.',
    longDesc: 'KGLEX, avukatların ve kurumsal hukuk departmanlarının UYAP sorgulamalarını otonomlaştıran, duruşma ve tebligatları kaçırmayan, yapay zekayla mevzuat ve içtihat taraması yapan entegre bir hukuk yönetim platformudur. Web, mobil ve arka plan robot ajanlarıyla 7/24 çalışır.',
    metrics: [
      { label: 'Kullanıcı', value: 'Hukuk büroları' },
      { label: 'Kapsam', value: 'Dava & icra takibi' },
      { label: 'Erişim', value: 'Web tarayıcısı' }
    ],
    features: [
      'Otonom UYAP Robotu ile Anlık Evrak, Tebligat & Dosya Taraması',
      'İcra & Dava Yönetimi, Süreli Duruşma Ajandası & SMS/E-Posta Hatırlatma',
      'Müvekkil Portalı ile Güvenli Dosya Paylaşımı & Sanal POS Tahsilat',
      'Arabuluculuk & Tevkil Ağı Entegrasyonu, KEP & Mobil E-İmza Desteği'
    ],
    techStack: ['Next.js 16', 'React 19', 'Python Robot', 'Node.js', 'PostgreSQL', 'Tailwind v4'],
    accentColor: '#0071E3',
    previewType: 'legal',
    liveUrl: 'https://www.kglex.com',
    displayDomain: 'kglex.com',
    realCodePath: 'D:\\hukuk\\kglex'
  },
  {
    id: 'hgavukatlik',
    name: 'HG Avukatlık & Açıkel Law',
    tagline: 'Kurumsal Hukuk Bürosu Web Sitesi, Çok Dilli Müvekkil Portalı',
    category: 'legal',
    categoryLabel: 'Hukuk Portalları',
    badge: 'Çok Dilli (TR/EN/DE/AR)',
    shortDesc: 'Uluslararası tahkim, şirketler hukuku ve dava takibi için geliştirilmiş; müvekkillerin güvenle dosya incelediği ve online ödeme yaptığı prestijli hukuk portalı.',
    longDesc: 'HG Avukatlık ve Açıkel Hukuk için geliştirilen bu sistem; İngilizce, Almanca, Arapça ve Rusça çok dilli mimari, güvenli müvekkil giriş alanı, online vekalet & sözleşme onayı ve entegre sanal POS tahsilat modülü içerir.',
    metrics: [
      { label: 'Tür', value: 'Hukuk bürosu sitesi' },
      { label: 'Diller', value: 'TR / EN / DE / AR' },
      { label: 'Bölüm', value: 'Müvekkil alanı' }
    ],
    features: [
      'TR, EN, DE, AR ve RU Çok Dilli SEO Uyumlu Kurumsal Sayfalar',
      'Şifreli Müvekkil Portalı ile Dosya & Bilirkişi Raporu Görüntüleme',
      'Tek Tıkla Kredi Kartı ile Online Vekalet Ücreti & Harç Ödemesi',
      'Hukuk Bülteni, Makale Yayım Paneli ve Danışmanlık Talep Formu'
    ],
    techStack: ['Next.js 16', 'React 19', 'Tailwind CSS', 'TypeScript', 'Iyzico'],
    accentColor: '#0284C7',
    previewType: 'legal',
    liveUrl: 'https://www.hgavukatlik.com',
    displayDomain: 'hgavukatlik.com',
    secondaryUrl: 'https://www.acikellaw.com',
    secondaryDomain: 'acikellaw.com',
    realCodePath: 'D:\\hukuk\\acikel\\law_front'
  },
  {
    id: 'acikellaw',
    name: 'Açıkel Law & Danışmanlık',
    tagline: 'Uluslararası Ticaret & Tahkim Hukuk Bürosu Web Portalı',
    category: 'legal',
    categoryLabel: 'Hukuk Portalları',
    badge: 'Canlıda Yayında',
    shortDesc: 'Uluslararası tahkim, yabancılar hukuku ve kurumsal danışmanlık hizmetleri sunan çok dilli prestijli hukuk ofisi portali.',
    longDesc: 'Açıkel Hukuk için geliştirilmiş bu altyapı; İngilizce, Almanca ve Rusça dillerinde tam SEO uyumluluğu, online randevu takvimi ve müvekkil evrak paylaşım alanı içerir.',
    metrics: [
      { label: 'Tür', value: 'Hukuk bürosu sitesi' },
      { label: 'Diller', value: 'TR / EN / DE' },
      { label: 'Alan', value: 'Ticaret & tahkim' }
    ],
    features: [
      'Çok Dilli Kurumsal Hukuk Departmanı Tanıtımı ve Makaleler',
      'Müvekkil İletişim & Online Danışmanlık Randevu Formu',
      'Mobil Uyumlu Modern Cupertino UI Tasarımı',
      'SSL & KVKK Uyumlu İletişim Kanalları'
    ],
    techStack: ['Next.js 16', 'React 19', 'Tailwind CSS', 'TypeScript'],
    accentColor: '#1E40AF',
    previewType: 'legal',
    liveUrl: 'https://www.acikellaw.com',
    displayDomain: 'acikellaw.com',
    realCodePath: 'D:\\hukuk\\acikel\\law_front'
  },
  {
    id: 'haritaplan-geoplan',
    name: 'HaritaPlan / GeoPlan',
    tagline: '3D Harita Stüdyosu, İmar Planlama & CBS Mühendislik SaaS',
    category: 'cad',
    categoryLabel: 'Harita & CBS',
    badge: '3D Three.js Destekli',
    shortDesc: '3194 Sayılı Kanun Md. 18 DOP hesabı, ifraz, tevhid, kamulaştırma, plankote ve 3D bina gabarisi üreten Türkiye’nin en gelişmiş bulut harita mühendisliği platformu.',
    longDesc: 'Harita mühendisleri, şehir plancıları ve belediyeler için tasarlanmış HaritaPlan; Netcad (.ncn) ve AutoCAD (.dxf) dosyalarını doğrudan tarayıcıda okuyup işleyen, tapu harçlarını hesaplayan ve resmi dağıtım cetvellerini tek tıkla üreten profesyonel bir CBS ekosistemidir.',
    metrics: [
      { label: 'Konu', value: 'İmar uygulaması' },
      { label: 'Dosya', value: 'Netcad & DXF' },
      { label: 'Görünüm', value: 'Tarayıcıda 3D' }
    ],
    features: [
      '3194 Md. 18 Arazi Düzenlemesi ve Otomatik Düzenleme Ortaklık Payı (DOP)',
      '3D Harita Stüdyosu ile Bina Gabarisi, Güneş-Gölge Analizi ve Enine Kesit',
      'Netcad (.NCN) ve AutoCAD (.DXF) Çift Yönlü Dosya Dönüştürme',
      'Kamulaştırma, Kentsel Dönüşüm (%50+1 Protokolü) ve HKMO Antetli Teklif'
    ],
    techStack: ['Next.js 15', 'Three.js 3D', 'Leaflet CBS', 'TypeScript', 'Node.js'],
    accentColor: '#10B981',
    previewType: 'cad',
    liveUrl: 'https://www.haritaplan.com',
    displayDomain: 'haritaplan.com',
    realCodePath: 'D:\\harita'
  },
  {
    id: 'panelde-saas',
    name: 'Panelde Multi-Tenant SaaS',
    tagline: 'Gelişmiş Çok Kiracılı Emlak, İlan & Kurumsal Yönetim Portalı',
    category: 'saas',
    categoryLabel: 'Yönetim Portalları',
    badge: 'Multi-Tenant Mimari',
    shortDesc: 'Yüzlerce bağımsız ofis ve acente için tek altyapıdan yönetilen; ilan portalları, CRM, müşteri talep eşleme ve otomatik muhasebe platformu.',
    longDesc: 'Panelde; Express 4 API + Next.js App Router ve React Native mobil altyapısıyla çalışan devasa bir multi-tenant kurumsal platformdur. Soket tabanlı gerçek zamanlı mesajlaşma, MariaDB/Sequelize veri mimarisi ve iisnode uyumlu yüksek performanslı motor barındırır.',
    metrics: [
      { label: 'Kullanıcı', value: 'Emlak ofisleri' },
      { label: 'Yapı', value: 'Çok kiracılı' },
      { label: 'Kapsam', value: 'İlan & ofis yönetimi' }
    ],
    features: [
      'Çok Kiracılı (Multi-Tenant) İlan, Portföy ve Şube Yönetim Konsolu',
      'Akıllı Müşteri Talep & Gayrimenkul Eşleştirme Algoritması',
      'Entegre Sanal POS, Tahsilat, Cari Takip ve Otomatik E-Fatura',
      'Web, Mobil (Expo / React Native) ve RESTful API Tam Senkronizasyonu'
    ],
    techStack: ['Next.js', 'Express 4', 'Socket.IO', 'MariaDB', 'React Native / Expo'],
    accentColor: '#8B5CF6',
    previewType: 'portal',
    liveUrl: 'https://www.panelde.com',
    displayDomain: 'panelde.com',
    realCodePath: 'D:\\panelde'
  },
  {
    id: 'samatya-mezecisi',
    name: 'Tarihi Samatya Mezecisi',
    tagline: 'B2B & B2C Gurme Gıda E-Ticaret, QR Menü & Sipariş Platformu',
    category: 'ecommerce',
    categoryLabel: 'Gıda & Restoran SaaS',
    badge: 'B2B + B2C + QR',
    shortDesc: 'Yüksek hacimli soğuk zincir gurme meze satışını, restoran masadan QR sipariş yönetimini ve anlık kurye takibini birleştiren tam kapsamlı e-ticaret çözümü.',
    longDesc: 'Tarihi Samatya Mezecisi için özel geliştirilen platform; Playwright ile uçtan uca test edilmiş, Google OAuth entegrasyonlu, QR kod masadan sipariş ve çok kanallı soğuk zincir lojistik takibine sahip modern Next.js 16 e-ticaret ekosistemidir.',
    metrics: [
      { label: 'Satış', value: 'B2B + B2C' },
      { label: 'Menü', value: 'QR menü' },
      { label: 'Sipariş', value: 'Online sipariş' }
    ],
    features: [
      'B2B Restoran/Otel Toptan Tedarik & B2C Bireysel Gurme Satış Modülü',
      'Masadan Temassız QR Menü ile Anlık Mutfak Yazıcısı ve Kasa Entegrasyonu',
      'Gerçek Zamanlı Harita Üzerinden Kurye & Soğuk Zincir Sıcaklık Takibi',
      'Google Tek Tıkla Giriş & Güvenli Taksitli Sanal POS Altyapısı'
    ],
    techStack: ['Next.js 16', 'React 19', 'QR Engine', 'Google OAuth', 'Tailwind'],
    accentColor: '#F59E0B',
    previewType: 'food',
    liveUrl: 'https://www.tarihisamatyamezecisi.com',
    displayDomain: 'tarihisamatyamezecisi.com',
    realCodePath: 'D:\\samatya'
  },
  {
    id: 'flamantyou-kozmetik',
    name: 'Flamantyou Kozmetik & Beauty',
    tagline: 'AI Destekli Cilt Analizi, B2B Bayi & Influencer E-Ticaret',
    category: 'ecommerce',
    categoryLabel: 'E-Ticaret & AI',
    badge: 'AI Cilt Analizi',
    shortDesc: 'Kullanıcının yüzünü analiz edip kişiselleştirilmiş ürün reçetesi çıkaran yapay zeka aracı, bayi iskonto matrisi ve influencer affiliate ağı barındıran lüks e-ticaret sistemi.',
    longDesc: 'Flamantyou projesi; Prisma ORM, Next.js ve mobil uygulamaları kapsayan lüks kozmetik markaları için geliştirilmiş uçtan uca bir dijital satış motorudur. Cilt günlüğü takibi, çoklu para birimi ve otomatik kargo entegrasyonu sunar.',
    metrics: [
      { label: 'Tür', value: 'E-ticaret' },
      { label: 'Özellik', value: 'AI cilt analizi' },
      { label: 'Kanal', value: 'Bayi & influencer' }
    ],
    features: [
      'Kamera ile Anlık AI Cilt Analizi ve Kişiselleştirilmiş Bakım Reçetesi',
      'Influencer Özel Link & Komisyon Takip Sistemi (Affiliate)',
      'B2B Kurumsal Bayi İskonto & Taksitli Sanal POS Portalı',
      'Yurtiçi & MNG Kargo Otomatik Barkod ve Çift Yönlü SMS Bildirimi'
    ],
    techStack: ['Next.js', 'Prisma ORM', 'TensorFlow / AI', 'PostgreSQL', 'Tailwind'],
    accentColor: '#EC4899',
    previewType: 'ecommerce',
    liveUrl: 'https://www.flamantyou.com',
    displayDomain: 'flamantyou.com',
    realCodePath: 'D:\\kozmetik'
  },
  {
    id: 'bodrum-luxury',
    name: 'Dolphin & ARM Bodrum Luxury',
    tagline: 'Bodrum Lüks Villa Kiralama, VIP Transfer & Concierge Rezervasyon',
    category: 'tourism',
    categoryLabel: 'Turizm & Rezervasyon',
    badge: 'Lüks Segment',
    shortDesc: 'Bodrum, Mandarin Oriental ve çevre koylarda ultra lüks villa kiralama, özel yat kiralama ve VIP transfer süreçlerini yöneten çok dilli rezervasyon motoru.',
    longDesc: 'Bodrum’un en seçkin turizm ve gayrimenkul operasyonları için geliştirilen bu sistem; anlık takvim müsaitliği, döviz bazlı online kaparo ödemesi, rota optimizasyonlu VIP araç takip modülü ve çok dilli (EN, RU, AR, TR) lüks arayüz sunar.',
    metrics: [
      { label: 'Tür', value: 'Villa & yat kiralama' },
      { label: 'Hizmet', value: 'VIP transfer' },
      { label: 'Bölge', value: 'Bodrum' }
    ],
    features: [
      'Interaktif Bodrum & Kıyı Şeridi Haritası ile Villa/Yat Seçimi',
      'Gerçek Zamanlı Rezervasyon Takvimi & Çoklu Para Birimi (EUR/USD/GBP/TRY)',
      'VIP Özel Şoförlü Transfer ve Lüks Tekne Turu Online Paketleyici',
      'Mandarin Oriental & Bodrum Marina Doğrudan Concierge Entegrasyonu'
    ],
    techStack: ['Next.js', 'Leaflet Maps', 'Stripe Global', 'Tailwind', 'Cloudflare'],
    accentColor: '#0284C7',
    previewType: 'tourism',
    liveUrl: 'https://www.dolphinbodrum.com',
    displayDomain: 'dolphinbodrum.com',
    secondaryUrl: 'https://www.armbodrum.com',
    secondaryDomain: 'armbodrum.com',
    realCodePath: 'D:\\web\\2026yy'
  },
  {
    id: 'dmyacht',
    name: 'DMyacht',
    tagline: 'Yat Kiralama, Gulet ve Tekne Turu Pazaryeri',
    category: 'tourism',
    categoryLabel: 'Turizm & Pazaryeri',
    badge: '5 Dilde Rezervasyon',
    shortDesc: 'Bodrum, Göcek, Fethiye ve Marmaris’te saatlik, günlük ve haftalık yat kiralama, gulet ile mavi tur ve günlük tekne turlarını tek yerde toplayan tekne kiralama platformu.',
    longDesc: 'DMyacht; tekne firmalarının ilanlarını yayınladığı, misafirlerin müsaitliğe bakıp çevrim içi rezervasyon yaptığı bir pazaryeridir. Misafir rotasını ve bütçesini yazar, bölgedeki firmalar teklif gönderir. Harita üzerinden arama, denizde hava durumu (rüzgâr, yağmur, dalga), firma yönetim paneli ve Türkçe, İngilizce, Almanca, Rusça, Arapça arayüz içerir.',
    metrics: [
      { label: 'Tür', value: 'Tekne kiralama pazaryeri' },
      { label: 'Diller', value: 'TR / EN / DE / RU / AR' },
      { label: 'Bölge', value: 'Ege & Akdeniz' }
    ],
    features: [
      'Saatlik, Günlük ve Haftalık Kiralama, Mavi Tur ve Günlük Tekne Turu İlanları',
      '“Rotanı Yaz, Firmalar Teklif Versin” Ters Pazaryeri Akışı',
      'Harita Üzerinden Arama ve Denizde Hava Durumu (Rüzgâr, Yağmur, Dalga)',
      'Firma Paneli, 3D Secure Ödeme ve Dijital Biniş Kartı'
    ],
    techStack: ['Next.js', 'React', 'Harita Entegrasyonu', '3D Secure Ödeme', '5 Dil (RTL dahil)'],
    accentColor: '#0EA5E9',
    previewType: 'tourism',
    liveUrl: 'https://dmyacht.com',
    displayDomain: 'dmyacht.com'
  },
  {
    id: 'kenangumusten',
    name: 'Av. Kenan Gümüşten',
    tagline: 'Hukuk ve Danışmanlık Bürosu Web Sitesi, Müvekkil Portalı',
    category: 'legal',
    categoryLabel: 'Hukuk Portalları',
    badge: 'Çok Dilli (TR/EN/DE/RU/AR)',
    shortDesc: 'İstanbul’da ticaret ve şirketler, icra-iflas, iş, gayrimenkul, sözleşmeler ve ceza hukuku alanlarında çalışan avukatlık bürosu için beş dilli kurumsal site ve müvekkil portalı.',
    longDesc: 'Av. Kenan Gümüşten Hukuk ve Danışmanlık için geliştirilen site; uzmanlık alanları, kurumsal danışmanlık modeli, çalışma süreci ve sık sorulan sorular bölümlerini Türkçe, İngilizce, Almanca, Rusça ve Arapça sunar. Müvekkiller portala giriş yapabilir, ziyaretçiler danışmanlık talep formuyla görüşme isteyebilir.',
    metrics: [
      { label: 'Tür', value: 'Hukuk bürosu sitesi' },
      { label: 'Diller', value: 'TR / EN / DE / RU / AR' },
      { label: 'Bölüm', value: 'Müvekkil portalı' }
    ],
    features: [
      'TR, EN, DE, RU ve AR Beş Dilli Kurumsal Sayfalar (Arapça Sağdan Sola)',
      'Müvekkil Portalı Girişi',
      'Danışmanlık Talep Formu ve Görüşme Planlama',
      'Uzmanlık Alanları, Çalışma Süreci ve Sık Sorulan Sorular Bölümleri'
    ],
    techStack: ['Next.js', 'React', 'Tailwind CSS', '5 Dil (RTL dahil)'],
    accentColor: '#14284B',
    previewType: 'legal',
    liveUrl: 'https://www.kenangumusten.com',
    displayDomain: 'kenangumusten.com'
  }
];

export const getProduct = (id: string) => PRODUCTS.find((p) => p.id === id);

// Eskiden burada gerçek kişilere ait OLMAYAN alıntılar ve sonuç rakamları vardı (2026-11-18 kaldırıldı).
// Yalnız müşterinin yazılı izniyle alınmış gerçek yorumlar eklenmeli.
export const CLIENT_TESTIMONIALS: { name: string; role: string; company: string; comment: string; rating: number; result: string; siteUrl: string }[] = [];

export const TECH_STACK_ITEMS = [
  { name: 'Next.js 16 & 15', desc: 'App Router & Turbopack', category: 'Frontend' },
  { name: 'React 19', desc: 'Modern Bileşen Mimarisi', category: 'Frontend' },
  { name: 'Three.js 3D', desc: '3D Harita & Gabari Modelleme', category: 'CAD' },
  { name: 'Python UYAP Bot', desc: 'Otonom Robot & OCR', category: 'Robotics' },
  { name: 'Node.js & Express 4', desc: 'Yüksek Hızlı API Katmanı', category: 'Backend' },
  { name: 'PostgreSQL & MariaDB', desc: 'İlişkisel Veri Güvenliği', category: 'Database' },
  { name: 'Leaflet CBS', desc: 'Harita & Parsel Sorgulama', category: 'GIS' },
  { name: 'React Native / Expo', desc: 'iOS & Android Native Mobil', category: 'Mobile' },
];
