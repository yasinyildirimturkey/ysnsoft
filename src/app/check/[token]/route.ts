import { getAdminSession, isOwnDevice } from '@/lib/admin-auth';
import { notify } from '@/lib/notifications';
import { bizForToken, contact, esc, notFound, page, type Finding } from '@/lib/public-pages';

/**
 * "Kostenloser Website-Check" — kapıda bırakılan karttaki QR kodun açtığı sayfa (/check/<demo kodu>).
 * İşletme sahibi kendi sitesinde otomatik taramanın bulduklarını ve (varsa) hazırladığımız taslağı görür.
 * Hukuki olabilecek maddeler kesin ifade edilmez: "sollte geprüft werden (keine Rechtsberatung)".
 */
const LEGAL = new Set(['no_impressum', 'no_datenschutz', 'google_fonts_extern', 'tracking_ohne_consent']);

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await bizForToken(token);
  if (!found) return notFound();
  const { biz, demoOpen } = found;
  const c = contact(found.brand);

  const items = (biz.findings ?? [])
    .filter((f: Finding) => f.verified !== 'refuted' && f.de)
    .sort((a, b) => b.points - a.points)
    .slice(0, 8);
  const sev = (p: number) => (p >= 20 ? 'hi' : p >= 10 ? 'md' : 'lo');
  // Müşteriye korkutucu hukuki ifade gösterilmez ("Abmahn-Risiko" vb.); hukuki maddeler yalnız "sollte geprüft werden"
  const label = (f: Finding) => String(f.de).replace(/\s*\((?:Abmahn[^)]*|Bußgeld[^)]*)\)/gi, '');
  const list = items.map((f) => `<li><span class="dot ${sev(f.points)}"></span><span>${esc(label(f))}${LEGAL.has(f.code) ? ' <span class="mut">– sollte geprüft werden (keine Rechtsberatung)</span>' : ''}</span></li>`).join('');

  const noSite = biz.kind === 'no_site';
  const body = `
<div class="card">
  <p class="mut">Kostenloser Website-Check</p>
  <h1>${esc(biz.name)}</h1>
  <p class="mut">${esc(biz.city)}${biz.final_url || biz.website ? ` · ${esc(String(biz.final_url || biz.website).replace(/^https?:\/\//, '').replace(/\/$/, ''))}` : ''}</p>
</div>
<div class="card">
  <h2>${noSite ? 'Ergebnis' : 'Was uns aufgefallen ist'}</h2>
  ${noSite
    ? '<p>Wir haben keine eigene Website gefunden – nur Einträge bei Google oder in sozialen Netzwerken. Viele Kundinnen und Kunden suchen zuerst online nach Öffnungszeiten, Leistungen und Kontakt.</p>'
    : list ? `<ul class="f">${list}</ul>` : '<p>Bei der automatischen Prüfung ist uns nichts Wesentliches aufgefallen.</p>'}
  <p class="mut" style="margin-top:10px">Automatische Prüfung von außen; Ergebnisse können unvollständig sein. Gern schauen wir es uns gemeinsam an.</p>
</div>
${demoOpen ? `<div class="card"><h2>Ihr kostenloser Entwurf</h2><p>Wir haben einen unverbindlichen Gestaltungsvorschlag für ${esc(biz.name)} vorbereitet – am besten auf dem Handy ansehen.</p><a class="btn" href="/demo/${esc(token)}">Entwurf ansehen</a></div>` : ''}
<div class="card">
  <h2>Fragen? Sprechen Sie uns an</h2>
  <div class="row">
    ${c.tel ? `<a class="btn" href="tel:${esc(c.tel)}">Anrufen</a>` : ''}
    <a class="btn2" href="mailto:${esc(c.email)}?subject=${encodeURIComponent(`Website-Check ${biz.name}`)}">E-Mail schreiben</a>
  </div>
  <p class="mut" style="margin-top:10px">Unverbindlich und kostenlos. Wir melden uns nur, wenn Sie es möchten.</p>
</div>`;

  // Ekibe haber: kartı okuttu (biz açınca sayılmaz)
  if (!getAdminSession(request) && !isOwnDevice(request)) {
    void notify({ kind: 'check_view', title: 'Site kontrolü açıldı', body: `${biz.name} · ${biz.city} — QR kartı okuttu`, url: `/admin/adaylar/${biz.id}`, key: `check:${token}` }, { mergeMinutes: 120 }).catch(() => {});
  }
  return page(`Website-Check ${biz.name}`, body, 200, found.brand);
}
