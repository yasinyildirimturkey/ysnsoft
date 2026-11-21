# hotel-chat

Elektra Web (Talya Bilişim) PMS kullanan oteller için yapay zekâ destekli misafir sohbet asistanı.
Tek bir Node.js + TypeScript servisi ve herhangi bir siteye tek `<script>` etiketiyle gömülen bir widget.
n8n ya da benzeri bir otomasyon aracı kullanılmaz.

Misafir şunları yapabilir:

1. Otel hakkında soru sorar; cevap yalnızca otelin bilgi tabanından gelir.
2. Tarih ve kişi sayısı vererek canlı müsaitlik ve fiyat öğrenir (PMS'ten).
3. Rezervasyon motoruna, bilgileri önceden doldurulmuş bir link alır. Bot rezervasyon oluşturmaz, ödeme bilgisi almaz.
4. Bir yetkiliye devredilir: ad, iletişim ve talep özeti resepsiyona e-postayla gider.

## Hızlı başlangıç

Gereken: Node.js 22.13 veya üstü.

```bash
npm install
npm run demo        # API anahtarı gerektirmez; http://localhost:8787/demo?hotel=demo-otel
```

`npm run demo` gerçek bir dil modeli yerine kural tabanlı sahte bir model (`LLM_MODE=demo`) ve sahte PMS kullanır.
Yalnızca widget'ı ve araç akışını görmek içindir. Denemek için: `2027-03-10 2027-03-13 2 yetişkin` ya da `insan` yazın.

Gerçek modelle çalıştırmak için:

```bash
cp .env.example .env     # ANTHROPIC_API_KEY değerini doldurun
npm run dev              # izleme modunda geliştirme
npm run build && npm start   # üretim
```

Diğer komutlar: `npm test` (Vitest), `npm run typecheck`.

## Örnek otel ve sanal PMS

Gerçek otel ve gerçek API bağlanmadan müşteri testine yakın bir deneme için `hotels/pati-koy` kurgusal bir oteldir:
5 odalı, deniz manzaralı, evcil hayvan dostu bir butik otel. Denemek için: `http://localhost:8787/demo?hotel=pati-koy`.

| Dosya | İçerik | Gerçek otelde yerine ne gelir |
|---|---|---|
| `bilgi-tabani.md` | Odalar, evcil hayvan politikası, kahvaltı, ulaşım, iptal vb. Fiyat içermez | Otelin onayladığı bilgiler |
| `mock-pms.json` | Oda tipleri ve adetleri, sezonluk gecelik fiyatlar, hafta sonu farkı, çocuk fiyatı, fiyat planları, asgari konaklama, dolu tarihler | Elektra API (`"pms": {"type": "elektra", ...}`) |
| `hotel.json` | Otel ayarları; `"pms": {"type": "mock", "dataFile": "mock-pms.json"}` | Aynı dosya, gerçek değerlerle |

Sanal PMS (`src/pms/sample.ts`) fiyatı gece gece hesaplar (sezon, cuma-cumartesi farkı, ek yetişkin, ücretli çocuk),
kapasiteye uymayan odaları eler, `bookings` listesine göre kalan oda sayısını bulur ve asgari konaklamayı uygular.
`outageDates` içindeki bir tarihe giriş sorgulanırsa arıza taklit eder (örnekte 2027-03-03).

Asistanın söylediği her fiyat bu dosyadan hesaplanan değerdir; bilgi tabanında fiyat yoktur ve bir test bunu denetler.
`dataFile` verilmezse `demo-otel`deki gibi yerleşik basit örnek veri kullanılır.

## Siteye gömme

```html
<script src="https://SOHBET-SUNUCUNUZ/widget.js" data-hotel="otel-id" async></script>
```

İsteğe bağlı öznitelikler: `data-lang="en"` (varsayılan: sayfanın dili), `data-color="#1f4e79"` (ayarlar yüklenmeden önceki düğme rengi),
`data-api="https://..."` (API, script'in geldiği sunucudan farklıysa).

Sitenin kökeni (`https://www.otel.com`) otelin `hotel.json` dosyasındaki `widget.allowedOrigins` listesinde olmalıdır.

## Ortam değişkenleri

Tam liste ve açıklamalar `.env.example` dosyasındadır. Gizli anahtarlar yalnızca ortam değişkenlerinde durur; `.env` repoya girmez.

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `PORT` | `8787` | Dinlenen port |
| `TRUST_PROXY` | `false` | Ters vekil arkasında `true` yapın; yoksa IP hız sınırı vekilin adresini görür |
| `DATA_DIR` | `./data` | SQLite dosyasının klasörü |
| `HOTELS_DIR` | `./hotels` | Otel klasörlerinin kökü |
| `LLM_MODE` | `anthropic` | `demo` = anahtarsız sahte model (yalnızca geliştirme) |
| `ANTHROPIC_API_KEY` | — | Claude API anahtarı |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | Model adı. Maliyeti düşürmek için ör. `claude-sonnet-5-5` ya da `claude-haiku-5-5` |
| `ANTHROPIC_EFFORT` | (modelin varsayılanı) | `low` / `medium` / `high`. Sohbet için `low` önerilir |
| `ANTHROPIC_MAX_TOKENS` | `4000` | Cevap başına azami çıktı |
| `ANTHROPIC_REFUSAL_FALLBACK` | (kapalı) | `default` = model güvenlik nedeniyle reddederse API yedek modele düşer |
| `MAX_MESSAGE_CHARS` | `1000` | Mesaj uzunluğu sınırı |
| `RATE_IP_PER_MINUTE` / `RATE_IP_PER_DAY` | `20` / `300` | IP başına istek sınırı |
| `RATE_SESSION_PER_MINUTE` | `8` | Oturum başına mesaj sınırı |
| `MAX_TURNS_PER_SESSION` | `40` | Bir sohbetteki azami misafir mesajı |
| `MAX_TOOL_CALLS_PER_SESSION` | `20` | Konuşma başına azami araç çağrısı |
| `MAX_TOOL_ROUNDS_PER_TURN` | `4` | Tek mesajda azami araç turu |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | — | Devir e-postaları. `SMTP_HOST` boşsa e-posta gönderilmez, loga yazılır |
| `<ÖNEK>_API_KEY` ya da `<ÖNEK>_USERCODE` + `<ÖNEK>_PASSWORD` | — | Otelin Elektra kimlik bilgisi; önek `hotel.json` → `pms.secretsEnvPrefix` |

## Yeni otel ekleme

Kod değişikliği gerekmez.

1. `hotels/demo-otel` klasörünü kopyalayın; klasör adı otelin kimliği olur (küçük harf, rakam, tire), ör. `hotels/mavi-koy`.
2. `hotel.json` içinde `id` değerini klasör adıyla aynı yapın ve şunları doldurun:
   - `name`, `city`, `website`, `languages`, `defaultLanguage`, `currency`, `timezone`
   - `handoff.email`: devir taleplerinin gideceği resepsiyon adresi
   - `privacy`: aydınlatma metni linki, kısa metin, rıza cümlesi ve `retentionDays` (kayıtların saklanacağı gün)
   - `widget.allowedOrigins`: widget'ın gömüleceği site kökenleri. `"*"` yalnızca geliştirme içindir.
   - `bookingLink.template`: otelin rezervasyon motoru adresi (aşağıya bakın)
3. `bilgi-tabani.md` dosyasını otelin onayladığı bilgilerle yazın. Asistan yalnızca burada yazanı bilir.
4. PMS'i bağlayın:
   ```json
   "pms": { "type": "elektra", "hotelId": 12345, "secretsEnvPrefix": "ELEKTRA_MAVIKOY" }
   ```
   ve ortama `ELEKTRA_MAVIKOY_API_KEY` (ya da `_USERCODE` + `_PASSWORD`) ekleyin. Kimlik bilgisi gelene kadar `"pms": { "type": "mock" }` ile çalışır.
5. Servisi yeniden başlatın. Ayar hatalıysa servis açılışta hangi alanın yanlış olduğunu söyleyip durur.
6. Otelin sitesine gömme kodunu `data-hotel="mavi-koy"` ile ekleyin.

### Rezervasyon linki şablonu

Yer tutucular: `{checkin}` `{checkout}` `{adults}` `{children}` `{childAges}` `{roomTypeId}` `{language}` `{currency}`.
Tarih biçimi `bookingLink.dateFormat` ile seçilir. Değeri boş kalan parametreler linkten çıkarılır.

```json
"bookingLink": { "template": "https://MOTOR-ADRESI/?PARAM1={checkin}&PARAM2={checkout}&PARAM3={adults}", "dateFormat": "YYYY-MM-DD" }
```

## Elektra entegrasyonu: neyin doğrulandığı

Kaynak: Talya'nın yayınladığı Postman dokümanları —
[Hotels](https://hotel.docs.bookingapi.elektraweb.com/), [Guests](https://guest.docs.bookingapi.elektraweb.com/).
`ElektraClient` (`src/pms/elektra.ts`) yalnızca bu dokümanda yazanı kullanır.

Dokümandan doğrulananlar:

- Taban adres `https://bookingapi.elektraweb.com`.
- `POST /login`: gövdede `hotel-id`, `usercode`, `password` ya da başlıkta `Authorization: Bearer APIKEY_TOKEN`.
- `GET /hotel/{hotelId}/price/` ve parametreleri (`fromdate`, `todate`, `adult`, `childage`, `currency`, `nationality`, `onlybestoffer`, `language`); yanıt alanları. Testlerdeki örnek satır dokümandan birebir alınmıştır.

**Gerçek kimlik bilgisiyle henüz denenmedi.** Canlıya almadan önce teyit edilmesi gerekenler:

| Konu | Durum | Ne yapılmalı |
|---|---|---|
| `/login` yanıtının biçimi | Dokümanda örnek yanıt yok | İstemci yanıttaki JWT biçimli tek değeri kullanır. Bulamazsa hata mesajı yanıttaki alan adlarını listeler; doğru alanı `pms.loginTokenField` ile verin |
| JWT ömrü | Belirtilmemiş | JWT'de `exp` varsa o kullanılır, yoksa `pms.tokenTtlMinutes` (varsayılan 720). 401'de bir kez yeniden login olunur |
| `price` toplam mı gecelik mi | Belirtilmemiş | Gerçek bir sorguyu rezervasyon motorundaki fiyatla karşılaştırıp `priceBasis` değerini `total_stay` ya da `per_night` yapın. `unknown` iken bot ikisini de iddia etmez |
| Rezervasyon motoru link parametreleri | Dokümanda yok | Otelin canlı rezervasyon sayfasından ya da Elektra destekten öğrenip `bookingLink.template` içine yazın |
| Hız sınırı, kullanım koşulları | Belirtilmemiş | Elektra'ya sorun |
| Promosyon kodu parametresi | İki dokümanda farklı (`promo-code` / `promocode`) | Kullanılmıyor |

## Mimari

```
src/
  server.ts            giriş noktası: ayarları yükler, bağımlılıkları kurar
  app.ts               Fastify uygulaması, /widget.js, /health
  config/              ortam değişkenleri ve hotel.json şeması
  chat/                sohbet çekirdeği (araç döngüsü) ve sistem promptu
  tools/               musaitlik_sorgula, rezervasyon_linki_uret, insana_devret
  pms/                 PmsClient arayüzü, ElektraClient, sanal PMS (sample.ts), MockPmsClient
  llm/                 Claude istemcisi ve anahtarsız demo modeli
  channels/web/        HTTP + SSE adaptörü
  handoff/             devir e-postası
  store/               SQLite: oturumlar, mesajlar, devir kayıtları
  guard/               hız sınırı
widget/                gömülebilir widget kaynağı (public/widget.js olarak derlenir)
hotels/<otel-id>/      hotel.json + bilgi-tabani.md (+ mock-pms.json)
test/
```

HTTP uç noktaları:

| Uç nokta | Açıklama |
|---|---|
| `POST /api/chat` | `{hotelId, sessionId?, message, language?}` → SSE: `session`, `text`, `tool`, `handoff_form`, `notice`, `done` |
| `POST /api/handoff` | `{hotelId, sessionId, name, contact, note?, consent: true}` → resepsiyona e-posta |
| `POST /api/session/delete` | Misafirin sohbet kaydını siler |
| `GET /api/hotels/:id/widget-config` | Widget'ın açılışta gösterdiği, gizli olmayan ayarlar |
| `GET /widget.js`, `GET /health` | |

### Davranış kuralları nerede uygulanıyor

- **Fiyat ve müsaitlik uydurulmaz.** Tek kaynak `musaitlik_sorgula` aracıdır; araç PMS tekliflerini değiştirmeden aktarır. PMS hatasında araç fiyat içermeyen bir hata döner ve devir önerir. Fiyatı ya da oda adı eksik PMS satırları atlanır.
- **Rezervasyon ve ödeme yok.** Rezervasyon oluşturan bir araç yoktur; `ElektraClient` rezervasyon uç noktalarını hiç çağırmaz.
- **Bilgi tabanı dışına çıkılmaz** ve **misafirin dilinde cevap verilir**: sistem promptu (`src/chat/prompt.ts`). Bu ikisi modelin talimata uymasına dayanır; canlıya almadan önce gerçek modelle örnek sorularla denenmelidir.
- **Sınırlar** sunucuda uygulanır: mesaj uzunluğu, IP ve oturum başına hız, sohbet uzunluğu, konuşma ve tur başına araç çağrısı.

### KVKK

- Aydınlatma metni ve linki, widget açıldığında ilk mesajdan önce ve sürekli görünür.
- Ad ve iletişim bilgisi sohbette istenmez. `insana_devret` aracı misafire bir form gösterir; form, rıza kutusu işaretlenmeden gönderilemez ve sunucu `consent: true` olmayan isteği reddeder. Böylece bu bilgiler dil modeline gönderilmez.
- Kayıtlar otel başına `privacy.retentionDays` gün saklanır; süresi dolanlar açılışta ve saatte bir silinir.
- Misafir "Sohbeti sil" ile kendi kaydını silebilir.
- Misafir sohbete kendiliğinden kişisel bilgi yazarsa bu mesaj, saklama süresi boyunca kayıtta kalır ve modele gider. Aydınlatma metniniz bunu kapsamalıdır.
- Aydınlatma ve rıza metinleri örnektir; hukuk danışmanınıza onaylatın.

### Sonraki aşamalar için bırakılan kapılar

- **WhatsApp:** sohbet çekirdeği (`runChatTurn`) HTTP'den bağımsızdır ve olay yayar; yeni kanal `src/channels/whatsapp/` altında bir adaptör olur. Oturumlar `channel` alanı taşır. Devir, formu olmayan kanallarda kanalın kendi rıza akışıyla yapılmalıdır.
- **Konaklayan misafir talepleri:** Elektra Guests API'sinde görev, POS siparişi ve uyandırma servisi uç noktaları var. `PmsClient` arayüzüne yeni metot ve `tools/` altına yeni araç eklenir.
- **Çoklu otel paneli:** oteller zaten klasör bazlıdır ve her kayıt `hotel_id` taşır; panel `hotels/` yerine veritabanından okuyan bir yükleyiciyle eklenebilir.

## Bilinen sınırlamalar

- Hız sınırı bellektedir; birden fazla süreç çalıştırılırsa paylaşılan bir depoya (ör. Redis) taşınmalıdır.
- Bilgi tabanı her istekte sistem promptuna eklenir (önbelleğe alınır). Çok büyük bilgi tabanlarında arama tabanlı bir yapıya geçilmelidir.
- `node:sqlite` Node 22'de deneysel uyarı verir; işlevsel bir sorun değildir.
