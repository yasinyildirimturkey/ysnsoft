# WebScout

Yerel işletmelerin web sitelerini bulur, tarar, puanlar; satış ziyareti ve ortaklık (Steuerberater, Innung, dernek) takibini tek SQLite dosyasında tutar. Pilot: Duisburg, Essen, Düsseldorf.

Gereksinim: Node ≥ 22.15. Paket kurulumu yok.

> `--use-system-ca` KULLANMA: Node'un kendi kök sertifika listesinin yerine Windows deposunu koyar; Windows Server'da
> eksik kökler yüzünden OSM/GLM istekleri düşüyordu. Panel bayrağı yalnızca `WEBSCOUT_SYSTEM_CA=1` ise ekler.

> PowerShell'de `npm run cli -- --city X` seçenekleri yutar. Doğrudan şunu kullan:
> `node --no-warnings src/cli.js <komut> ...`

```bash
# 1) Liste çek (OpenStreetMap, açık veri)
node --no-warnings src/cli.js fetch --city all --category all
node --no-warnings src/cli.js fetch --city all --category all --target partners

# 2) Tara (site başına tek GET)
node --no-warnings src/cli.js scan --limit 100

# 3) Rapor: out/report.html + out/leads.csv
node --no-warnings src/cli.js report --min-score 40

# 4) Takip
node --no-warnings src/cli.js status 12 visited "Sahibi ilgili, Perşembe tekrar"
node --no-warnings src/cli.js partners --city Essen
node --no-warnings src/cli.js partner-set 3 meeting
```

## Bölge seçimi ve sitesi olmayan işletmeler
- `fetch` artık sitesi **olmayan** işletmeleri de alır (`website` boş): bunlar "yeni site" teklifi adayıdır.
  OSM'de site kaydı olmaması sitesi olmadığını kanıtlamaz; ziyaretten önce elle bak.
- Ülke: `--country DE|AT|CH` (varsayılan DE). Şehir yerel adıyla yazılır (`Köln`, `Wien`).
- İlçe/mahalle: `districts --city Duisburg` listeyi ve kimlikleri verir; `fetch --city Duisburg --area <id> --category friseur,gastro`.
- Park edilmiş / "yapım aşamasında" alan adları tarayıcıda `placeholder` olarak işaretlenir ve "sitesi yok" sayılır.

## Seviye 2: derin profil (`enrich`)
Seviye 1 (`scan`) site başına tek istekle puan verir. Seçilmiş adaylar için `enrich` (kod: `src/enrich.js`):
- siteyi birkaç sayfa gezer (Impressum, Kontakt, hizmetler, çerçeve içerikleri) ve yetkili, hukuki form, sicil,
  çalışma saatleri, sosyal medya, logo/renk/yazı tipi, görsel adreslerini çıkarır;
- Seviye 1 bulgularını yeniden sınar: `confirmed` / `partial` / `refuted` (yanlış alarm) / `unverified`;
- ücretsiz dış kaynakları ekler: OSM etiketleri, Internet Archive (site ne zamandan beri aynı),
  Google PageSpeed (mobil puan + ekran görüntüsü → `data/shots/`);
- işletmenin açık olup olmadığına dair bir **tahmin** üretir (`active_likely` / `closed_suspected` / `unknown`).
  Kesin bilgi değildir; panel her zaman "Google Maps'te doğrula" bağlantısı gösterir.
- Alan adında gerçek site yoksa (park / "coming soon") Seviye 1 kaydını yeniler: aday "Yeni site"ye geçer.

```bash
node --no-warnings src/cli.js enrich --id 168,62
node --no-warnings src/cli.js enrich --top 10 --city Duisburg --category gastro,handwerk
```
Panelde: bölge taramasının sonunda en iyi 10 aday otomatik (kutucukla kapatılır), "İlk 10'u derin tara" düğmesi
ve Detay penceresinde tek aday için "Derin tara". Sonuç `profiles` tablosunda (işletme başına son profil).

İsteğe bağlı ortam değişkenleri (ysnsoft `.env.local`; araç alt süreç olarak devralır):
- `PSI_API_KEY` — Google PageSpeed anahtarı (ücretsiz). Anahtarsız kota çoğu zaman doludur; o zaman ekran görüntüsü gelmez.
- `GLM_API_KEY`, `GLM_MODEL` (varsayılan `glm-5.3`, tanınmazsa `glm-4-plus`), `GLM_BASE_URL` — varsa site metninden
  Türkçe özet + hizmet listesi çıkarılır (`src/llm.js`). Yoksa bu adım atlanır.

E-posta adresi burada da toplanmaz. Impressum'daki yetkili adı kamuya açık zorunlu bilgidir; yalnızca ziyaret hazırlığı içindir.

## Seviye 3: şablon taslağı (`draft`)
`draft --id <n>` Seviye 2 profilinden kendi kendine yeten tek bir HTML sayfası üretir (kod: `src/draft.js`):
`data/drafts/<token>/index.html` + işletmenin kendi sitesinden indirilen logo ve en çok 6 fotoğraf.
- Şablonlar: `gastro` (gastro, baeckerei, hotel) ve `handwerk` (diğer tüm kategoriler şimdilik buna düşer).
- Renk sitenin kendi renklerinden (beyaz yazıyla kontrastı yeterliyse), yoksa sektör varsayılanı. Dış istek yok
  (sistem yazı tipleri, betik yok). Mobilde altta sabit "Anrufen / Route" çubuğu.
- Metin: `GLM_API_KEY` varsa eski site metninden Almanca yazılır (yalnızca metinde geçen bilgilerle);
  yoksa sektöre göre yer tutucu metin konur ve üst bantta "Platzhalter" yazar.
- Görsel kuralı: yalnızca işletmenin KENDİ sitesindeki görseller, yalnızca bu gizli taslakta. Google/arama motoru
  görselleri kullanılmaz (telif). Uygun görsel yoksa renkli yer tutucu çizilir.
- Adres: ysnsoft `/demo/<token>` (oturumsuz, tahmin edilemez belirteç, `noindex`, katı CSP, 60 gün sonra kapanır).
  Yeniden üretimde belirteç aynı kalır; basılı bağlantı geçerliliğini korur.

## Yönetim paneli
ysnsoft admin → **Müşteri Adayları** sekmesi bu aracı ayrı süreç olarak çağırır
(`src/lib/webscout.ts` → `meta`, `query`, `job`, `job-status`, `prospect-set` komutları, JSON çıktı).
Veri hep bu klasördeki `data/webscout.db` içinde kalır. `DEPLOY-PAKETLE.ps1` aracın kodunu sunucuya
gönderir; sunucudaki veritabanı yalnızca ilk kurulumda tohumlanır, sonraki deploy'larda ezilmez.
Canlıya alındıktan sonra **geçerli veri sunucudakidir** (durumlar, ziyaret notları); yerel kopya ayrı kalır.
Yedek: `node src/cli.js snapshot <hedef.db>`. Terimler: **prospect** = bizim gideceğimiz işletme,
**lead** = siteden bize gelen talep (ysnsoft `data/leads.json`); karıştırma.

## Puanlama
0–100, yüksek = daha çok sorun. Kontroller `src/scan.js` içindeki `CHECKS` listesinde; puan ağırlıklarını oradan değiştir.
Bulgular teknik göstergedir, hukuki değerlendirme değildir. Müşteriye "hukuka aykırı" deme, "kontrol edilmeli" de.

## Kurallar
- Soğuk e-posta yok (UWG §7). Kanallar: yüz yüze ziyaret, ortaklar, gelen talep.
- `do_not_contact` durumundaki kayıtlar taranmaz ve raporlanmaz.
- Tarayıcı kimliği için `WEBSCOUT_UA` ortam değişkenini kendi iletişim bilginle ayarla.
- `data/` ve `out/` kişisel/işletme verisi içerir, repoya koyma.
