import { GBP_TASKS, PERIOD_RE, reportsOf } from '@/lib/customer-care';
import { bizForToken, contact, esc, notFound, page } from '@/lib/public-pages';

/**
 * Aylık site raporu (/bericht/<kod>?m=YYYY-MM): yalnız kazanılan müşteri. Kayıtlı anlık görüntü gösterilir
 * (sayfa açılınca yeniden ölçülmez). Ölçümler dışarıdan otomatik; hukuki değerlendirme yok.
 */
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const monthName = (p: string) => `${MONTHS[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}`;
const dateDe = (iso: string) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' });

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await bizForToken(token);
  if (!found || found.biz.status !== 'won') return notFound();
  const { biz } = found;
  const reports = reportsOf(biz.id);
  const want = new URL(request.url).searchParams.get('m') ?? '';
  const r = (PERIOD_RE.test(want) ? reports.find((x) => x.period === want) : null) ?? reports[0];
  const c = contact();
  if (!r) {
    return page(`Monatsbericht ${biz.name}`, `<div class="card"><p class="mut">Monatsbericht</p><h1>${esc(biz.name)}</h1><p>Der erste Bericht wird zu Beginn des nächsten Monats erstellt.</p></div>`);
  }

  const s = r.site;
  const ok = (good: boolean, text: string) => `<li><span class="dot ${good ? 'lo' : 'hi'}"></span><span>${text}</span></li>`;
  const siteRows = !s ? '<p class="mut">Für diesen Monat wurde keine Website-Adresse hinterlegt.</p>' : `<ul class="f">
    ${ok(s.ok, s.ok ? 'Website erreichbar' : `Website war bei der Prüfung nicht erreichbar${s.status ? ` (Status ${s.status})` : ''} – wir kümmern uns darum`)}
    ${s.ms != null ? ok(s.ms < 3000, `Antwortzeit: ${(s.ms / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Sekunden`) : ''}
    ${ok(s.https, s.https ? 'Verschlüsselte Verbindung (HTTPS) aktiv' : 'Keine verschlüsselte Verbindung (HTTPS)')}
    ${s.certValidTo ? ok((s.certDays ?? 0) > 14, `Sicherheitszertifikat gültig bis ${esc(dateDe(s.certValidTo))}`) : ''}
  </ul>`;
  const gbp = GBP_TASKS.filter((t) => r.gbp.includes(t.key));
  const others = reports.filter((x) => x.period !== r.period).slice(0, 6);

  const body = `
<div class="card">
  <p class="mut">Monatsbericht ${esc(monthName(r.period))}</p>
  <h1>${esc(biz.name)}</h1>
  <p class="mut">${esc(biz.city)}${s ? ` · ${esc(s.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))}` : ''}</p>
</div>
<div class="card">
  <h2>Ihre Website</h2>
  ${siteRows}
  <p class="mut" style="margin-top:10px">Automatische Prüfung von außen am ${esc(dateDe(r.at))}.</p>
</div>
${gbp.length ? `<div class="card"><h2>Google-Unternehmensprofil</h2><ul class="f">${gbp.map((t) => ok(true, esc(t.de))).join('')}</ul></div>` : ''}
${others.length ? `<div class="card"><h2>Frühere Berichte</h2><div class="row">${others.map((x) => `<a class="btn2" href="?m=${x.period}">${esc(monthName(x.period))}</a>`).join('')}</div></div>` : ''}
<div class="card">
  <h2>Wünsche oder Änderungen?</h2>
  <div class="row">
    ${c.tel ? `<a class="btn" href="tel:${esc(c.tel)}">Anrufen</a>` : ''}
    <a class="btn2" href="mailto:${esc(c.email)}?subject=${encodeURIComponent(`Monatsbericht ${biz.name}`)}">E-Mail schreiben</a>
  </div>
</div>`;
  return page(`Monatsbericht ${biz.name}`, body);
}
