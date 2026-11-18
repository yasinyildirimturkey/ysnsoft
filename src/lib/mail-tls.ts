/**
 * SMTP TLS (KGLEX `posta-tls.ts` ile aynı çözüm). mail.ysnsoft.com, Plesk'in kendi ürettiği varsayılan sertifikayı sunuyor;
 * zincir doğrulaması bunu "self-signed certificate" diye reddediyor.
 * Doğrulama KAPATILMAZ: sistem kökleri korunur, üstüne YALNIZ aşağıdaki sertifika (parmak iziyle) güvenilir sayılır.
 * Ad denetimi yalnız bu parmak izinde atlanır (sertifikadaki ad "Plesk"); başka her sertifika olağan şekilde doğrulanır.
 * Plesk sertifikası yenilenirse (geçerlilik: 07.09.2027) SMTP_TLS_PINNED_PEM ortam değişkenine yeni PEM verilir (satır sonu \n);
 * sunucuya gerçek bir sertifika takılırsa kendiliğinden geçer.
 * Parmak izi 18.11.2026'da sunucudan okunup KGLEX'teki kayıtla karşılaştırıldı (aynı Plesk sunucusu).
 */
import tls from 'node:tls';
import { X509Certificate } from 'node:crypto';

const PLESK_MAIL_PEM = `-----BEGIN CERTIFICATE-----
MIIEDTCCAvWgAwIBAgIDdFJxMA0GCSqGSIb3DQEBCwUAMGMxCzAJBgNVBAYTAkNI
MRUwEwYDVQQHDAxTY2hhZmZoYXVzZW4xDjAMBgNVBAoMBVBsZXNrMQ4wDAYDVQQD
DAVQbGVzazEdMBsGCSqGSIb3DQEJARYOaW5mb0BwbGVzay5jb20wHhcNMjYwOTA3
MTkwOTMxWhcNMjcwOTA3MTkwOTMxWjBjMQswCQYDVQQGEwJDSDEVMBMGA1UEBwwM
U2NoYWZmaGF1c2VuMQ4wDAYDVQQKDAVQbGVzazEOMAwGA1UEAwwFUGxlc2sxHTAb
BgkqhkiG9w0BCQEWDmluZm9AcGxlc2suY29tMIIBIjANBgkqhkiG9w0BAQEFAAOC
AQ8AMIIBCgKCAQEAwLe8wJD2d2bG0d2X8oEvFPvuqWiTPBlc+k7sBW2P0Xcm+LdL
Tq3G2kBPvaAp11AiP5HfmeALJIamRvDBczJ1UxmsJgvhPKanYc50lKpmwLflxdqh
+qY0jPxEd6CPZk+g5VjuXWWOf7aE4iYUUeecLKz0rqDNOHdiYm0OgqUxz8kaTI7x
kAIQTsncIeFezHI+Aj3RlmDeR7kCDbj+qa+jWjPwXpzqeLVmSNT78swGsxZX/1YJ
3Lf60epRkAgs9NP+8S4PS26cNYiHnREEnUrvDK+wN8Ng4wGSc22YfxQvXYyUiWd7
AEy2ng5n/OQe40cP64hDhZ8GnlJHnETuL+Q9LwIDAQABo4HJMIHGMBMGA1UdJQQM
MAoGCCsGAQUFBwMBMB0GA1UdDgQWBBQYCnGAGsdLNjHd0n5HstNQHIgO0zCBjwYD
VR0jBIGHMIGEgBQYCnGAGsdLNjHd0n5HstNQHIgO06FnpGUwYzELMAkGA1UEBhMC
Q0gxFTATBgNVBAcMDFNjaGFmZmhhdXNlbjEOMAwGA1UECgwFUGxlc2sxDjAMBgNV
BAMMBVBsZXNrMR0wGwYJKoZIhvcNAQkBFg5pbmZvQHBsZXNrLmNvbYIDdFJxMA0G
CSqGSIb3DQEBCwUAA4IBAQCc0I6OkIUkGnuT7Tg4LZ7eBXnZTSBQ+4LotIX5HvwV
PWA2JTQnxv0hjNZkRKtiYNLHWvuTfIf98hSpPe08ae/Qn+fmhhlih0n0uI/atORB
HO1E/HsL2Do5q8ob9726M4nH3pVUHuekfTqLIJToNzP5mdj07P/k8cfJGH/GIUP8
hag3wi014zdORKGvhEN/I9KPL2EZkZEmhHyjy7uVDHi4fs4JINXWDbbKSzDOBcVE
cbGs/uklXAzaaxKdT1bXhF8YXoZ0uVsnOTzo7XMxbVinpb5mFo+5Zurib7YC0Sau
lu9d7btEaWVVcib7YyW2iY4J+UP1AYzXTMNVxKaJceJ7
-----END CERTIFICATE-----`;
const PLESK_MAIL_FP = '3E:D3:A7:B9:E7:22:0D:DA:90:31:7B:D6:87:6E:8F:A8:9F:97:79:8E:19:F1:EE:08:A9:FE:5C:E5:B8:49:D6:A4';

function pinned(): { pem: string[]; fps: Set<string> } {
  const pem = [PLESK_MAIL_PEM];
  const fps = new Set([PLESK_MAIL_FP]);
  const extra = (process.env.SMTP_TLS_PINNED_PEM || '').replace(/\\n/g, '\n').trim();
  if (extra) {
    try {
      const x = new X509Certificate(extra);
      pem.push(extra);
      fps.add(String(x.fingerprint256).toUpperCase());
    } catch { console.warn('SMTP_TLS_PINNED_PEM okunamadı; yok sayıldı.'); }
  }
  return { pem, fps };
}

/** nodemailer `tls` seçeneği. */
export function smtpTlsOptions(): tls.ConnectionOptions {
  const { pem, fps } = pinned();
  return {
    rejectUnauthorized: true,
    ca: [...tls.rootCertificates, ...pem],
    checkServerIdentity: (host, cert) => (fps.has(String(cert.fingerprint256).toUpperCase()) ? undefined : tls.checkServerIdentity(host, cert)),
  };
}
