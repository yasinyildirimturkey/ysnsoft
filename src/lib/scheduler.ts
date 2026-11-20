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
import { createMonthlyRecords, markOverdue, overdueSummary } from '@/lib/won-invoice';
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
  const due = overdueSummary();
  if (!opts.force && !rem.today_planned && !rem.total && !due.n) return { skipped: 'bugün iş yok' };

  const to = opts.to ?? (process.env.MORNING_SUMMARY_TO?.split(',').map((s) => s.trim()).filter(Boolean)
    ?? loadUsers().filter((u) => u.status === 'active' && can(u.role, 'prospects', 'write')).map((u) => u.email));
  const eur = (n: number) => `${n.toLocaleString('de-DE')} €`;
  const items = rem.items.slice(0, 15).map((it) => `<li style="margin:4px 0"><b>${esc(REMINDER_LABEL[it.type] ?? it.type)}</b> — <a href="${SITE}/admin/adaylar/${it.id}" style="color:#0071e3">${esc(it.name)}</a> <span style="color:#6e6e73">${esc(it.city)}</span></li>`).join('');
  const money = funnel.money;
  const html = mailLayout('Günaydın — bugünün özeti', `
<p style="margin:0 0 12px">Bugün <b>${rem.today_planned}</b> planlı ziyaret var${rem.total ? `, <b>${rem.total}</b> hatırlatma bekliyor` : ''}.</p>
${items ? `<ul style="padding-left:18px;margin:0 0 12px">${items}</ul>` : ''}
${money && (money.open.n || money.won.n) ? `<p style="margin:0 0 12px">Açık teklifler: <b>${eur(money.open.setup + 12 * money.open.monthly)}</b> (${money.open.n}) · Kazanılan: <b>${eur(money.won.setup + 12 * money.won.monthly)}</b> (${money.won.n}) — ilk yıl değeri</p>` : ''}
${due.n ? `<p style="margin:0 0 12px;color:#b91c1c">Vadesi geçen tahsilat: <b>${due.n}</b> kayıt (${esc(due.text)}) — <a href="${SITE}/admin?m=muhasebe" style="color:#b91c1c">Muhasebe</a></p>` : ''}
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

/**
 * Akşam: yarın için plan yoksa (hafta içi + cumartesi) yakın ve iyi puanlı duraklardan bir plan ÖNERİSİ hazırlanır ve
 * telefona bildirim gider. Plan otomatik kaydedilmez; saha ekranında "Bu planı onayla" ile kaydedilir.
 */
async function suggestTomorrow(day: string) {
  if (!webscoutAvailability().available) return { skipped: 'webscout yok' };
  const t = new Date(`${day}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  if (t.getUTCDay() === 0) return { skipped: 'yarın pazar' };
  const tomorrow = t.toISOString().slice(0, 10);
  const planned = await runWebscout(['query', '--visit-day', tomorrow, '--kind', 'all', '--limit', '60']) as { rows?: { visit_date: string | null }[] };
  if ((planned.rows ?? []).some((r) => r.visit_date === tomorrow)) return { skipped: 'yarın planlı' };
  const s = await runWebscout(['suggest-day', '--date', tomorrow]) as { city?: string | null; stops?: { id: number }[] };
  const n = s.stops?.length ?? 0;
  if (!n) return { skipped: 'öneri yok' };
  await notify({ kind: 'plan', title: 'Yarın için plan önerisi', body: `${s.city}: ${n} yakın durak hazır — açıp onaylayın`, url: `/admin/saha?date=${tomorrow}`, key: `plan:${tomorrow}` }).catch(() => {});
  return { tomorrow, city: s.city, stops: n };
}

interface Weekly {
  visits: { visits: number; met: number; closed: number; demos: number };
  offers: { n: number; setup: number; monthly: number };
  won: { id: number; name: string; city: string; offer_setup: number | null; offer_monthly: number | null }[];
  reasons: { reason: string; n: number }[];
  byCity: { city: string; visits: number }[];
  hot: { id: number; name: string; city: string; count?: number }[];
  openReminders: number;
}
const LOSS_TR: Record<string, string> = {
  price: 'fiyat', has_site: 'zaten sitesi var', no_time: 'zamanı yok', no_trust: 'güvenmedi', not_decider: 'karar veren yoktu',
  no_need: 'ihtiyaç görmüyor', other: 'diğer', unknown: 'neden girilmedi',
};

/** Pazartesi sabahı: geçen haftanın özeti (saha, teklif, kazanılan, kayıp nedenleri, tahsilat, bu haftanın sıcak adayları). */
export async function sendWeeklyReport(day: string, opts: { force?: boolean; to?: string[] } = {}) {
  if (!opts.force && new Date(`${day}T12:00:00Z`).getUTCDay() !== 1) return { skipped: 'pazartesi değil' };
  if (!webscoutAvailability().available) return { skipped: 'webscout yok' };
  const w = await runWebscout<Weekly>(['weekly']);
  const due = overdueSummary();
  const eur = (n: number) => `${n.toLocaleString('de-DE')} €`;
  const rate = w.visits.visits ? Math.round((w.visits.met / w.visits.visits) * 100) : 0;
  const row = (k: string, v: string) => `<tr><td style="padding:4px 12px 4px 0;color:#6e6e73">${k}</td><td style="padding:4px 0"><b>${v}</b></td></tr>`;
  const html = mailLayout('Haftalık rapor', `
<table style="border-collapse:collapse;margin:0 0 12px">
${row('Saha ziyareti', `${w.visits.visits} (görüşülen ${w.visits.met}, %${rate}; kapalı ${w.visits.closed})`)}
${row('Demo gösterildi', String(w.visits.demos))}
${row('Verilen teklif', w.offers.n ? `${w.offers.n} · ${eur(w.offers.setup)} kurulum + ${eur(w.offers.monthly)}/ay` : '0')}
${row('Kazanılan', w.won.length ? w.won.map((x) => esc(x.name)).join(', ') : '0')}
${row('Tahsilat', due.n ? `<span style="color:#b91c1c">${due.n} kayıt vadesi geçti (${esc(due.text)})</span>` : 'vadesi geçen yok')}
${w.byCity.length ? row('Şehirler', esc(w.byCity.map((c) => `${c.city} ${c.visits}`).join(' · '))) : ''}
${w.reasons.length ? row('İlgilenmedi nedenleri', esc(w.reasons.map((r) => `${LOSS_TR[r.reason] ?? r.reason} ${r.n}`).join(' · '))) : ''}
</table>
${w.hot.length ? `<p style="margin:0 0 6px"><b>Bu hafta önce bunlar</b> (demosunu açtılar):</p><ul style="padding-left:18px;margin:0 0 12px">${w.hot.map((h) => `<li><a href="${SITE}/admin/adaylar/${h.id}" style="color:#0071e3">${esc(h.name)}</a> <span style="color:#6e6e73">${esc(h.city)}</span></li>`).join('')}</ul>` : ''}
<p style="margin:0;color:#6e6e73">Açık hatırlatma: ${w.openReminders}. Ayrıntı: <a href="${SITE}/admin?m=prospects" style="color:#0071e3">Satış hunisi</a></p>`);
  const to = opts.to ?? (process.env.MORNING_SUMMARY_TO?.split(',').map((s) => s.trim()).filter(Boolean)
    ?? loadUsers().filter((u) => u.status === 'active' && can(u.role, 'prospects', 'write')).map((u) => u.email));
  const res = await sendMail({ to, subject: `Haftalık rapor: ${w.visits.visits} ziyaret, ${w.won.length} kazanılan`, html, kind: 'weekly-report' });
  return { ...res, recipients: to.length };
}

interface Job { name: string; at: number; run: (day: string) => Promise<Record<string, unknown>> }
const JOBS: Job[] = [
  { name: 'sabah-ozeti', at: 7 * 60 + 15, run: () => sendMorningSummary() },
  { name: 'gece-yedek', at: 3 * 60, run: (day) => backupWebscout(day) },
  // Kazanılan müşterilerin aylık bakım kaydı (ayda bir; her gün kontrol edilir, kaçmaz)
  { name: 'aylik-bakim', at: 6 * 60, run: (day) => createMonthlyRecords(day) },
  // Vadesi geçen tahsilatlar (sabah özetinden önce çalışır ki özet güncel olsun)
  { name: 'vade-kontrol', at: 6 * 60 + 5, run: (day) => markOverdue(day) },
  { name: 'yarin-plan', at: 18 * 60, run: (day) => suggestTomorrow(day) },
  // Pazartesi 07:30 haftalık patron raporu (diğer günler "pazartesi değil" diye atlanır)
  { name: 'haftalik-rapor', at: 7 * 60 + 30, run: (day) => sendWeeklyReport(day) },
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
