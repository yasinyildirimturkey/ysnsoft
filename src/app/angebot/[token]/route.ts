import fs from 'node:fs';
import path from 'node:path';
import { clientKey } from '@/lib/admin-auth';
import { notify } from '@/lib/notifications';
import { bizForToken, contact, esc, formBody, notFound, page } from '@/lib/public-pages';
import { rateLimit } from '@/lib/rate-limit';
import { runWebscout } from '@/lib/webscout';

/**
 * Teklif sayfası (/angebot/<demo kodu>): müşteri teklifini görür ve BAĞLAYICI OLMAYAN bir kabul talebi bırakabilir.
 * Talep sözleşme değildir; ekibe bildirim gider, sipariş onayı ayrıca yapılır. Aday otomatik "kazanıldı" yapılmaz.
 * Talepler data/offer-requests.json'a yazılır (deploy paketi ezmez).
 */
interface Pricing {
  vatNote: string;
  packages: { key: string; name: string; setup: number; monthly: number; features: string[] }[];
  addons?: { key: string; name: string; setup: number; monthly: number; desc: string }[];
  sectors?: { key: string; name: string; features: string[] }[];
}
const FILE = path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'offer-requests.json');
const eur = (n: number) => `${n.toLocaleString('de-DE')} €`;
const clip = (v: string | null, n: number) => (v ?? '').trim().slice(0, n);

async function view(token: string, done = false, error = '') {
  const found = await bizForToken(token);
  if (!found) return notFound();
  const { biz, demoOpen } = found;
  if (biz.offer_setup == null) {
    return page('Angebot', `<div class="card"><h1>${esc(biz.name)}</h1><p>Für Sie liegt derzeit kein Angebot vor. Sprechen Sie uns gern an.</p></div>`, 200, found.brand);
  }
  const pr = (await runWebscout<{ pricing: Pricing }>(['pricing'])).pricing;
  const pkg = pr.packages.find((p) => p.key === biz.offer_package);
  let addonKeys: string[] = [];
  try { addonKeys = JSON.parse(biz.offer_addons || '[]'); } catch { /* yok */ }
  const addons = (pr.addons ?? []).filter((a) => addonKeys.includes(a.key));
  const sector = (pr.sectors ?? []).find((s) => s.key === biz.category);
  const priceOf = (a: { setup: number; monthly: number }) => [a.setup ? `${eur(a.setup)} einmalig` : '', a.monthly ? `${eur(a.monthly)} / Monat` : ''].filter(Boolean).join(' + ');
  const c = contact(found.brand);
  const body = `
<div class="card">
  <p class="mut">Ihr Angebot</p>
  <h1>${esc(biz.name)}</h1>
  <p class="mut">${esc(biz.city)}</p>
</div>
<div class="card">
  <h2>Paket ${esc(pkg?.name ?? biz.offer_package ?? '')}</h2>
  <div class="row" style="align-items:baseline;gap:18px">
    <div><div class="price">${eur(biz.offer_setup)}</div><div class="mut">einmalig</div></div>
    ${biz.offer_monthly ? `<div><div class="price">${eur(biz.offer_monthly)}</div><div class="mut">pro Monat</div></div>` : ''}
  </div>
  ${addons.length ? `<p class="mut" style="margin-top:6px">Gesamtpreis inkl. Zusatzmodule</p>` : ''}
  ${pkg?.features?.length ? `<ul style="margin:12px 0 0;padding-left:18px">${pkg.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
  ${sector?.features?.length ? `<p style="margin:12px 0 0"><b>Speziell für ${esc(sector.name)}</b></p><ul style="margin:6px 0 0;padding-left:18px">${sector.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
  ${addons.length ? `<p style="margin:12px 0 0"><b>Zusatzmodule</b></p><ul style="margin:6px 0 0;padding-left:18px">${addons.map((a) => `<li>${esc(a.name)}${priceOf(a) ? ` <span class="mut">(${esc(priceOf(a))})</span>` : ''}${a.desc ? `<br><span class="mut">${esc(a.desc)}</span>` : ''}</li>`).join('')}</ul>` : ''}
  <p class="mut" style="margin-top:10px">${esc(pr.vatNote)}</p>
  ${demoOpen ? `<p><a class="btn2" href="/demo/${esc(token)}">Entwurf ansehen</a></p>` : ''}
</div>
${done ? `<div class="card ok"><b>Vielen Dank!</b> Ihre Nachricht ist bei uns angekommen. Wir melden uns in Kürze, besprechen offene Fragen und senden Ihnen die Auftragsbestätigung.</div>` : `
<form class="card" method="post">
  <h2>Angebot annehmen</h2>
  <p class="mut">Unverbindlich: Damit teilen Sie uns mit, dass Sie das Angebot annehmen möchten. Verbindlich wird es erst mit unserer Auftragsbestätigung, die wir vorher mit Ihnen abstimmen.</p>
  ${error ? `<p style="color:#b91c1c">${esc(error)}</p>` : ''}
  <label for="n">Ihr Name</label><input id="n" name="name" maxlength="120" required>
  <label for="t">Telefon oder E-Mail für die Rückmeldung</label><input id="t" name="contact" maxlength="160" required>
  <label for="m">Nachricht (optional)</label><textarea id="m" name="message" rows="3" maxlength="1500"></textarea>
  <label class="chk"><input type="checkbox" name="ok" value="1" required><span>Ich möchte das Angebot unverbindlich annehmen und bitte um Kontaktaufnahme.</span></label>
  <p style="margin-top:14px"><button class="btn" type="submit">Unverbindlich annehmen</button></p>
  <p class="mut">Ihre Angaben verwenden wir nur, um Sie zu diesem Angebot zu kontaktieren.</p>
</form>`}
<div class="card"><h2>Fragen?</h2><div class="row">${c.tel ? `<a class="btn2" href="tel:${esc(c.tel)}">Anrufen</a>` : ''}<a class="btn2" href="mailto:${esc(c.email)}?subject=${encodeURIComponent(`Angebot ${biz.name}`)}">E-Mail</a></div></div>`;
  return page(`Angebot ${biz.name}`, body, 200, found.brand);
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return view(token);
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (rateLimit('offer-accept', clientKey(request), 5, 60 * 60_000)) return view(token, false, 'Zu viele Versuche. Bitte rufen Sie uns an.');
  const found = await bizForToken(token);
  if (!found || found.biz.offer_setup == null) return notFound();
  const f = await formBody(request);
  const name = clip(f.get('name'), 120);
  const contactInfo = clip(f.get('contact'), 160);
  if (!name || !contactInfo || f.get('ok') !== '1') return view(token, false, 'Bitte Name und Kontakt angeben und das Häkchen setzen.');
  const entry = {
    at: new Date().toISOString(), prospectId: found.biz.id, business: found.biz.name, name, contact: contactInfo,
    message: clip(f.get('message'), 1500), offer: { package: found.biz.offer_package, setup: found.biz.offer_setup, monthly: found.biz.offer_monthly, addons: found.biz.offer_addons ?? null },
  };
  try {
    let list: unknown[] = [];
    try { list = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { /* ilk kayıt */ }
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify([entry, ...(Array.isArray(list) ? list : [])].slice(0, 500), null, 2));
  } catch {
    return view(token, false, 'Ihre Nachricht konnte nicht gespeichert werden. Bitte rufen Sie uns an.');
  }
  void notify({ kind: 'offer_accept', title: 'Teklif kabul talebi 🎉', body: `${found.biz.name}: ${name} (${contactInfo}) teklifi kabul etmek istiyor — sipariş onayı için arayın.`, url: `/admin/adaylar/${found.biz.id}` }).catch(() => {});
  return view(token, true);
}
