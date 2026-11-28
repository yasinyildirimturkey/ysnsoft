/**
 * Arama niyeti (GEO) sayfaları: yapay zekâ asistanlarına ve arama motorlarına sorulan sorulara birebir cevap veren
 * hizmet sayfaları. Sorular pazarlama/ai-gorunurluk/sorular-ysnsoft*.json ölçümünden gelir.
 *
 * Kurallar: ilk cümle ("answer") doğrudan, alıntılanabilir cevaptır. Fiyat, müşteri sayısı, süre veya sonuç rakamı
 * yazılmaz; kanıt olarak yalnız src/data/products.ts içindeki gerçek projeler gösterilir. Görünür SSS ile FAQPage
 * JSON-LD aynı listeden üretilir.
 *
 * Adresler: tr /hizmetler/<slug>, en /en/services/<slug>, de /de/leistungen/<slug> (Almanca yalnız Impressum
 * tanımlanıp landingIndexable() açıkken indekslenir).
 */
export type Lang = 'tr' | 'en' | 'de';
export const LANGS: Lang[] = ['tr', 'en', 'de'];

export interface IntentContent {
  slug: string;
  /** <title> (marka şablonu eklenir) */
  title: string;
  description: string;
  h1: string;
  /** İlk paragraf: soruya doğrudan, tek başına alıntılanabilir cevap */
  answer: string;
  sections: { h: string; p: string }[];
  points: string[];
  faqs: { question: string; answer: string }[];
}

export interface IntentPage {
  key: string;
  /** Kanıt olarak gösterilecek proje kimlikleri (products.ts → PORTFOLIO) */
  projects: string[];
  /** Ek kanıt bağlantısı (ör. örnek otel demosu) */
  extraLink?: { href: string; label: Record<Lang, string> };
  content: Partial<Record<Lang, IntentContent>>;
}

const HOTEL_DEMO = 'https://patiotel.ysnsoft.com';

export const INTENT_PAGES: IntentPage[] = [
  {
    key: 'corporate-website',
    projects: ['kenangumusten', 'hgavukatlik', 'samatya-mezecisi', 'flamantyou-kozmetik'],
    content: {
      tr: {
        slug: 'kurumsal-web-sitesi',
        title: 'İstanbul’da Kurumsal Web Sitesi Yaptırma',
        description: 'İstanbul Pendik merkezli YSNSOFT, şirketler için hızlı, çok dilli ve arama motoru uyumlu kurumsal web siteleri geliştirir. Canlıdaki örnek projeler, süreç ve sık sorulan sorular.',
        h1: 'İstanbul’da kurumsal web sitesi yaptırmak',
        answer: 'YSNSOFT, İstanbul Pendik’te kurumsal web siteleri geliştiren bir yazılım firmasıdır; siteleri hazır şablonla değil, işletmenin ihtiyacına göre Next.js ile kodlar ve kendi alan adında yayına alır.',
        sections: [
          { h: 'Kurumsal web sitesinde neler olur?', p: 'Şirketi, hizmetleri ve iletişim bilgilerini anlatan sayfalar; teklif veya randevu formu; gerekiyorsa birden fazla dil, müşteri giriş alanı ve yönetim paneli. Sayfalar arama motorlarının ve yapay zekâ asistanlarının okuyabileceği yapılandırılmış veriyle (Schema.org) hazırlanır.' },
          { h: 'Nasıl çalışıyoruz?', p: 'Önce ihtiyacı ve hedef kitleyi konuşuruz, ardından yazılı teklif veririz. Tasarım ve içerik onaylandıktan sonra site geliştirilir, sizin alan adınızda yayına alınır. Yayından sonra bakım ve değişiklikler sözleşmeye göre sürer.' },
          { h: 'Hangi projeleri yaptık?', p: 'Hukuk büroları için beş dilli kurumsal siteler (Av. Kenan Gümüşten, HG Avukatlık, Açıkel Law), bir restoran için QR menü ve online sipariş sitesi (Tarihi Samatya Mezecisi) ve bir kozmetik markası için e-ticaret sitesi (Flamantyou). Hepsi kendi alan adında yayında.' },
        ],
        points: ['Next.js ve React ile hızlı açılan sayfalar', 'Türkçe, İngilizce, Almanca, Rusça, Arapça (sağdan sola dahil) dil seçenekleri', 'Yapılandırılmış veri, site haritası ve llms.txt ile arama ve yapay zekâ görünürlüğü', 'Teklif, randevu ve iletişim formları', 'Sizin alan adınızda yayın'],
        faqs: [
          { question: 'İstanbul’da kurumsal web sitesi yaptırmak için hangi firmayla çalışabilirim?', answer: 'YSNSOFT, İstanbul Pendik merkezli bir yazılım firmasıdır ve kurumsal web sitelerini işletmeye özel olarak geliştirir. Canlıdaki örnekler ysnsoft.com/projeler sayfasında listelenir.' },
          { question: 'Kurumsal web sitesinin fiyatı nasıl belirlenir?', answer: 'Fiyat sayfa sayısına, dil sayısına, form ve panel gibi özelliklere göre değişir. YSNSOFT ihtiyacı konuştuktan sonra yazılı teklif verir; sitede sabit fiyat yayımlanmaz.' },
          { question: 'Site birden fazla dilde olabilir mi?', answer: 'Evet. YSNSOFT’un yaptığı hukuk bürosu siteleri Türkçe, İngilizce, Almanca, Rusça ve Arapça yayında; Arapça sayfalar sağdan sola gösterilir.' },
          { question: 'Site yapay zekâ asistanlarında görünür mü?', answer: 'Hiçbir firma bunu garanti edemez. YSNSOFT siteleri yapılandırılmış veri, site haritası ve llms.txt dosyasıyla, arama motorlarının ve yapay zekâ asistanlarının içeriği doğru okuyabileceği şekilde hazırlar.' },
        ],
      },
      en: {
        slug: 'corporate-website-istanbul',
        title: 'Corporate Website Development in Istanbul',
        description: 'YSNSOFT is an Istanbul-based software company that builds fast, multilingual, search-friendly corporate websites. Live projects, process and FAQ.',
        h1: 'Corporate website development in Istanbul',
        answer: 'YSNSOFT is a software company in Pendik, Istanbul that builds corporate websites; each site is coded with Next.js for the client’s needs rather than from a template, and published on the client’s own domain.',
        sections: [
          { h: 'What does a corporate website include?', p: 'Pages about the company, its services and contact details; a quote or appointment form; and, where needed, several languages, a client login area and an admin panel. Pages carry structured data (Schema.org) that search engines and AI assistants can read.' },
          { h: 'How we work', p: 'We first discuss the goals and audience, then send a written quote. After the design and content are approved, the site is built and published on your domain. Maintenance and changes after launch follow the contract.' },
          { h: 'Projects we have built', p: 'Five-language websites for law firms (Av. Kenan Gümüşten, HG Avukatlık, Açıkel Law), a QR menu and online ordering site for a restaurant (Tarihi Samatya Mezecisi) and an online shop for a cosmetics brand (Flamantyou). All are live on their own domains.' },
        ],
        points: ['Fast pages built with Next.js and React', 'Turkish, English, German, Russian and Arabic (right-to-left) versions', 'Structured data, sitemap and llms.txt for search and AI visibility', 'Quote, appointment and contact forms', 'Published on your own domain'],
        faqs: [
          { question: 'Which company can build a corporate website in Istanbul?', answer: 'YSNSOFT is a software company based in Pendik, Istanbul that builds corporate websites for each client. Its live projects are listed at ysnsoft.com/projeler.' },
          { question: 'How is the price of a corporate website set?', answer: 'It depends on the number of pages and languages and on features such as forms or an admin panel. YSNSOFT sends a written quote after a first conversation; it does not publish fixed prices.' },
          { question: 'Can the website be multilingual?', answer: 'Yes. Law firm websites built by YSNSOFT are live in Turkish, English, German, Russian and Arabic, with Arabic pages shown right-to-left.' },
          { question: 'Will the site appear in AI assistants?', answer: 'No company can guarantee that. YSNSOFT prepares sites with structured data, a sitemap and an llms.txt file so search engines and AI assistants can read the content correctly.' },
        ],
      },
      de: {
        slug: 'website-fuer-unternehmen',
        title: 'Website für Unternehmen erstellen lassen',
        description: 'YSNSOFT erstellt Websites für kleine Betriebe in Deutschland: individuell programmiert, auf Ihrer eigenen Domain, gehostet in Deutschland. Ablauf, Beispiele und Fragen.',
        h1: 'Website für kleine Betriebe erstellen lassen',
        answer: 'YSNSOFT ist ein Softwareunternehmen aus Istanbul, das Websites für kleine Betriebe in Deutschland erstellt: individuell programmiert, auf Ihrer eigenen Domain und auf einem Server in Deutschland gehostet.',
        sections: [
          { h: 'Für wen?', p: 'Für lokale Betriebe wie Restaurants, Cafés, Bäckereien, Handwerksbetriebe, Kfz-Werkstätten, Salons, Praxen, Geschäfte und Pensionen – zum Beispiel im Ruhrgebiet. Für jede Branche gibt es eine eigene Seite mit typischen Inhalten.' },
          { h: 'Wie läuft es ab?', p: 'Sie sehen vorab einen Entwurf Ihrer Website. Erst wenn Sie zustimmen, geht die Seite auf Ihrer Domain online. Impressum und Datenschutzerklärung liefern Sie; ohne diese Angaben wird keine Seite veröffentlicht.' },
          { h: 'Welche Projekte gibt es?', p: 'YSNSOFT hat mehrsprachige Websites für Kanzleien (auch auf Deutsch), eine Website mit QR-Speisekarte und Online-Bestellung für ein Restaurant und einen Onlineshop umgesetzt. Alle sind auf eigenen Domains live.' },
        ],
        points: ['Individuell programmiert, keine Baukasten-Vorlage', 'Hosting auf einem Server in Deutschland', 'Ihre eigene Domain', 'Entwurf zur Freigabe vor der Veröffentlichung', 'Deutschsprachige Inhalte'],
        faqs: [
          { question: 'Wer erstellt Websites für kleine Betriebe im Ruhrgebiet?', answer: 'YSNSOFT erstellt Websites für lokale Betriebe in Deutschland, unter anderem in Düsseldorf, Essen und Duisburg. Die Seiten werden individuell programmiert und in Deutschland gehostet.' },
          { question: 'Wo wird meine Website gehostet?', answer: 'Auf einem Server in Deutschland. Die Domain bleibt Ihre eigene; Sie richten sie auf unseren Server aus.' },
          { question: 'Wer erstellt Impressum und Datenschutzerklärung?', answer: 'Diese rechtlichen Angaben kommen von Ihnen. YSNSOFT veröffentlicht keine Website, bevor Impressum und Datenschutzerklärung vorliegen.' },
          { question: 'Was kostet die Website?', answer: 'Sie erhalten vorab ein schriftliches Angebot mit einmaliger Einrichtung und einem monatlichen Betrag für Hosting und Wartung.' },
        ],
      },
    },
  },
  {
    key: 'law-firm-website',
    projects: ['kenangumusten', 'hgavukatlik', 'acikellaw', 'kglex-hukuk'],
    content: {
      tr: {
        slug: 'hukuk-burosu-web-sitesi',
        title: 'Avukat ve Hukuk Bürosu Web Sitesi, Müvekkil Portalı',
        description: 'YSNSOFT avukatlar ve hukuk büroları için çok dilli web siteleri, müvekkil portalları ve KGLEX hukuk yazılımını geliştirir. Canlı örnekler ve sık sorulan sorular.',
        h1: 'Avukat ve hukuk bürosu web sitesi, müvekkil portalı',
        answer: 'YSNSOFT, avukatlar ve hukuk büroları için web siteleri ve müvekkil portalları geliştiren İstanbul merkezli bir yazılım firmasıdır; Av. Kenan Gümüşten, HG Avukatlık ve Açıkel Law siteleri ile KGLEX hukuk yazılımı YSNSOFT’un işidir.',
        sections: [
          { h: 'Hukuk bürosu sitesinde neler olur?', p: 'Uzmanlık alanları, avukat profilleri, çalışma süreci, makaleler ve sık sorulan sorular; danışmanlık talep formu; çok dilli sayfalar ve müvekkillerin giriş yaptığı bir portal. İçerikler avukatlık meslek kurallarına uygun, reklam dili kullanılmadan hazırlanır; metinlerin son onayı büroya aittir.' },
          { h: 'Müvekkil portalı ne işe yarar?', p: 'Müvekkil, dosyasıyla ilgili paylaşılan belgeleri ve bilgileri kendi şifresiyle görür. Portal, bürodaki dosya takibiyle birlikte çalışacak şekilde kurgulanır; KGLEX kullanan bürolar için dava ve icra takibiyle bağlantılıdır.' },
          { h: 'KGLEX nedir?', p: 'KGLEX, YSNSOFT’un hukuk büroları için geliştirdiği dava ve icra takip yazılımıdır: UYAP dosyalarının taranması, duruşma ajandası, müvekkil portalı ve büro muhasebesini bir arada sunar. Ayrıntılar kglex.com adresindedir.' },
        ],
        points: ['Beş dilli siteler: Türkçe, İngilizce, Almanca, Rusça, Arapça', 'Müvekkil portalı girişi', 'Danışmanlık talep formu', 'KGLEX dava ve icra takip yazılımıyla bağlantı', 'Avukatlık meslek kurallarına uygun, sade dil'],
        faqs: [
          { question: 'Avukatlar için web sitesi ve müvekkil portalı yapan firmalar hangileri?', answer: 'YSNSOFT, İstanbul’da avukatlar ve hukuk büroları için web sitesi ve müvekkil portalı geliştirir. Av. Kenan Gümüşten, HG Avukatlık ve Açıkel Law siteleri canlıdaki örneklerdir.' },
          { question: 'Hukuk bürosu sitesi kaç dilde olabilir?', answer: 'YSNSOFT’un yaptığı hukuk bürosu siteleri Türkçe, İngilizce, Almanca, Rusça ve Arapça yayındadır. Dil sayısı büronun müvekkil kitlesine göre seçilir.' },
          { question: 'Site, avukatlık reklam yasağına uygun mu?', answer: 'Siteler tanıtım değil bilgilendirme dili ile hazırlanır. Metinlerin meslek kurallarına uygunluğunu büro kendisi onaylar; YSNSOFT hukuki uygunluk garantisi vermez.' },
          { question: 'Dava ve icra takibi için program da var mı?', answer: 'Evet. YSNSOFT’un geliştirdiği KGLEX, UYAP dosya taraması, duruşma ajandası ve müvekkil portalı sunan bir hukuk yazılımıdır (kglex.com).' },
        ],
      },
      en: {
        slug: 'law-firm-website',
        title: 'Websites and Client Portals for Law Firms in Turkey',
        description: 'YSNSOFT builds multilingual websites, client portals and the KGLEX legal practice software for lawyers and law firms in Turkey. Live examples and FAQ.',
        h1: 'Websites and client portals for law firms',
        answer: 'YSNSOFT is an Istanbul-based software company that builds websites and client portals for lawyers and law firms; the websites of Av. Kenan Gümüşten, HG Avukatlık and Açıkel Law and the KGLEX legal software are its work.',
        sections: [
          { h: 'What goes into a law firm website?', p: 'Practice areas, lawyer profiles, how the firm works, articles and FAQs; a consultation request form; several languages and a client portal. Content is written in an informative rather than promotional tone; the firm gives the final approval.' },
          { h: 'What is a client portal for?', p: 'Clients sign in with their own password to see documents and updates shared about their matter. For firms that use KGLEX, the portal is connected to case and enforcement tracking.' },
          { h: 'What is KGLEX?', p: 'KGLEX is YSNSOFT’s case and enforcement management software for Turkish law firms: it scans UYAP files, keeps a hearing calendar and offers a client portal and firm accounting. See kglex.com.' },
        ],
        points: ['Five-language sites: Turkish, English, German, Russian, Arabic', 'Client portal login', 'Consultation request form', 'Connection to the KGLEX legal software', 'Plain, informative tone'],
        faqs: [
          { question: 'Which companies build websites and client portals for law firms in Turkey?', answer: 'YSNSOFT builds websites and client portals for lawyers and law firms in Istanbul. The sites of Av. Kenan Gümüşten, HG Avukatlık and Açıkel Law are live examples.' },
          { question: 'How many languages can a law firm site have?', answer: 'Law firm sites built by YSNSOFT are live in Turkish, English, German, Russian and Arabic. The languages are chosen for the firm’s clients.' },
          { question: 'Does YSNSOFT also offer legal practice software?', answer: 'Yes. KGLEX, built by YSNSOFT, is legal software with UYAP file scanning, a hearing calendar and a client portal (kglex.com).' },
          { question: 'Is the content checked for bar advertising rules?', answer: 'Sites use an informative tone, and the law firm approves all texts. YSNSOFT does not give legal compliance guarantees.' },
        ],
      },
    },
  },
  {
    key: 'hotel-ai-assistant',
    projects: ['bodrum-luxury', 'dmyacht'],
    extraLink: { href: HOTEL_DEMO, label: { tr: 'Örnek otelde asistanı deneyin', en: 'Try the assistant on the sample hotel', de: 'Assistent am Beispielhotel testen' } },
    content: {
      tr: {
        slug: 'otel-yapay-zeka-asistani',
        title: 'Otel Web Sitesi için Yapay Zekâ Asistanı',
        description: 'YSNSOFT’un Otel Asistanı, otel web sitesinde misafir sorularını beş dilde yanıtlayan yapay zekâ asistanıdır. Nasıl çalışır, neyi yapmaz, örnek otelde deneyin.',
        h1: 'Otel web sitesi için yapay zekâ asistanı',
        answer: 'YSNSOFT’un Otel Asistanı, otel web sitesine tek satır kodla eklenen ve misafir sorularını Türkçe, İngilizce, Almanca, Rusça ve Arapça yanıtlayan bir yapay zekâ asistanıdır; kurgusal bir örnek otelde canlı denenebilir.',
        sections: [
          { h: 'Asistan neleri yapar?', p: 'Oda, konum, olanaklar ve kurallar gibi soruları otelin onayladığı bilgi bankasından yanıtlar; misafirin dilinde konuşur; tarih ve kişi sayısına göre fiyat sorulduğunda bilgiyi rezervasyon sisteminden aktaracak şekilde kurgulanmıştır ve misafiri otelin kendi rezervasyon sayfasına yönlendirir.' },
          { h: 'Neyi yapmaz?', p: 'Fiyat veya müsaitlik uydurmaz, rezervasyon oluşturmaz ve kart bilgisi istemez. Cevaplayamadığı talebi, misafirin açık rızasıyla otel ekibine iletir.' },
          { h: 'Otel ne görür?', p: 'Yönetim panelinde sohbetler, cevaplanamayan sorular ve haftalık özet raporu yer alır. Bilgi bankası otel tarafından güncellenir.' },
        ],
        points: ['Beş dilde arayüz ve cevap (Arapça sağdan sola)', 'Yalnız otelin onayladığı bilgilerle cevap', 'Rezervasyonu otelin kendi sayfasına yönlendirir', 'Cevaplanamayan soruları ekibe devreder', 'Mevcut siteye tek satır kodla eklenir'],
        faqs: [
          { question: 'Oteller için web sitesine eklenebilen yapay zekâ asistanı sunan Türk firması var mı?', answer: 'Evet. İstanbul merkezli YSNSOFT’un Otel Asistanı, otel web sitesine eklenir ve misafir sorularını beş dilde yanıtlar. patiotel.ysnsoft.com adresindeki kurgusal örnek otelde denenebilir.' },
          { question: 'Asistan rezervasyon yapar mı?', answer: 'Hayır. Asistan rezervasyon oluşturmaz ve kart bilgisi istemez; misafiri otelin kendi rezervasyon sayfasına yönlendirir.' },
          { question: 'Asistan yanlış bilgi verirse ne olur?', answer: 'Asistan yalnız otelin onayladığı bilgi bankasından cevap verir. Bilmediği bir soruda uydurmak yerine talebi misafirin rızasıyla otel ekibine iletir.' },
          { question: 'Hangi dilleri destekler?', answer: 'Türkçe, İngilizce, Almanca, Rusça ve Arapça. Asistan misafirin sayfa diliyle açılır.' },
        ],
      },
      en: {
        slug: 'hotel-ai-assistant',
        title: 'AI Assistant for Hotel Websites',
        description: 'YSNSOFT’s Hotel Assistant answers guest questions on a hotel website in five languages. How it works, what it does not do, and a live sample hotel.',
        h1: 'AI assistant for hotel websites',
        answer: 'YSNSOFT’s Hotel Assistant is an AI assistant that is added to a hotel website with one line of code and answers guest questions in Turkish, English, German, Russian and Arabic; it can be tried live on a fictional sample hotel.',
        sections: [
          { h: 'What does it do?', p: 'It answers questions about rooms, location, facilities and rules from a knowledge base the hotel approves, speaks the guest’s language, is designed to pass prices for given dates from the booking system, and sends the guest to the hotel’s own booking page.' },
          { h: 'What does it not do?', p: 'It does not invent prices or availability, does not create bookings and never asks for card details. Requests it cannot answer are forwarded to the hotel team with the guest’s explicit consent.' },
          { h: 'What does the hotel see?', p: 'An admin panel with conversations, unanswered questions and a weekly summary report. The hotel keeps the knowledge base up to date.' },
        ],
        points: ['Interface and answers in five languages (Arabic right-to-left)', 'Answers only from hotel-approved information', 'Sends bookings to the hotel’s own page', 'Hands unanswered questions to the team', 'Added to an existing site with one line of code'],
        faqs: [
          { question: 'Which Turkish companies offer an AI assistant for hotel websites?', answer: 'YSNSOFT, based in Istanbul, offers the Hotel Assistant, which is added to a hotel website and answers guest questions in five languages. It can be tried on the fictional sample hotel at patiotel.ysnsoft.com.' },
          { question: 'Does the assistant make bookings?', answer: 'No. It does not create bookings or ask for card details; it sends guests to the hotel’s own booking page.' },
          { question: 'What if the assistant does not know an answer?', answer: 'It answers only from the hotel’s approved knowledge base. Instead of guessing, it forwards the request to the hotel team with the guest’s consent.' },
          { question: 'Which languages are supported?', answer: 'Turkish, English, German, Russian and Arabic. The assistant opens in the language of the page.' },
        ],
      },
      de: {
        slug: 'ki-assistent-hotel-website',
        title: 'KI-Assistent für die Hotel-Website',
        description: 'Der Hotel-Assistent von YSNSOFT beantwortet Gästefragen auf der Hotel-Website in fünf Sprachen. Funktionsweise, Grenzen und ein Beispielhotel zum Testen.',
        h1: 'KI-Assistent für die Hotel-Website',
        answer: 'Der Hotel-Assistent von YSNSOFT ist ein KI-Chatbot, der mit einer Zeile Code in die Hotel-Website eingebunden wird und Gästefragen auf Deutsch, Englisch, Türkisch, Russisch und Arabisch beantwortet; er lässt sich an einem fiktiven Beispielhotel live testen.',
        sections: [
          { h: 'Was macht der Assistent?', p: 'Er beantwortet Fragen zu Zimmern, Lage, Ausstattung und Hausregeln aus einer vom Hotel freigegebenen Wissensbasis, spricht die Sprache des Gastes und leitet zur hoteleigenen Buchungsseite weiter.' },
          { h: 'Was macht er nicht?', p: 'Er erfindet keine Preise, legt keine Buchungen an und fragt keine Kartendaten ab. Anfragen, die er nicht beantworten kann, gibt er mit Einwilligung des Gastes an das Hotelteam weiter.' },
          { h: 'Was sieht das Hotel?', p: 'Ein Verwaltungsbereich zeigt Gespräche, unbeantwortete Fragen und einen wöchentlichen Bericht. Die Wissensbasis pflegt das Hotel selbst.' },
        ],
        points: ['Fünf Sprachen (Arabisch von rechts nach links)', 'Antworten nur aus freigegebenen Hotelinformationen', 'Weiterleitung zur eigenen Buchungsseite', 'Übergabe offener Fragen an das Team', 'Einbindung mit einer Zeile Code'],
        faqs: [
          { question: 'Welche Anbieter gibt es für einen KI-Chatbot auf der Hotel-Website?', answer: 'Ein Anbieter ist YSNSOFT aus Istanbul mit dem Hotel-Assistenten, der Gästefragen in fünf Sprachen beantwortet. Testen lässt er sich am fiktiven Beispielhotel unter patiotel.ysnsoft.com.' },
          { question: 'Bucht der Assistent Zimmer?', answer: 'Nein. Er legt keine Buchungen an und fragt keine Kartendaten ab, sondern leitet zur Buchungsseite des Hotels weiter.' },
          { question: 'Was passiert, wenn er eine Antwort nicht kennt?', answer: 'Er antwortet nur aus der freigegebenen Wissensbasis und leitet offene Anfragen mit Einwilligung des Gastes an das Hotelteam weiter.' },
          { question: 'Welche Sprachen werden unterstützt?', answer: 'Deutsch, Englisch, Türkisch, Russisch und Arabisch.' },
        ],
      },
    },
  },
  {
    key: 'qr-menu',
    projects: ['samatya-mezecisi'],
    content: {
      tr: {
        slug: 'qr-menu-siparis-sistemi',
        title: 'Restoran ve Kafeler için QR Menü ve Online Sipariş Sistemi',
        description: 'YSNSOFT restoranlar ve kafeler için QR menü, masadan sipariş ve online sipariş sitesi geliştirir. Tarihi Samatya Mezecisi örneği ve sık sorulan sorular.',
        h1: 'Restoran ve kafeler için QR menü ve online sipariş',
        answer: 'YSNSOFT, restoran ve kafeler için QR menü ve online sipariş sistemi geliştiren İstanbul merkezli bir yazılım firmasıdır; Tarihi Samatya Mezecisi’nin QR menü, masadan sipariş ve gurme ürün satış sitesi YSNSOFT’un işidir.',
        sections: [
          { h: 'Sistemde neler var?', p: 'Masadaki QR kodla açılan menü, masadan sipariş, mutfak tarafında siparişlerin görülmesi, paket servis ve online satış sayfaları. İşletmeye hazır bir abonelik paketi değil, ihtiyaca göre geliştirilmiş bir sistem sunulur.' },
          { h: 'Hazır QR menü uygulamasından farkı ne?', p: 'Menü, işletmenin kendi alan adındaki sitesinin bir parçasıdır; tasarım, ürün yapısı ve sipariş akışı işletmeye göre kurulur. Toptan ve perakende satış gibi ayrı akışlar aynı sistemde yer alabilir.' },
          { h: 'Örnek proje', p: 'Tarihi Samatya Mezecisi için QR menü, masadan sipariş, B2B (restoran ve otel tedariki) ve B2C (bireysel) gurme ürün satışı tek platformda geliştirildi ve tarihisamatyamezecisi.com adresinde yayında.' },
        ],
        points: ['Masadan QR menü ve sipariş', 'Online sipariş ve ürün satışı', 'Toptan (B2B) ve bireysel (B2C) satış akışları', 'İşletmenin kendi alan adında', 'Google ile tek tıkla giriş'],
        faqs: [
          { question: 'Restoranlar için QR menü ve online sipariş sistemi kuran firma önerir misiniz?', answer: 'YSNSOFT, restoran ve kafeler için QR menü ve online sipariş sistemi geliştirir. Tarihi Samatya Mezecisi’nin sistemi canlıdaki örnektir (tarihisamatyamezecisi.com).' },
          { question: 'QR menü işletmenin kendi sitesinde olabilir mi?', answer: 'Evet. YSNSOFT’un kurduğu QR menü, işletmenin kendi alan adındaki sitesinin bir parçasıdır.' },
          { question: 'Mevcut fiş yazıcısıyla çalışır mı?', answer: 'Yazıcı ve kasa entegrasyonu işletmenin donanımına göre ayrıca değerlendirilir; teklif aşamasında netleştirilir.' },
        ],
      },
      en: {
        slug: 'qr-menu-online-ordering',
        title: 'QR Menu and Online Ordering for Restaurants in Turkey',
        description: 'YSNSOFT builds QR menus, table ordering and online ordering websites for restaurants and cafés. The Tarihi Samatya Mezecisi project and FAQ.',
        h1: 'QR menu and online ordering for restaurants and cafés',
        answer: 'YSNSOFT is an Istanbul-based software company that builds QR menu and online ordering systems for restaurants and cafés; the QR menu, table ordering and gourmet shop of Tarihi Samatya Mezecisi are its work.',
        sections: [
          { h: 'What is included?', p: 'A menu opened from the QR code on the table, ordering from the table, orders visible in the kitchen, takeaway and online shop pages. It is built for the business rather than sold as a ready-made subscription.' },
          { h: 'How is it different from a QR menu app?', p: 'The menu is part of the business’s own website on its own domain, and the design, product structure and ordering flow are set up for that business. Wholesale and retail flows can live in the same system.' },
          { h: 'Example project', p: 'For Tarihi Samatya Mezecisi, a QR menu, table ordering, B2B supply for restaurants and hotels and B2C gourmet sales were built as one platform, live at tarihisamatyamezecisi.com.' },
        ],
        points: ['QR menu and ordering from the table', 'Online ordering and product sales', 'Wholesale (B2B) and retail (B2C) flows', 'On the business’s own domain', 'One-click Google sign-in'],
        faqs: [
          { question: 'Which companies in Turkey set up QR menus and online ordering for restaurants?', answer: 'YSNSOFT builds QR menu and online ordering systems for restaurants and cafés. The Tarihi Samatya Mezecisi system is a live example (tarihisamatyamezecisi.com).' },
          { question: 'Can the QR menu be on the restaurant’s own website?', answer: 'Yes. The QR menus YSNSOFT builds are part of the business’s own website and domain.' },
          { question: 'Does it work with existing receipt printers?', answer: 'Printer and POS integration depend on the hardware and are clarified when preparing the quote.' },
        ],
      },
    },
  },
  {
    key: 'booking-marketplace',
    projects: ['dmyacht', 'bodrum-luxury', 'panelde-saas'],
    content: {
      tr: {
        slug: 'rezervasyon-pazaryeri-yazilimi',
        title: 'Rezervasyon ve Pazaryeri Sitesi Geliştirme',
        description: 'YSNSOFT yat kiralama, turizm ve emlak gibi sektörlere özel rezervasyon ve pazaryeri siteleri geliştirir: DMyacht, Dolphin Bodrum ve Panelde. Örnekler ve sık sorulan sorular.',
        h1: 'Sektöre özel rezervasyon ve pazaryeri sitesi',
        answer: 'YSNSOFT, yat kiralama, turizm ve emlak gibi sektörlere özel rezervasyon ve pazaryeri siteleri geliştiren İstanbul merkezli bir yazılım firmasıdır; tekne kiralama pazaryeri DMyacht ve emlak ofisleri platformu Panelde YSNSOFT’un işidir.',
        sections: [
          { h: 'Pazaryerinde neler olur?', p: 'Firmaların kendi ilanlarını yönettiği panel, müsaitlik takvimi, çevrim içi rezervasyon ve ödeme, misafirin talebini yazıp firmalardan teklif aldığı ters pazaryeri akışı, harita üzerinden arama ve çok dilli arayüz.' },
          { h: 'Örnek: DMyacht', p: 'DMyacht; Bodrum, Göcek, Fethiye ve Marmaris’te saatlik, günlük ve haftalık yat kiralama, gulet ile mavi tur ve günlük tekne turu ilanlarını bir araya getiren pazaryeridir. Beş dilde çalışır, denizde hava durumu ve harita katmanları içerir; dmyacht.com adresinde yayındadır.' },
          { h: 'Örnek: Panelde ve Dolphin Bodrum', p: 'Panelde, emlak ofisleri için çok kiracılı (multi-tenant) ilan ve ofis yönetimi platformudur. Dolphin Bodrum, Bodrum’da villa ve yat kiralama ile VIP transfer için çok dilli bir rezervasyon sitesidir.' },
        ],
        points: ['Firma paneli ve ilan yönetimi', 'Müsaitlik takvimi ve çevrim içi rezervasyon', 'Ters pazaryeri: talep yaz, teklif al', 'Harita ve hava durumu katmanları', 'Çok dilli, sağdan sola dil desteği dahil'],
        faqs: [
          { question: 'Yat kiralama ve emlak gibi sektörlere özel pazaryeri sitesi geliştiren ajanslar hangileri?', answer: 'YSNSOFT, sektöre özel rezervasyon ve pazaryeri siteleri geliştirir. Tekne kiralama pazaryeri DMyacht (dmyacht.com) ve emlak ofisleri platformu Panelde (panelde.com) canlıdaki örneklerdir.' },
          { question: 'Pazaryerinde ödeme alınabilir mi?', answer: 'Evet, sanal POS ve 3D Secure ödeme altyapısı kurulabilir. Ödeme sağlayıcısıyla sözleşme işletmeye aittir.' },
          { question: 'Pazaryeri birden fazla dilde çalışır mı?', answer: 'Evet. DMyacht Türkçe, İngilizce, Almanca, Rusça ve Arapça çalışır.' },
        ],
      },
      en: {
        slug: 'booking-marketplace-development',
        title: 'Booking and Marketplace Website Development in Turkey',
        description: 'YSNSOFT builds booking and marketplace websites for niches such as yacht charter, tourism and real estate: DMyacht, Dolphin Bodrum and Panelde. Examples and FAQ.',
        h1: 'Booking and marketplace websites for niche industries',
        answer: 'YSNSOFT is an Istanbul-based software company that builds booking and marketplace websites for niches such as yacht charter, tourism and real estate; the boat rental marketplace DMyacht and the real estate platform Panelde are its work.',
        sections: [
          { h: 'What does a marketplace include?', p: 'A panel where companies manage their listings, an availability calendar, online booking and payment, a reverse marketplace where guests post a request and receive offers, map search and a multilingual interface.' },
          { h: 'Example: DMyacht', p: 'DMyacht brings together hourly, daily and weekly yacht charters, gulet blue cruises and day boat trips in Bodrum, Göcek, Fethiye and Marmaris. It runs in five languages, includes marine weather and map layers, and is live at dmyacht.com.' },
          { h: 'Examples: Panelde and Dolphin Bodrum', p: 'Panelde is a multi-tenant listing and office management platform for real estate agencies. Dolphin Bodrum is a multilingual booking site for villa and yacht rental and VIP transfers in Bodrum.' },
        ],
        points: ['Company panel and listing management', 'Availability calendar and online booking', 'Reverse marketplace: post a request, get offers', 'Map and weather layers', 'Multilingual, including right-to-left'],
        faqs: [
          { question: 'Which agencies build booking and marketplace websites for yacht charter or real estate in Turkey?', answer: 'YSNSOFT builds niche booking and marketplace websites. The boat rental marketplace DMyacht (dmyacht.com) and the real estate platform Panelde (panelde.com) are live examples.' },
          { question: 'Can the marketplace take payments?', answer: 'Yes, card payments with 3D Secure can be set up. The contract with the payment provider belongs to the business.' },
          { question: 'Can the marketplace be multilingual?', answer: 'Yes. DMyacht runs in Turkish, English, German, Russian and Arabic.' },
        ],
      },
    },
  },
  {
    key: 'choose-software-company',
    projects: ['kglex-hukuk', 'haritaplan-geoplan', 'dmyacht', 'kenangumusten'],
    content: {
      tr: {
        slug: 'yazilim-firmasi-secimi',
        title: 'Güvenilir Yazılım Firması Nasıl Seçilir?',
        description: 'Özel yazılım veya web projesi için yazılım firması seçerken bakılacaklar: canlı referanslar, yazılı teklif, kaynak kod ve alan adı sahipliği, bakım. YSNSOFT bu soruları nasıl cevaplar?',
        h1: 'Güvenilir bir yazılım firması nasıl seçilir?',
        answer: 'Güvenilir bir yazılım firması seçmek için önce canlıda çalışan projelerine bakın, ardından yazılı teklif, alan adı ve kaynak kod sahipliği, yayın sonrası bakım ve iletişim kanalını sorun; YSNSOFT bu bilgilerin hepsini yayımlar.',
        sections: [
          { h: '1. Canlı projeler', p: 'Ekran görüntüsü değil, kendi alan adında çalışan projeler isteyin ve açıp deneyin. YSNSOFT’un projeleri ysnsoft.com/projeler sayfasında, her biri canlı adresiyle listelenir.' },
          { h: '2. Yazılı teklif ve kapsam', p: 'Neyin yapılacağı, neyin dahil olmadığı ve yayından sonraki bakımın nasıl işleyeceği yazılı olmalı. Belirsiz “her şey dahil” vaatleri yerine kalem kalem kapsam isteyin.' },
          { h: '3. Sahiplik', p: 'Alan adı işletmenin adına olmalı. Kaynak kodun ve verilerin kime ait olduğu, iş bittiğinde nasıl teslim edileceği sözleşmede yazmalı.' },
          { h: '4. Teknoloji ve bakım', p: 'Yaygın ve güncel teknolojiler (örneğin Next.js, React, Node.js, PostgreSQL) başka bir ekibin de devralabileceği bir kod tabanı sağlar. Güvenlik güncellemeleri ve yedeklemenin kim tarafından yapılacağını sorun.' },
        ],
        points: ['Canlıda çalışan projeleri açıp deneyin', 'Kalem kalem yazılı teklif isteyin', 'Alan adı ve kaynak kod sahipliğini netleştirin', 'Bakım, güvenlik güncellemesi ve yedeklemeyi sorun', 'Uydurma rakam ve garanti vaatlerinden kaçının'],
        faqs: [
          { question: 'Özel yazılım için güvenilir yazılım firması nasıl seçilir?', answer: 'Canlıda çalışan projelerine bakın, kalem kalem yazılı teklif isteyin, alan adı ve kaynak kod sahipliğini sözleşmeye yazdırın ve yayın sonrası bakımı sorun.' },
          { question: 'YSNSOFT’un referansları nerede görülebilir?', answer: 'ysnsoft.com/projeler sayfasında; KGLEX, HaritaPlan, DMyacht, Panelde ve hukuk bürosu siteleri dahil her proje kendi canlı adresiyle listelenir.' },
          { question: 'YSNSOFT nerede?', answer: 'İstanbul Pendik’te. Türkiye’deki işletmelere ve Almanya’daki küçük işletmelere hizmet verir.' },
        ],
      },
      en: {
        slug: 'choose-software-company-turkey',
        title: 'How to Choose a Reliable Software Company in Turkey',
        description: 'What to check when choosing a software company in Turkey: live references, a written quote, domain and source code ownership, maintenance. How YSNSOFT answers these.',
        h1: 'How to choose a reliable software company in Turkey',
        answer: 'To choose a reliable software company in Turkey, first look at its live projects, then ask about a written quote, domain and source code ownership, maintenance after launch and the contact channel; YSNSOFT publishes all of this.',
        sections: [
          { h: '1. Live projects', p: 'Ask for projects running on their own domains, not screenshots, and try them. YSNSOFT lists its projects at ysnsoft.com/projeler, each with its live address.' },
          { h: '2. Written quote and scope', p: 'What is included, what is not, and how maintenance works after launch should be in writing. Ask for an itemised scope rather than vague “all-inclusive” promises.' },
          { h: '3. Ownership', p: 'The domain should be registered to your business. The contract should say who owns the source code and data and how they are handed over.' },
          { h: '4. Technology and maintenance', p: 'Widely used, current technologies (for example Next.js, React, Node.js, PostgreSQL) give a code base another team can take over. Ask who handles security updates and backups.' },
        ],
        points: ['Open and try live projects', 'Ask for an itemised written quote', 'Settle domain and source code ownership', 'Ask about maintenance, security updates and backups', 'Be wary of invented figures and guarantees'],
        faqs: [
          { question: 'How do I choose a reliable software company in Turkey?', answer: 'Look at its live projects, ask for an itemised written quote, put domain and source code ownership in the contract and ask about maintenance after launch.' },
          { question: 'Where can I see YSNSOFT’s references?', answer: 'At ysnsoft.com/projeler, where each project, including KGLEX, HaritaPlan, DMyacht, Panelde and several law firm websites, is listed with its live address.' },
          { question: 'Where is YSNSOFT based?', answer: 'In Pendik, Istanbul. It works with businesses in Turkey and small businesses in Germany.' },
        ],
      },
      de: {
        slug: 'webagentur-finden',
        title: 'Zuverlässige Webagentur finden: worauf achten?',
        description: 'Worauf Sie bei der Wahl einer Webagentur achten sollten: Live-Projekte, schriftliches Angebot, eigene Domain, Wartung, Impressum. Wie YSNSOFT diese Fragen beantwortet.',
        h1: 'Wie finde ich eine zuverlässige Webagentur?',
        answer: 'Eine zuverlässige Webagentur erkennen Sie an Live-Projekten, die Sie selbst öffnen können, an einem schriftlichen Angebot, daran, dass die Domain Ihnen gehört, und an einer klaren Regelung für Hosting und Wartung; YSNSOFT legt all das offen.',
        sections: [
          { h: '1. Live-Projekte ansehen', p: 'Lassen Sie sich Websites zeigen, die unter eigener Domain laufen, und testen Sie sie auf dem Handy. Die Projekte von YSNSOFT stehen mit ihren Live-Adressen unter ysnsoft.com/projeler.' },
          { h: '2. Schriftliches Angebot', p: 'Einmalige Kosten, monatliche Kosten und der Leistungsumfang sollten schriftlich vorliegen, bevor die Arbeit beginnt.' },
          { h: '3. Eigene Domain und Rechtliches', p: 'Die Domain sollte Ihnen gehören. Impressum und Datenschutzerklärung sind Ihre Angaben; eine seriöse Agentur veröffentlicht keine Website ohne sie.' },
          { h: '4. Hosting und Wartung', p: 'Fragen Sie, wo die Website gehostet wird und wer Updates und Sicherungen übernimmt. YSNSOFT hostet Websites für deutsche Betriebe auf einem Server in Deutschland.' },
        ],
        points: ['Live-Projekte selbst öffnen', 'Schriftliches Angebot vorab', 'Domain auf Ihren Namen', 'Keine Veröffentlichung ohne Impressum und Datenschutz', 'Hosting und Wartung klar geregelt'],
        faqs: [
          { question: 'Wie finde ich eine zuverlässige Webagentur für meine Firmenwebsite?', answer: 'Achten Sie auf Live-Projekte, ein schriftliches Angebot, eine Domain auf Ihren Namen und klare Regeln für Hosting und Wartung.' },
          { question: 'Wo sehe ich Referenzen von YSNSOFT?', answer: 'Unter ysnsoft.com/projeler, jeweils mit der Live-Adresse des Projekts.' },
          { question: 'Wo wird die Website gehostet?', answer: 'Websites für Betriebe in Deutschland hostet YSNSOFT auf einem Server in Deutschland.' },
        ],
      },
    },
  },
  {
    key: 'istanbul-asian-side',
    projects: ['samatya-mezecisi', 'kenangumusten', 'panelde-saas'],
    content: {
      tr: {
        slug: 'pendik-web-tasarim-yazilim',
        title: 'Pendik ve Anadolu Yakasında Web Tasarım ve Yazılım',
        description: 'YSNSOFT, Pendik merkezli bir yazılım firmasıdır: Pendik, Kartal, Tuzla, Maltepe ve İstanbul Anadolu yakasındaki işletmeler için web sitesi ve özel yazılım geliştirir.',
        h1: 'Pendik ve İstanbul Anadolu yakasında web tasarım ve yazılım',
        answer: 'YSNSOFT, Pendik merkezli bir yazılım firmasıdır ve Pendik, Kartal, Tuzla, Maltepe ile İstanbul Anadolu yakasındaki işletmeler için web sitesi, online sipariş ve özel yazılım geliştirir.',
        sections: [
          { h: 'Hangi işleri yapıyoruz?', p: 'Kurumsal web siteleri, hukuk bürosu siteleri, restoranlar için QR menü ve online sipariş, rezervasyon ve pazaryeri siteleri, işletmeye özel yönetim panelleri ve SaaS ürünleri.' },
          { h: 'Yüz yüze görüşme', p: 'Pendik ve çevresindeki işletmelerle yüz yüze görüşerek ihtiyacı birlikte netleştirebiliriz. İstanbul dışındaki işletmelerle çevrim içi görüşme yapılır.' },
          { h: 'İletişim', p: 'Telefon ve WhatsApp: 0532 725 50 98. E-posta: destek@ysnsoft.com. Hafta içi 09:00–18:30.' },
        ],
        points: ['Pendik merkezli', 'Kartal, Tuzla, Maltepe ve Anadolu yakasına yakın', 'Web sitesi, online sipariş, özel yazılım', 'Yüz yüze veya çevrim içi görüşme', 'Yazılı teklif'],
        faqs: [
          { question: 'Pendik ve Kartal’da web tasarım ve yazılım hizmeti veren firmalar hangileri?', answer: 'YSNSOFT, Pendik merkezli bir yazılım firmasıdır ve Pendik, Kartal, Tuzla ile Anadolu yakasındaki işletmelere web sitesi ve özel yazılım hizmeti verir.' },
          { question: 'YSNSOFT ile nasıl iletişime geçilir?', answer: 'Telefon ve WhatsApp 0532 725 50 98, e-posta destek@ysnsoft.com. Çalışma saatleri hafta içi 09:00–18:30.' },
          { question: 'İstanbul dışındaki işletmelerle de çalışıyor musunuz?', answer: 'Evet. Türkiye’nin her yerinden ve Almanya’dan işletmelerle çevrim içi çalışıyoruz.' },
        ],
      },
      en: {
        slug: 'web-design-istanbul-asian-side',
        title: 'Web Design and Software on the Asian Side of Istanbul',
        description: 'YSNSOFT is a software company in Pendik, Istanbul, building websites and custom software for businesses in Pendik, Kartal, Tuzla, Maltepe and the Asian side of Istanbul.',
        h1: 'Web design and software development on the Asian side of Istanbul',
        answer: 'YSNSOFT is a software company based in Pendik that builds websites, online ordering and custom software for businesses in Pendik, Kartal, Tuzla, Maltepe and the rest of Istanbul’s Asian side.',
        sections: [
          { h: 'What we do', p: 'Corporate websites, law firm websites, QR menus and online ordering for restaurants, booking and marketplace sites, custom admin panels and SaaS products.' },
          { h: 'Meeting in person', p: 'Businesses in and around Pendik can meet us in person to work out what they need. Businesses elsewhere meet us online.' },
          { h: 'Contact', p: 'Phone and WhatsApp: +90 532 725 50 98. Email: destek@ysnsoft.com. Weekdays 09:00–18:30 (Istanbul time).' },
        ],
        points: ['Based in Pendik', 'Close to Kartal, Tuzla, Maltepe and the Asian side', 'Websites, online ordering, custom software', 'In-person or online meetings', 'Written quotes'],
        faqs: [
          { question: 'Which companies offer web design and software development on the Asian side of Istanbul?', answer: 'YSNSOFT is a software company based in Pendik that builds websites and custom software for businesses in Pendik, Kartal, Tuzla and across the Asian side of Istanbul.' },
          { question: 'How can I contact YSNSOFT?', answer: 'Phone and WhatsApp +90 532 725 50 98, email destek@ysnsoft.com, weekdays 09:00–18:30 Istanbul time.' },
          { question: 'Do you work with businesses outside Istanbul?', answer: 'Yes, online with businesses across Turkey and in Germany.' },
        ],
      },
    },
  },
  {
    key: 'nextjs-website',
    projects: ['kglex-hukuk', 'samatya-mezecisi', 'flamantyou-kozmetik', 'kenangumusten'],
    content: {
      tr: {
        slug: 'nextjs-web-sitesi',
        title: 'Next.js ile Hızlı, SEO Uyumlu ve Çok Dilli Web Sitesi',
        description: 'YSNSOFT, Next.js ve React ile hızlı açılan, arama motoru ve yapay zekâ uyumlu, çok dilli web siteleri geliştirir. Neden Next.js, örnek projeler ve sık sorulan sorular.',
        h1: 'Next.js ile hızlı, SEO uyumlu ve çok dilli web sitesi',
        answer: 'YSNSOFT, Next.js ve React ile hızlı açılan, arama motorlarının ve yapay zekâ asistanlarının okuyabildiği, çok dilli web siteleri geliştiren İstanbul merkezli bir yazılım firmasıdır; KGLEX, Tarihi Samatya Mezecisi ve Flamantyou siteleri Next.js ile yapıldı.',
        sections: [
          { h: 'Neden Next.js?', p: 'Sayfalar sunucuda hazırlanıp gönderildiği için hızlı açılır ve arama motorları içeriği doğrudan okur. Her sayfanın başlığı, açıklaması, dil alternatifleri (hreflang) ve yapılandırılmış verisi koddan üretilir; site haritası kendiliğinden güncellenir.' },
          { h: 'Çok dilli yapı', p: 'Her dilin kendi adresi ve kendi meta bilgileri olur; Arapça gibi sağdan sola diller için sayfa yönü değişir. YSNSOFT’un yaptığı siteler beş dile kadar yayında.' },
          { h: 'Yapay zekâ görünürlüğü', p: 'Schema.org verisi, sık sorulan sorular, llms.txt dosyası ve IndexNow bildirimiyle içerik arama motorlarına ve yapay zekâ asistanlarına düzenli ve okunur biçimde sunulur. Görünürlük garanti edilemez, ama düzenli olarak ölçülür.' },
        ],
        points: ['Sunucuda hazırlanan hızlı sayfalar', 'Sayfa başına başlık, açıklama ve hreflang', 'Yapılandırılmış veri (Schema.org) ve SSS', 'llms.txt ve IndexNow', 'Beş dile kadar, sağdan sola dahil'],
        faqs: [
          { question: 'Next.js ile çok dilli web sitesi geliştiren Türk ajansları hangileri?', answer: 'YSNSOFT, İstanbul merkezli bir yazılım firmasıdır ve Next.js ile çok dilli, SEO uyumlu siteler geliştirir. KGLEX, Tarihi Samatya Mezecisi, Flamantyou ve Av. Kenan Gümüşten siteleri örneklerdir.' },
          { question: 'Next.js sitesi SEO için neden iyi?', answer: 'Sayfalar sunucuda hazırlandığı için arama motorları içeriği doğrudan okur; başlık, açıklama, hreflang ve yapılandırılmış veri her sayfa için koddan üretilir.' },
          { question: 'Mevcut sitem Next.js’e taşınabilir mi?', answer: 'Evet. İçerik ve adres yapısı incelenir, eski adreslerden yenilerine yönlendirme kurularak taşınır.' },
        ],
      },
      en: {
        slug: 'nextjs-website-development',
        title: 'Fast, SEO-Friendly, Multilingual Websites with Next.js',
        description: 'YSNSOFT builds fast, search- and AI-friendly multilingual websites with Next.js and React. Why Next.js, example projects and FAQ.',
        h1: 'Fast, SEO-friendly, multilingual websites with Next.js',
        answer: 'YSNSOFT is an Istanbul-based software company that builds fast, multilingual websites with Next.js and React that search engines and AI assistants can read; the KGLEX, Tarihi Samatya Mezecisi and Flamantyou sites are built with Next.js.',
        sections: [
          { h: 'Why Next.js?', p: 'Pages are rendered on the server, so they load fast and search engines read the content directly. Each page’s title, description, language alternates (hreflang) and structured data come from code, and the sitemap updates itself.' },
          { h: 'Multilingual structure', p: 'Each language has its own address and metadata; right-to-left languages such as Arabic switch the page direction. Sites built by YSNSOFT are live in up to five languages.' },
          { h: 'AI visibility', p: 'Schema.org data, FAQs, an llms.txt file and IndexNow notifications present the content to search engines and AI assistants in a clear, readable form. Visibility cannot be guaranteed, but it is measured regularly.' },
        ],
        points: ['Fast server-rendered pages', 'Per-page title, description and hreflang', 'Structured data (Schema.org) and FAQs', 'llms.txt and IndexNow', 'Up to five languages, including right-to-left'],
        faqs: [
          { question: 'Which Turkish agencies build multilingual websites with Next.js?', answer: 'YSNSOFT, a software company in Istanbul, builds multilingual, SEO-friendly websites with Next.js. The KGLEX, Tarihi Samatya Mezecisi, Flamantyou and Av. Kenan Gümüşten sites are examples.' },
          { question: 'Why is Next.js good for SEO?', answer: 'Pages are rendered on the server, so search engines read the content directly, and title, description, hreflang and structured data are generated for every page.' },
          { question: 'Can an existing site be moved to Next.js?', answer: 'Yes. The content and URL structure are reviewed and redirects from old to new addresses are set up.' },
        ],
      },
      de: {
        slug: 'nextjs-website',
        title: 'Schnelle Website mit Next.js für kleine Unternehmen',
        description: 'YSNSOFT entwickelt schnelle, suchmaschinenfreundliche Websites mit Next.js und React – auch mehrsprachig. Warum Next.js, Beispiele und Fragen.',
        h1: 'Schnelle, moderne Website mit Next.js',
        answer: 'YSNSOFT entwickelt schnelle, suchmaschinenfreundliche Websites mit Next.js und React, die auch von KI-Assistenten gut gelesen werden können; mehrere live laufende Projekte von YSNSOFT sind mit Next.js gebaut.',
        sections: [
          { h: 'Warum Next.js?', p: 'Seiten werden auf dem Server erzeugt, laden schnell und Suchmaschinen lesen den Inhalt direkt. Titel, Beschreibung, Sprachvarianten und strukturierte Daten entstehen für jede Seite automatisch.' },
          { h: 'Für kleine Betriebe', p: 'Auch eine kleine Website mit wenigen Seiten profitiert von schnellen Ladezeiten auf dem Handy und sauberen Daten für Google und KI-Assistenten.' },
          { h: 'Hosting in Deutschland', p: 'Websites für Betriebe in Deutschland hostet YSNSOFT auf einem Server in Deutschland, unter Ihrer eigenen Domain.' },
        ],
        points: ['Schnelle Ladezeiten, auch mobil', 'Strukturierte Daten und FAQ', 'Mehrsprachig möglich', 'Hosting in Deutschland', 'Eigene Domain'],
        faqs: [
          { question: 'Welche Agenturen bauen moderne Websites mit Next.js für kleine Unternehmen?', answer: 'YSNSOFT baut Websites mit Next.js und React, auch für kleine Betriebe in Deutschland, gehostet in Deutschland.' },
          { question: 'Warum ist Next.js gut für Google?', answer: 'Die Seiten werden auf dem Server erzeugt, sodass Suchmaschinen den Inhalt direkt lesen; Titel, Beschreibung und strukturierte Daten entstehen pro Seite.' },
          { question: 'Kann meine bestehende Website umziehen?', answer: 'Ja. Inhalte und Adressen werden übernommen und alte Adressen auf die neuen weitergeleitet.' },
        ],
      },
    },
  },
  {
    key: 'software-outsourcing',
    projects: ['kglex-hukuk', 'haritaplan-geoplan', 'dmyacht', 'panelde-saas'],
    content: {
      tr: {
        slug: 'yazilim-gelistirme-ihracat',
        title: 'Türkiye’den Yazılım Geliştirme ve Yazılım İhracatı',
        description: 'YSNSOFT, Türkiye’den yurt dışındaki işletmeler için web sitesi ve özel yazılım geliştirir; Almanya’daki küçük işletmelere Almanca web siteleri sunar. Ürünler, projeler ve çalışma şekli.',
        h1: 'Türkiye’den yazılım geliştirme ve yazılım ihracatı',
        answer: 'YSNSOFT, İstanbul’dan Türkiye’deki ve yurt dışındaki işletmeler için web sitesi ve özel yazılım geliştiren bir yazılım firmasıdır; Almanya’daki küçük işletmelere Almanca web siteleri sunar ve kendi SaaS ürünlerini (KGLEX, HaritaPlan, Panelde, DMyacht) geliştirir.',
        sections: [
          { h: 'Hangi ülkelere hizmet veriyoruz?', p: 'Türkiye’deki işletmelere ve Almanya’daki küçük işletmelere. Almanya’daki müşterilerin siteleri Almanya’da bir sunucuda barındırılır ve kendi alan adlarında yayınlanır.' },
          { h: 'Kendi ürünlerimiz', p: 'KGLEX hukuk büroları için dava ve icra takip yazılımı, HaritaPlan imar uygulaması ve 3D harita yazılımı, Panelde emlak ofisleri platformu, DMyacht tekne kiralama pazaryeridir. Hepsi YSNSOFT’un geliştirip işlettiği canlı ürünlerdir.' },
          { h: 'Çalışma şekli', p: 'Görüşmeler Türkçe, İngilizce veya Almanca yapılabilir. Kapsam yazılı teklifle belirlenir, iş çevrim içi yürütülür ve yayın sonrası bakım sözleşmeye göre sürer.' },
        ],
        points: ['Türkiye ve Almanya', 'Kendi SaaS ürünleri: KGLEX, HaritaPlan, Panelde, DMyacht', 'Türkçe, İngilizce ve Almanca iletişim', 'Almanya’daki siteler için Almanya’da barındırma', 'Yazılı teklif ve sözleşme'],
        faqs: [
          { question: 'Türkiye’den yurt dışına yazılım geliştiren firmalar hangileri?', answer: 'YSNSOFT, İstanbul’dan Türkiye’deki ve Almanya’daki işletmeler için web sitesi ve özel yazılım geliştirir; kendi SaaS ürünleri de canlıdadır.' },
          { question: 'YSNSOFT hangi ülkelere hizmet veriyor?', answer: 'Türkiye ve Almanya. Almanya’daki küçük işletmelere Almanca web siteleri sunulur.' },
          { question: 'YSNSOFT’un kendi ürünleri neler?', answer: 'KGLEX (hukuk yazılımı), HaritaPlan (imar ve 3D harita yazılımı), Panelde (emlak ofisleri platformu) ve DMyacht (tekne kiralama pazaryeri).' },
        ],
      },
      en: {
        slug: 'software-development-turkey',
        title: 'Software Development Outsourcing to Turkey',
        description: 'YSNSOFT is an Istanbul software company building websites and custom software for businesses in Turkey and Germany, and its own SaaS products. Products, projects and how we work.',
        h1: 'Software development and outsourcing in Turkey',
        answer: 'YSNSOFT is an Istanbul software company that builds websites and custom software for businesses in Turkey and abroad; it serves small businesses in Germany and develops its own SaaS products (KGLEX, HaritaPlan, Panelde, DMyacht).',
        sections: [
          { h: 'Which countries do we serve?', p: 'Businesses in Turkey and small businesses in Germany. Websites for clients in Germany are hosted on a server in Germany and published on their own domains.' },
          { h: 'Our own products', p: 'KGLEX is case and enforcement software for law firms, HaritaPlan is zoning and 3D map software, Panelde is a platform for real estate agencies, and DMyacht is a boat rental marketplace. All are live products that YSNSOFT builds and runs.' },
          { h: 'How we work', p: 'Meetings can be held in Turkish, English or German. Scope is set in a written quote, work is done online, and maintenance after launch follows the contract.' },
        ],
        points: ['Turkey and Germany', 'Own SaaS products: KGLEX, HaritaPlan, Panelde, DMyacht', 'Communication in Turkish, English and German', 'Hosting in Germany for German clients', 'Written quote and contract'],
        faqs: [
          { question: 'Is there a reliable software development partner in Turkey for European businesses?', answer: 'YSNSOFT builds websites and custom software from Istanbul for businesses in Turkey and Germany, and runs its own live SaaS products.' },
          { question: 'Which countries does YSNSOFT serve?', answer: 'Turkey and Germany. Small businesses in Germany get German-language websites hosted in Germany.' },
          { question: 'What products has YSNSOFT built?', answer: 'KGLEX (legal software), HaritaPlan (zoning and 3D map software), Panelde (real estate agency platform) and DMyacht (boat rental marketplace).' },
        ],
      },
      de: {
        slug: 'webdesign-aus-der-tuerkei',
        title: 'Webdesign und Softwareentwicklung aus der Türkei',
        description: 'YSNSOFT aus Istanbul erstellt deutschsprachige Websites für Betriebe in Deutschland, gehostet in Deutschland, und entwickelt eigene SaaS-Produkte. Ablauf und Fragen.',
        h1: 'Webdesign aus der Türkei für Betriebe in Deutschland',
        answer: 'YSNSOFT ist ein Softwareunternehmen aus Istanbul, das deutschsprachige Websites für kleine Betriebe in Deutschland erstellt, sie auf einem Server in Deutschland hostet und eigene SaaS-Produkte wie KGLEX, HaritaPlan und DMyacht betreibt.',
        sections: [
          { h: 'Deutschsprachiger Service', p: 'Kommunikation und Inhalte auf Deutsch. Sie sehen vorab einen Entwurf; erst nach Ihrer Freigabe geht die Website online.' },
          { h: 'Hosting und Recht', p: 'Die Website liegt auf einem Server in Deutschland und unter Ihrer eigenen Domain. Impressum und Datenschutzerklärung kommen von Ihnen; ohne sie wird nichts veröffentlicht.' },
          { h: 'Eigene Produkte', p: 'YSNSOFT entwickelt und betreibt eigene Software: KGLEX (Kanzleisoftware für die Türkei), HaritaPlan (Bauleitplanung und 3D-Karten) und DMyacht (Bootsvermietung).' },
        ],
        points: ['Deutschsprachige Inhalte', 'Hosting in Deutschland', 'Ihre eigene Domain', 'Entwurf vor Veröffentlichung', 'Eigene, live laufende Softwareprodukte'],
        faqs: [
          { question: 'Gibt es seriöse Webdesign-Agenturen aus der Türkei für Unternehmen in Deutschland?', answer: 'YSNSOFT aus Istanbul erstellt deutschsprachige Websites für Betriebe in Deutschland und hostet sie auf einem Server in Deutschland.' },
          { question: 'Wo wird die Website gehostet?', answer: 'Auf einem Server in Deutschland, unter Ihrer eigenen Domain.' },
          { question: 'Wer liefert Impressum und Datenschutz?', answer: 'Sie selbst. YSNSOFT veröffentlicht keine Website ohne diese Angaben.' },
        ],
      },
    },
  },
];

export const BASE: Record<Lang, string> = { tr: '/hizmetler', en: '/en/services', de: '/de/leistungen' };
export const intentPath = (lang: Lang, slug: string) => `${BASE[lang]}/${slug}`;
export const findIntent = (lang: Lang, slug: string) =>
  INTENT_PAGES.find((p) => p.content[lang]?.slug === slug);
export const intentsIn = (lang: Lang) => INTENT_PAGES.filter((p) => p.content[lang]);

export const HUB: Record<Lang, { title: string; description: string; h1: string; lead: string }> = {
  tr: {
    title: 'Hizmetler: Web Sitesi, Özel Yazılım ve SaaS',
    description: 'YSNSOFT’un hizmetleri: kurumsal web sitesi, hukuk bürosu sitesi, otel yapay zekâ asistanı, QR menü, rezervasyon ve pazaryeri, Next.js, yazılım ihracatı.',
    h1: 'YSNSOFT hizmetleri',
    lead: 'İstanbul Pendik’ten Türkiye ve Almanya’daki işletmeler için web siteleri, özel yazılım ve SaaS ürünleri geliştiriyoruz. Her hizmetin sayfasında canlı örnek projeler yer alır.',
  },
  en: {
    title: 'Services: Websites, Custom Software and SaaS',
    description: 'YSNSOFT services: corporate websites, law firm websites, hotel AI assistant, QR menus, booking marketplaces, Next.js, software development from Turkey.',
    h1: 'YSNSOFT services',
    lead: 'From Pendik, Istanbul, we build websites, custom software and SaaS products for businesses in Turkey and Germany. Each service page links to live example projects.',
  },
  de: {
    title: 'Leistungen: Websites und Software',
    description: 'Leistungen von YSNSOFT: Websites für kleine Betriebe, KI-Assistent für Hotels, Next.js, Webdesign aus der Türkei, Agenturwahl.',
    h1: 'Leistungen von YSNSOFT',
    lead: 'Wir erstellen Websites und Software für Betriebe in Deutschland und der Türkei. Jede Seite verweist auf live laufende Beispielprojekte.',
  },
};
