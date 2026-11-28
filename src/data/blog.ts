export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  readTime: string;
  date: string;
  /** YYYY-AA-GG (yapılandırılmış veri ve sitemap için) */
  isoDate: string;
  author: { name: string; role: string; avatar: string };
  summary: string;
  tags: string[];
  content: {
    problem: string;
    solution: string;
    architectureSnippet: string;
    metrics: { label: string; value: string }[];
  };
}

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 'post-1',
    title: 'UYAP Bot Otomasyonu: Hukuk Bürolarında Dosya Taramasını Otomatikleştirmek',
    slug: 'uyap-bot-otomasyonu-kglex-mimari',
    category: 'LegalTech & Bot Architecture',
    readTime: '6 dk okuma',
    date: '28 Ekim 2026',
    isoDate: '2026-10-28',
    author: { name: 'Yasin Yıldırım', role: 'Chief Software Architect & Founder', avatar: '👨‍💼' },
    summary: 'UYAP dosyalarının her gün elle taranması yerine, büronun kendi yetkili oturumuyla çalışan arka plan robotları ve kuyruk mimarisiyle değişikliklerin nasıl özetlendiğini anlatıyoruz.',
    tags: ['Next.js 16', 'Python', 'Playwright', 'Redis', 'KGLEX'],
    content: {
      problem: 'Avukatların tensip zabıtlarını, icra haciz müzekkerelerini ve duruşma tarihlerini UYAP üzerinden tek tek elle sorgulaması her gün ciddi zaman alıyor ve gözden kaçma riskini artırıyor.',
      solution: 'KGLEX’te arka planda çalışan işçi robotlar, büronun yetkili oturumuyla belirlenen saatlerde dosyaları tarar, değişiklikleri bir önceki taramayla karşılaştırarak ayrıştırır ve sabah avukatın ekranına özet olarak sunar. Robotun bulduğu kayıtlar avukat tarafından kontrol edilmelidir.',
      architectureSnippet: `// KGLEX Queue Worker Consumer (Go / Python)
func (w *UyapWorker) ProcessCaseAudit(ctx context.Context, caseRef *LegalCase) (*AuditReport, error) {
    session, err := w.sessionPool.AcquireMTLS(caseRef.BaroNumber)
    if err != nil {
        return nil, fmt.Errorf("uyap session failed: %w", err)
    }
    defer w.sessionPool.Release(session)
    
    events := session.FetchNewSafahatEntries(caseRef.FileID, caseRef.LastSyncDate)
    return w.diffEngine.GenerateReport(events)
}`,
      metrics: []
    }
  },
  {
    id: 'post-2',
    title: '3194 Sayılı İmar Kanunu Madde 18: Web Tabanlı 3D Parselasyon ve DOP Hesaplama Algoritması',
    slug: '3194-madde-18-dop-haritaplan-webgl',
    category: 'GIS & Computational Geometry',
    readTime: '8 dk okuma',
    date: '22 Ekim 2026',
    isoDate: '2026-10-22',
    author: { name: 'Harita Müh. Danışman & YSN Ekibi', role: 'GIS Lead', avatar: '📐' },
    summary: 'Masaüstü CAD programlarına bağlı kalmadan imar adalarının tarayıcıda parsellenmesi ve DOP hesabının 3D görselleştirilmesi için kurduğumuz WebGL ve PostGIS tabanlı yaklaşım.',
    tags: ['WebGL', 'Three.js', 'PostGIS', 'Computational Geometry', 'HaritaPlan'],
    content: {
      problem: 'Geleneksel imar uygulamalarında DOP (Düzenleme Ortaklık Payı) hesabı çoğunlukla Excel ve eski CAD eklentileriyle yapılıyor; yuvarlama ve veri aktarım hataları sonradan itirazlara konu olabiliyor.',
      solution: 'HaritaPlan’da kadastro parselleri ve kamu terk alanlarından DOP oranı hesaplanır, dağıtım sonuçları anında 3D olarak görselleştirilir. Hesap sonuçları resmi işlemden önce bir harita mühendisi tarafından kontrol edilmelidir.',
      architectureSnippet: `// HaritaPlan DOP Calculation Kernel
export function calculateDOP(kadastroParseller: KadastroParcel[], kamuTerkAlan: number): DOPResult {
    const toplamKadastroAlani = kadastroParseller.reduce((acc, p) => acc + p.alan, 0);
    const dopOrani = kamuTerkAlan / toplamKadastroAlani;
    if (dopOrani > 0.45) {
        throw new Error("DOP oranı yasal %45 tavan sınırını aşıyor (3194 Md. 18)");
    }
    return { dopOrani, tahsisCetveli: kadastroParseller.map(p => ({ ...p, imarTahsis: p.alan * (1 - dopOrani) })) };
}`,
      metrics: []
    }
  },
  {
    id: 'post-3',
    title: 'Next.js 16 & React 19 ile Hızlı Sayfa Açılışı: E-Ticarette Performans',
    slug: 'nextjs-16-edge-react-19-flamantyou',
    category: 'Frontend Performance & AI',
    readTime: '5 dk okuma',
    date: '16 Ekim 2026',
    isoDate: '2026-10-16',
    author: { name: 'Yasin Yıldırım', role: 'Frontend & Cloud Architect', avatar: '👨‍💼' },
    summary: 'Flamantyou kozmetik platformunda görsel yoğun sayfaları hızlandırmak için Partial Prerendering, akışlı sunucu render’ı ve görsel optimizasyonundan nasıl yararlandık?',
    tags: ['Next.js 16', 'React 19', 'Edge Network', 'Turbopack', 'Flamantyou'],
    content: {
      problem: 'Görsel yoğunluğu yüksek e-ticaret sitelerinde yavaş açılan sayfalar ziyaretçi kaybına ve daha yüksek reklam maliyetine yol açabiliyor.',
      solution: 'Next.js 16 App Router ve React 19 akışlı SSR ile sayfa iskeletini önce gönderip ürün içeriğini arkadan akıttık. MediaPipe cilt analizi modelini ise tarayıcıda WebAssembly ile çalıştırdık.',
      architectureSnippet: `// Next.js 16 App Router Partial Prerendering Config
export const experimental_ppr = true;
export const runtime = 'edge';

export default async function ProductShowcase() {
    return (
        <Suspense fallback={<ProductCardSkeleton />}>
            <DynamicProductStreamer />
        </Suspense>
    );
}`,
      metrics: []
    }
  }
];

export const getPost = (slug: string) => BLOG_POSTS.find((p) => p.slug === slug);
