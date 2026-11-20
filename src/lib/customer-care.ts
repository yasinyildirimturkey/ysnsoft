/**
 * Kazanılan müşterilerin aylık bakımı:
 *  - Google İşletme Profili (GBP) aylık iş listesi: API yok, ekip işi Google'da elle yapar ve burada işaretler.
 *    Fotoğraflar yalnız müşterinin gönderdikleri (Google'dan çekilmiş görsel kullanılmaz).
 *  - Aylık site raporu: müşterinin sitesine dışarıdan bakılır (erişilebilirlik, yanıt süresi, HTTPS/sertifika),
 *    o ayın GBP işleri eklenir; anlık görüntü saklanır, müşteri /bericht/<kod> sayfasında görür.
 * data/customer-care.json (deploy paketi ezmez).
 */
import dns from 'node:dns/promises';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import tls from 'node:tls';
import { notify } from '@/lib/notifications';
import { publicHttpsUrl } from '@/lib/public-host';
import { runWebscout } from '@/lib/webscout';

export const GBP_TASKS = [
  { key: 'hours', tr: 'Açılış saatleri ve tatil günleri kontrol edildi', de: 'Öffnungszeiten und Feiertage geprüft' },
  { key: 'info', tr: 'Adres, telefon, site ve kategoriler kontrol edildi', de: 'Adresse, Telefon, Website und Kategorien geprüft' },
  { key: 'post', tr: '1 Google gönderisi yayınlandı', de: 'Ein Beitrag im Unternehmensprofil veröffentlicht' },
  { key: 'reviews', tr: 'Yeni yorumlar yanıtlandı', de: 'Neue Bewertungen beantwortet' },
  { key: 'photos', tr: 'Müşterinin gönderdiği fotoğraflar eklendi', de: 'Neue eigene Fotos ergänzt' },
] as const;
export type GbpTask = (typeof GBP_TASKS)[number]['key'];

export interface SiteCheck {
  url: string; ok: boolean; status: number | null; ms: number | null; https: boolean;
  certValidTo: string | null; certDays: number | null; title: string; error?: string;
}
export interface Report { period: string; at: string; site: SiteCheck | null; gbp: GbpTask[] }
interface Store { gbp: Record<string, Record<string, Partial<Record<GbpTask, string>>>>; reports: Record<string, Record<string, Report>> }

const FILE = path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'customer-care.json');
export const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function read(): Store {
  try {
    const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return { gbp: j.gbp ?? {}, reports: j.reports ?? {} };
  } catch { return { gbp: {}, reports: {} }; }
}
function write(s: Store) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(s, null, 1));
  fs.renameSync(`${FILE}.tmp`, FILE);
}

export function gbpDone(prospectId: number, period: string): Partial<Record<GbpTask, string>> {
  return read().gbp[String(prospectId)]?.[period] ?? {};
}

export function setGbpTask(prospectId: number, period: string, task: GbpTask, done: boolean) {
  const s = read();
  const p = (s.gbp[String(prospectId)] ??= {});
  const m = (p[period] ??= {});
  if (done) m[task] = new Date().toISOString(); else delete m[task];
  write(s);
}

export function reportsOf(prospectId: number): Report[] {
  return Object.values(read().reports[String(prospectId)] ?? {}).sort((a, b) => b.period.localeCompare(a.period));
}

// ── Site kontrolü (SSRF korumalı: yalnız herkese açık adresler, yönlendirmeler tek tek denetlenir) ──

const PRIVATE_V4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];
function privateIp(ip: string) {
  if (net.isIPv4(ip)) return PRIVATE_V4.some((r) => r.test(ip));
  const v = ip.toLowerCase();
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('::ffff:');
}
async function safeHost(host: string) {
  try { const all = await dns.lookup(host, { all: true }); return all.length > 0 && !all.some((a) => privateIp(a.address)); } catch { return false; }
}

function certInfo(host: string): Promise<{ validTo: string; days: number } | null> {
  return new Promise((resolve) => {
    const sock = tls.connect({ host, port: 443, servername: host, timeout: 8000 }, () => {
      const c = sock.getPeerCertificate();
      sock.end();
      if (!c?.valid_to) return resolve(null);
      const to = new Date(c.valid_to);
      resolve({ validTo: to.toISOString().slice(0, 10), days: Math.floor((to.getTime() - Date.now()) / 86_400_000) });
    });
    sock.on('error', () => resolve(null));
    sock.on('timeout', () => { sock.destroy(); resolve(null); });
  });
}

export async function checkSite(input: string): Promise<SiteCheck> {
  let url = publicHttpsUrl(input);
  const base: SiteCheck = { url: input, ok: false, status: null, ms: null, https: false, certValidTo: null, certDays: null, title: '' };
  if (!url) return { ...base, error: 'Geçersiz adres' };
  const started = Date.now();
  try {
    let res: Response | null = null;
    for (let hop = 0; hop < 4; hop++) {
      if (!(await safeHost(url.hostname))) return { ...base, url: url.href, error: 'Adres herkese açık değil' };
      res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(12_000), headers: { 'User-Agent': 'YSNSOFT-Website-Monitor/1.0' } });
      const loc = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && loc) {
        const next = publicHttpsUrl(new URL(loc, url).href);
        if (!next) return { ...base, url: url.href, status: res.status, error: 'Yönlendirme reddedildi' };
        url = next;
        continue;
      }
      break;
    }
    const ms = Date.now() - started;
    const html = res ? (await res.text()).slice(0, 200_000) : '';
    const title = (html.match(/<title[^>]*>([^<]{0,200})<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ').trim();
    const https = url.protocol === 'https:';
    const cert = https ? await certInfo(url.hostname) : null;
    return { url: url.href, ok: Boolean(res && res.status >= 200 && res.status < 400), status: res?.status ?? null, ms, https, certValidTo: cert?.validTo ?? null, certDays: cert?.days ?? null, title };
  } catch (e) {
    return { ...base, url: url.href, error: e instanceof Error ? e.message.slice(0, 120) : 'Hata' };
  }
}

// ── Aylık rapor ──

interface WonRow { id: number; name: string; city?: string | null; website?: string | null; final_url?: string | null; draft_token?: string | null }

export async function buildReport(prospectId: number, period: string, site: string | null): Promise<Report> {
  const done = gbpDone(prospectId, period);
  const report: Report = {
    period, at: new Date().toISOString(),
    site: site ? await checkSite(site) : null,
    gbp: GBP_TASKS.map((t) => t.key).filter((k) => done[k]),
  };
  const s = read();
  (s.reports[String(prospectId)] ??= {})[period] = report;
  write(s);
  return report;
}

export const prevPeriod = (day: string) => {
  const d = new Date(`${day.slice(0, 7)}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
};

/** Zamanlayıcı (her gün): geçen ayın raporu olmayan kazanılmış müşteriler için rapor üretir; ayda bir kez iş çıkar. */
export async function createMonthlyReports(day: string): Promise<{ created: number; customers: number }> {
  const period = prevPeriod(day);
  const res = await runWebscout<{ rows?: WonRow[] }>(['query', '--status', 'won', '--min-score', '0', '--limit', '500']);
  const rows = res.rows ?? [];
  const existing = read().reports;
  let created = 0;
  for (const r of rows) {
    if (existing[String(r.id)]?.[period]) continue;
    await buildReport(r.id, period, r.website || r.final_url || null);
    created++;
  }
  if (created) {
    await notify({ kind: 'report', title: `${created} aylık rapor hazır`, body: `${period} raporları oluştu. Aday sayfasından "Rapor bağlantısı" ile müşteriye iletin.`, url: '/admin?m=prospects' }).catch(() => {});
  }
  return { created, customers: rows.length };
}
