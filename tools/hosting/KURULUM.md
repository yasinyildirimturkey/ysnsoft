# Müşteri siteleri sunucusu (Hetzner, Almanya) — kurulum

Müşteri siteleri statik HTML'dir; küçük bir Linux sunucu yeter. Caddy her alan adı için HTTPS sertifikasını kendisi alır.
Panel (ysnsoft.com) siteyi SSH ile gönderir; yayın anahtarı sunucuda **yalnız** yayınla/kaldır komutunu çalıştırabilir.

## 1. Sunucuyu oluşturun (siz)
1. Hetzner Cloud hesabı → **Add Server**
   - Location: **Falkenstein** veya **Nürnberg** (Almanya)
   - Image: **Ubuntu 24.04**
   - Type: **CX22** (2 vCPU, 4 GB) yeterli
   - SSH key: kendi anahtarınız (root girişi için)
2. Sunucunun **IPv4 adresini** not edin.

## 2. Yayın anahtarı (ysnsoft.com sunucusunda)
Claude bunu sizin onayınızla yapabilir. Elle yapmak için:
```
ssh-keygen -t ed25519 -N "" -C ysn-publish -f C:\Users\hgdeploy\ysnsoft-deploy\ysn_publish
```
- `ysn_publish` (özel anahtar) sunucuda kalır. IIS uygulama havuzu kullanıcısının **okuma** izni olmalı.
- `ysn_publish.pub` içeriği 3. adımda kullanılır.

## 3. Hetzner sunucusunu kurun
Bu klasördeki üç dosyayı (`hetzner-setup.sh`, `ysn-site-gate`, `Caddyfile`) sunucuya kopyalayın ve root olarak çalıştırın:
```
scp hetzner-setup.sh ysn-site-gate Caddyfile root@<IP>:/root/
ssh root@<IP> "bash /root/hetzner-setup.sh '<ysn_publish.pub içeriği>' '<sertifika e-postası>'"
```

## 4. Paneli bağlayın (ysnsoft.com ortam değişkenleri)
| Değişken | Değer |
|---|---|
| `PUBLISH_HOST` | Hetzner IP |
| `PUBLISH_IP` | Hetzner IP (müşteri DNS'inin göstermesi gereken) |
| `PUBLISH_USER` | `deploy` |
| `PUBLISH_KEY` | `C:\Users\hgdeploy\ysnsoft-deploy\ysn_publish` |
| `PUBLISH_SSH` / `PUBLISH_TAR` | gerekirse `C:\Windows\System32\OpenSSH\ssh.exe` / `C:\Windows\System32\tar.exe` |

## 5. Bir müşteriyi yayınlama (panel)
Aday sayfası → **Siteyi yayınla** (yalnız kazanılan müşteri):
1. Alan adı → **DNS kontrol**. Müşterinin alan adı firmasında iki kayıt girilmeli: `A @ <IP>` ve `A www <IP>`.
2. Impressum bilgileri ve Datenschutzerklärung metni (müşteriden; doğruluğu müşteri/danışmanı kontrol etmeli — hukuki değerlendirme değildir).
3. **Yayın kontrolü**: sayfada yer tutucu metin varsa yayın engellenir (müşteri "Metin düzeltme" ile düzeltir).
4. Müşteri onayı → **Yayınla**. HTTPS ilk açılışta birkaç saniyede alınır.

Yayından sonra adayın site adresi yeni alan adı olur; aylık rapor bu adresi ölçer.

## Notlar
- Sunucuda otomatik güvenlik güncellemeleri açıktır; güvenlik duvarı yalnız 22/80/443'e izin verir.
- Siteler `/srv/sites/<alan-adı>/` altında durur; `www.` otomatik bağlanır, http → https yönlendirilir.
- Yedek: siteler panelden her an yeniden yayınlanabilir (kaynak WebScout taslağı + kayıtlı yasal bilgiler).
