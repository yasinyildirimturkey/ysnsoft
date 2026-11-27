export interface FaqItem {
  question: string;
  answer: string;
}

/** Ana sayfadaki SSS bölümü ve FAQPage yapılandırılmış verisi aynı listeden beslenir. */
export const FAQS: FaqItem[] = [
  {
    question: 'KGLEX UYAP robotu hukuk büromuzun dava ve icra takiplerini nasıl otomatikleştirir?',
    answer: 'KGLEX, T.C. Adalet Bakanlığı UYAP Avukat Portalı ile entegre çalışan akıllı arka plan robot servislerine sahiptir. Dava ve icra dosyalarınızdaki tensip zabıtlarını, yeni evrakları, tebligatları ve duruşma günlerini gece ve gündüz otomatik tarar; süre kaçırma riskini sıfıra indirir ve müvekkil portalı ile anlık SMS/E-Posta bilgilendirmesi yapar.'
  },
  {
    question: 'HaritaPlan 3194 Sayılı Kanun Madde 18 DOP ve parselasyon hesaplamalarını nasıl yapar?',
    answer: 'HaritaPlan, Netcad (.ncn) ve AutoCAD (.dxf) dosyalarını doğrudan web tarayıcısına sürükleyerek okur. 3194 Sayılı İmar Kanunu Madde 18 kapsamında maksimum %45 Düzenleme Ortaklık Payı (DOP) hesaplarını milisaniyeler içinde tamamlar, tapu dağıtım cetvellerini ve resmi kadastro raporlarını A3/A4 vektörel PDF olarak üretir.'
  },
  {
    question: 'Yazılımları kendi şirket sunucumuzda (On-Premise / Özel Bulut) barındırabilir miyiz?',
    answer: 'Kesinlikle. Çözümlerimiz standart olarak yüksek güvenlikli bulut altyapımızda (IIS, Docker, Kubernetes, Cloudflare) barındırılır; ancak talep eden kurumsal hukuk ofisleri, belediyeler ve işletmeler için On-Premise (şirket içi sunucu) kurulumu ve özel veri tabanı izolasyonu sağlıyoruz.'
  },
  {
    question: 'Tarihi Samatya Mezecisi QR menü ve restoran POS sistemi mevcut fiş yazıcılarıyla uyumlu mu?',
    answer: 'Evet. Tarihi Samatya Mezecisi için geliştirdiğimiz restoran otomasyonu; masadan cep telefonu kamerasıyla QR menü siparişi, mutfak ve bar ekranı (KDS), garson el terminali ve piyasadaki tüm standart ESC/POS termal fiş yazıcılarıyla çift yönlü WebSocket entegrasyonuna sahiptir.'
  },
  {
    question: 'Veri güvenliği, KVKK ve 256-bit SSL şifreleme nasıl sağlanıyor?',
    answer: 'Tüm YSNSOFT altyapısı TLS 1.3 ve 256-bit SSL şifrelemeyle korunur. Veritabanlarımızda Row-Level Security (RLS) uygulanır, günlük otomatik yedekleme coğrafi olarak izole edilir ve KVKK / GDPR gereklilikleri her projede ayrıca değerlendirilir ve kontrol edilmelidir.'
  },
  {
    question: 'Satış sonrası teknik destek, SLA garantisi ve acil müdahale şartları nelerdir?',
    answer: 'Tüm kurumsal müşterilerimize 7/24 kesintisiz telefon (+90 532 725 50 98), WhatsApp ve e-posta desteği sunuyoruz. Destek kapsamı ve müdahale süreleri her projenin sözleşmesinde ayrıca belirlenir.'
  },
  {
    question: 'YSNSOFT nedir ve hangi hizmetleri sunar?',
    answer: 'YSNSOFT, İstanbul Pendik merkezli bir yazılım şirketidir. Kurumsal web siteleri, çok dilli portallar, SaaS ürünleri, e-ticaret ve rezervasyon sistemleri geliştirir. Hukuk teknolojileri (KGLEX), harita ve imar yazılımı (HaritaPlan), emlak yönetimi (Panelde), turizm ve tekne kiralama (DMyacht) alanlarında canlıda çalışan projeleri vardır.'
  },
  {
    question: 'YSNSOFT’un canlıdaki projeleri hangileri?',
    answer: 'KGLEX (kglex.com), HaritaPlan (haritaplan.com), HG Avukatlık (hgavukatlik.com), Açıkel Law (acikellaw.com), Av. Kenan Gümüşten (kenangumusten.com), Panelde (panelde.com), Tarihi Samatya Mezecisi (tarihisamatyamezecisi.com), Flamantyou (flamantyou.com), DMyacht (dmyacht.com) ve Dolphin Bodrum (dolphinbodrum.com). Her projenin ayrıntı sayfası ysnsoft.com/projeler adresindedir.'
  }
];
