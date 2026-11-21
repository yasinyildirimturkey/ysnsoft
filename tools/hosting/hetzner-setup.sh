#!/usr/bin/env bash
# YSNSOFT müşteri siteleri sunucusu — Hetzner Cloud (Ubuntu 24.04) için tek seferlik kurulum.
# Kullanım (sunucuda root olarak):  bash hetzner-setup.sh "<deploy-public-key>" "<acme-eposta>"
#   <deploy-public-key> : ysnsoft.com sunucusundaki yayın anahtarının .pub içeriği (tek satır, tırnak içinde)
#   <acme-eposta>       : Let's Encrypt sertifika bildirimleri için e-posta
# Yaptıkları: Caddy (otomatik HTTPS), "deploy" kullanıcısı (yalnız yayınla/kaldır komutu çalıştırabilir),
# /srv/sites klasörü, güvenlik duvarı (22, 80, 443), otomatik güvenlik güncellemeleri.
set -euo pipefail

PUBKEY="${1:?deploy public key gerekli}"
ACME_EMAIL="${2:?acme e-posta gerekli}"

apt-get update
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg ufw unattended-upgrades
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy

# Siteler
mkdir -p /srv/sites
id deploy >/dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy
chown deploy:deploy /srv/sites
chmod 755 /srv/sites

# Yayın kapısı: deploy anahtarı yalnız bu betiği çalıştırabilir (kabuk, port yönlendirme yok)
install -m 755 "$(dirname "$0")/ysn-site-gate" /usr/local/bin/ysn-site-gate
mkdir -p /home/deploy/.ssh
echo "command=\"/usr/local/bin/ysn-site-gate\",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding $PUBKEY" > /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Caddy
sed "s/__ACME_EMAIL__/${ACME_EMAIL}/" "$(dirname "$0")/Caddyfile" > /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
systemctl enable --now caddy
systemctl reload caddy

# Güvenlik duvarı ve otomatik güncellemeler
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "Kurulum tamam. Sunucu IP: $(curl -s4 https://ifconfig.co || hostname -I)"
