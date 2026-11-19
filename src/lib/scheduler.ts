/**
 * Uygulama içi zamanlayıcı (KGLEX deseni). Windows Görev Zamanlayıcı gerekmez: uygulama açıkken her 10 dakikada
 * bir "zamanı gelen iş var mı" diye bakar.
 *
 * Tek çalıştırıcı: iisnode birden çok node süreci açabilir; her iş, dönemi için (gün) data/scheduler altında bir
 * işaret dosyasını ATOMİK olarak oluşturan süreçte çalışır (fs "wx"). Böylece aynı e-posta iki kez gitmez.
 * Saatler Almanya saatine göredir (saha orada). Her iş ortam değişkeniyle kapatılabilir: <AD>_KAPALI=true.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadUsers } from '@/lib/admin-users';
import { escapeHtml as esc, mailLayout, sendMail } from '@/lib/mailer';
import { notify } from '@/lib/notifications';
import { createMonthlyRecords } from '@/lib/won-invoice';
import { can } from '@/lib/roles';
import { runWebscout, webscoutAvailability } from '@/lib/webscout';

const DIR = path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'scheduler');
const TZ = 'Europe/Berlin';
const TICK_MS = 10 * 60_000;
const SITE = (process.env.SITE_URL || 'https://ysnsoft.com').replace(/\/$/, '');

/** Almanya saatine göre bugün (YYYY-MM-DD) ve dakika. */
function berlinNow() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date()).map((p) => [p.type, p.value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, min: Number(parts.hour) * 60 + Number(parts.minute) };
}

/** Bu dönem (gün) için işi üstlen: dosyayı ilk oluşturan süreç kazanır. */
function claim(job: string, period: string): boolean {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.closeSync(fs.openSync(path.join(DIR, `${job}-${period}.done`), 'wx'));
    return true;
  } catch {
    return false;
  }
}

/** Son çalışma bilgisi (panelde "sistem durumu" için). */
function record(job: string, result: Record<string, unknown>) {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    const file = path.join(DIR, 'status.json');
    let all: Record<string, unknown> = {};
    try { all = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* ilk kayıt */ }
    all[job] = { at: new Date().toISOString(), ...result };
    fs.writeFileSync(file, JSON.stringify(all, null, 1));
  } catch { /* yok say */ }
}
export function schedulerStatus(): Record<string, unknown> {
  try { return JSON.parse(fs.readFileSync(path.join(DIR, 'status.json'), 'utf8')); } catch { return {}; }
}

/** Eski işaret dosyalarını temizle (30 günden eski). */
function cleanup() {
  try {
    const cutoff = Date.now() - 30 * 86_400_000;
    for (const f of fs.readdirSync(DIR)) if (f.endsWith('.done') && fs.statSync(path.join(DIR, f)).mtimeMs < cutoff) fs.rmSync(path.join(DIR, f), { force: true });
  } catch { /* yok say */ }
}

interface Reminder { id: number; name: string; city: string; type: string; days?: number | null; count?: number }

const REMINDER_LABEL: Record<string, string> = {
  hot_demo: 'Demo açıldı — sıcak', missed_visit: 'Ziyaret kaçtı', offer_due: 'Teklif bekliyor', offer_silent: 'Teklif sessiz', stale: 'Hareketsiz',
};

/** Sabah özeti: bugünün planı + hatırlatmalar + açık teklifler. Yapılacak bir şey yoksa gönderilmez. */
export async function sendMorningSummary(opts: { to?: string[]; force?: boolean } = {}) {
  if (!webscoutAvailability().available) return { skipped: 'webscout yok' };
  const rem = await runWebscout(['reminders']) as { today_planned: number; items: Reminder[]; total: number };
  const funnel = await runWebscout(['funnel']) as { money?: { open: { n: number; setup: number; monthly: number }; won: { n: number; setup: number; monthly: number } } };
  if (!opts.force && !rem.today_planned && !rem.total) return { skipped: 'bugün iş yok' };

  const to = opts.to ?? (process.env.MORNING_SUMMARY_TO?.split(',').map((s) => s.trim()).filter(Boolean)
    ?? loadUsers().filter((u) => u.status === 'active' && can(u.role, 'prospects', 'write')).map((u) => u.email));
  const eur = (n: number) => `${n.toLocaleString('de-DE')} €`;
  const items = rem.items.slice(0, 15).map((it) => `<li style="margin:4px 0"><b>${esc(REMINDER_LABEL[it.type] ?? it.type)}</b> — <a href="${SITE}/admin/adaylar/${it.id}" style="color:#0071e3">${esc(it.name)}</a> <span style="color:#6e6e73">${esc(it.city)}</span></li>`).join('');
  const money = funnel.money;
  const html = mailLayout('Günaydın — bugünün özeti', `
<p style="margin:0 0 12px">Bugün <b>${rem.today_planned}</b> planlı ziyaret var${rem.total ? `, <b>${rem.total}</b> hatırlatma bekliyor` : ''}.</p>
${items ? `<ul style="padding-left:18px;margin:0 0 12px">${items}</ul>` : ''}
${money && (money.open.n || money.won.n) ? `<p style="margin:0 0 12px">Açık teklifler: <b>${eur(money.open.setup + 12 * money.open.monthly)}</b> (${money.open.n}) · Kazanılan: <b>${eur(money.won.setup + 12 * money.won.monthly)}</b> (${money.won.n}) — ilk yıl değeri</p>` : ''}
<p style="margin:16px 0 0"><a href="${SITE}/admin/saha" style="display:inline-block;background:#0071e3;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:600">Saha listesini aç</a></p>`);
  const res = await sendMail({ to, subject: `Bugün: ${rem.today_planned} ziyaret, ${rem.total} hatırlatma`, html, kind: 'morning-summary' });
  // Zamanlanmış özet telefona da düşer (elle "şimdi gönder" yalnız e-posta)
  if (!opts.to) {
    await notify({ kind: 'morning', title: 'Günaydın', body: `Bugün ${rem.today_planned} ziyaret, ${rem.total} hatırlatma`, url: '/admin/saha', key: `morning:${new Date().toISOString().slice(0, 10)}` }).catch(() => {});
  }
  return { ...res, recipients: to.length };
}

/** Aday veritabanının gece yedeği (son 14 gün tutulur). */
async function backupWebscout(day: string) {
  if (!webscoutAvailability().available) return { skipped: 'webscout yok' };
  const dir = path.join(/* turbopackIgnore: true */ process.cwd(), 'tools', 'webscout', 'data', 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, `webscout-${day}.db`);
  await runWebscout(['snapshot', target], 120_000).catch(async () => { /* snapshot düz metin yazar: JSON beklenmez */ });
  const ok = fs.existsSync(target);
  const files = fs.readdirSync(dir).filter((f) => /^webscout-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort();
  for (const f of files.slice(0, Math.max(0, files.length - 14))) fs.rmSync(path.join(dir, f), { force: true });
  return { ok, file: path.basename(target), size: ok ? fs.statSync(target).size : 0, kept: Math.min(files.length, 14) };
}

interface Job { name: string; at: number; run: (day: string) => Promise<Record<string, unknown>> }
const JOBS: Job[] = [
  { name: 'sabah-ozeti', at: 7 * 60 + 15, run: () => sendMorningSummary() },
  { name: 'gece-yedek', at: 3 * 60, run: (day) => backupWebscout(day) },
  // Kazanılan müşterilerin aylık bakım kaydı (ayda bir; her gün kontrol edilir, kaçmaz)
  { name: 'aylik-bakim', at: 6 * 60, run: (day) => createMonthlyRecords(day) },
];

let running = false;
async function tick() {
  if (running) return;
  running = true;
  try {
    const { day, min } = berlinNow();
    for (const job of JOBS) {
      if (process.env[`${job.name.toUpperCase().replace(/-/g, '_')}_KAPALI`] === 'true') continue;
      if (min < job.at || !claim(job.name, day)) continue;
      try {
        record(job.name, { ok: true, ...(await job.run(day)) });
      } catch (e) {
        record(job.name, { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : 'hata' });
      }
    }
    cleanup();
  } finally {
    running = false;
  }
}

let started = false;
/** Sunucu açılışında bir kez çağrılır (instrumentation.ts). */
export function startScheduler() {
  if (started || process.env.ZAMANLAYICI_KAPALI === 'true') return;
  started = true;
  setTimeout(() => { void tick(); }, 2 * 60_000); // açılıştan 2 dk sonra ilk bakış
  setInterval(() => { void tick(); }, TICK_MS).unref?.();
}
