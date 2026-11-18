/**
 * Panelden "şu siteyi kontrol et" denildiğinde sunucunun istek atacağı adresin herkese açık bir alan adı olduğunu doğrular.
 * Yerel ağ / sunucunun kendisi (localhost, 127.x, 10.x, 192.168.x, 169.254.x, IP yazımı) reddedilir:
 * aksi halde panel yetkisi olan biri sunucu üzerinden iç ağa istek attırabilirdi (SSRF).
 */
const HOST_RE = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export function publicHttpsUrl(input: string): URL | null {
  const raw = input.trim();
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password || (url.port && url.port !== '443' && url.port !== '80')) return null;
  const host = url.hostname.toLowerCase();
  if (!HOST_RE.test(host) || /\.(local|localhost|internal|lan|home)$/.test(host)) return null;
  return url;
}
