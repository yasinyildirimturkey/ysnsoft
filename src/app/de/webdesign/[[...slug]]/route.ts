import { clientKey } from '@/lib/admin-auth';
import { CITIES, cityBySlug, landingIndexable, SECTORS, sectorBySlug, type Sector } from '@/lib/landing';
import { notify } from '@/lib/notifications';
import { contact, esc, formBody, notFound, page } from '@/lib/public-pages';
import { rateLimit } from '@/lib/rate-limit';
import { saveLead } from '@/lib/server-db';
import { runWebscout } from '@/lib/webscout';

/**
 * Almanca tanıtım sayfaları: /de/webdesign (dizin), /de/webdesign/<sektör>, /de/webdesign/<sektör>/<şehir>.
 * Fiyatlar paneldeki "Paketler ve fiyatlar"dan okunur. Form talebi Teklif Talepleri'ne düşer.
 * Arama motoruna yalnız Impressum + Datenschutz tanımlıysa açılır (landingIndexable).
 */
const BASE = '/de/webdesign';
const SITE = 'https://ysnsoft.com';

interface Pricing {
  vatNote: string;
  packages: { key: string; name: string; setup: number; monthly: number; features: string[] }[];
  addons?: { key: string; name: string; setup: number; monthly: number; desc: string }[];
  sectors?: { key: string; package: string; addons: string[] }[];
}
let cache: { at: number; p: Pricing | null } = { at: 0, p: null };
async function pricing(): Promise<Pricing | null> {
  if (cache.p && Date.now() - cache.at < 10 * 60_000) return cache.p;
  try { cache = { at: Date.now(), p: (await runWebscout<{ pricing: Pricing }>(['pricing'])).pricing }; } catch { /* fiyatsız göster */ }
  return cache.p;
}

const eur = (n: number) => `${n.toLocaleString('de-DE')} €`;

function legalFooter() {
  const imp = process.env.LANDING_IMPRESSUM_URL, ds = process.env.LANDING_DATENSCHUTZ_URL;
  const links = [imp ? `<a href="${esc(imp)}">Impressum</a>` : '', ds ? `<a href="${esc(ds)}">Datenschutz</a>` : ''].filter(Boolean).join(' · ');
  return `YSNSOFT · Websites für lokale Betriebe${links ? ` · ${links}` : ''}`;
}

function form(sector: Sector | null, cityName: string | null, done = false, error = '') {
  if (done) return '<div class="card ok"><b>Vielen Dank!</b> Ihre Anfrage ist bei uns angekommen. Wir melden uns in Kürze.</div>';
  return `<form class="card" method="post" id="anfrage">
  <h2>Kostenlosen Website-Check anfragen</h2>
  <p class="mut">Wir schauen uns Ihren Online-Auftritt an und zeigen Ihnen unverbindlich einen Entwurf${cityName ? ` – gern auch persönlich in ${esc(cityName)}` : ''}.</p>
  ${error ? `<p style="color:#b91c1c">${esc(error)}</p>` : ''}
  <label for="n">Ihr Name</label><input id="n" name="name" maxlength="120" required>
  <label for="b">Name Ihres Betriebs</label><input id="b" name="company" maxlength="160">
  <label for="e">E-Mail</label><input id="e" name="email" type="email" maxlength="200" required>
  <label for="t">Telefon (optional)</label><input id="t" name="phone" maxlength="40">
  <label for="m">Nachricht (optional)</label><textarea id="m" name="message" rows="3" maxlength="2000"></textarea>
  <input type="hidden" name="sector" value="${esc(sector?.key ?? '')}">
  <p style="margin-top:14px"><button class="btn" type="submit">Anfrage senden</button></p>
  <p class="mut">Ihre Angaben verwenden wir nur, um Ihre Anfrage zu beantworten.</p>
</form>`;
}

function packagesHtml(pr: Pricing | null, sector: Sector | null) {
  if (!pr) return '';
  const rec = pr.sectors?.find((s) => s.key === sector?.key);
  const addons = (pr.addons ?? []).filter((a) => rec?.addons.includes(a.key));
  return `<div class="card"><h2>Pakete und Preise</h2>
  ${pr.packages.map((p) => `<div style="border-top:1px solid #eee;padding:12px 0">
    <b>${esc(p.name)}</b>${rec?.package === p.key ? ' <span class="mut">– häufig gewählt für diese Branche</span>' : ''}
    <div><span class="price" style="font-size:1.2rem">${eur(p.setup)}</span> <span class="mut">einmalig</span> + <b>${eur(p.monthly)}</b> <span class="mut">pro Monat</span></div>
    <ul style="margin:6px 0 0;padding-left:18px">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
  </div>`).join('')}
  ${addons.length ? `<p style="margin-top:8px"><b>Passende Zusatzmodule</b></p><ul style="margin:0;padding-left:18px">${addons.map((a) => `<li>${esc(a.name)} <span class="mut">(${[a.setup ? `${eur(a.setup)} einmalig` : '', a.monthly ? `${eur(a.monthly)} / Monat` : ''].filter(Boolean).join(' + ')})</span></li>`).join('')}</ul>` : ''}
  <p class="mut" style="margin-top:10px">${esc(pr.vatNote)}</p></div>`;
}

async function render(slug: string[], done = false, error = '') {
  const index = landingIndexable();
  const opts = (title: string, desc: string, path: string, extra = '') => ({
    index,
    head: `<meta name="description" content="${esc(desc)}"><link rel="canonical" href="${SITE}${path}">${extra}`,
    footer: legalFooter(),
  });
  const c = contact();
  const callRow = `<div class="row">${c.tel ? `<a class="btn" href="tel:${esc(c.tel)}">Anrufen</a>` : ''}<a class="btn2" href="#anfrage">Anfrage senden</a></div>`;

  // Dizin
  if (slug.length === 0) {
    const body = `<div class="card"><h1>Websites für lokale Betriebe</h1><p>Wir gestalten Websites für kleine Betriebe in ${CITIES.map((x) => esc(x.name)).join(', ')} – mit Entwurf vorab und persönlichem Termin vor Ort.</p></div>
<div class="card"><h2>Branchen</h2><ul class="f">${SECTORS.map((s) => `<li><span><a href="${BASE}/${s.slug}"><b>${esc(s.title)}</b></a><br><span class="mut">${CITIES.map((x) => `<a href="${BASE}/${s.slug}/${x.slug}">${esc(x.name)}</a>`).join(' · ')}</span></span></li>`).join('')}</ul></div>`;
    return page('Websites für lokale Betriebe', body, 200, null, opts('Websites für lokale Betriebe', 'Websites für Restaurants, Friseure, Handwerk und weitere lokale Betriebe – mit kostenlosem Entwurf vorab.', BASE));
  }

  const sector = sectorBySlug(slug[0]);
  const city = slug[1] ? cityBySlug(slug[1]) : null;
  if (!sector || slug.length > 2 || (slug[1] && !city)) return notFound();
  const pr = await pricing();
  const where = city ? ` in ${city.name}` : '';
  const title = `Website für ${sector.plural}${where}`;
  const desc = `${title}: ${sector.shows.slice(0, 2).join(', ')} und mehr. Kostenloser Entwurf vorab, transparente Preise.`;
  const path = `${BASE}/${sector.slug}${city ? `/${city.slug}` : ''}`;
  const ld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Service', name: title, serviceType: 'Webdesign',
    provider: { '@type': 'Organization', name: 'YSNSOFT', url: SITE },
    areaServed: city ? { '@type': 'City', name: city.name } : CITIES.map((x) => ({ '@type': 'City', name: x.name })),
  }).replace(/</g, '\\u003c')}</script>`;

  const body = `
<div class="card">
  <p class="mut"><a href="${BASE}">Branchen</a> › ${city ? `<a href="${BASE}/${sector.slug}">${esc(sector.title)}</a> › ${esc(city.name)}` : esc(sector.title)}</p>
  <h1>${esc(title)}</h1>
  <p>${esc(sector.intro)}</p>
  ${city ? `<p>Wir sind regelmäßig in ${esc(city.name)} unterwegs und zeigen Ihnen den Entwurf gern persönlich vor Ort – ohne Verpflichtung.</p>` : ''}
  ${callRow}
</div>
<div class="card"><h2>Was Ihre Website zeigt</h2><ul class="f">${sector.shows.map((s) => `<li><span class="dot lo"></span><span>${esc(s)}</span></li>`).join('')}</ul></div>
<div class="card"><h2>Was Kundschaft online wissen möchte</h2><ul class="f">${sector.search.map((s) => `<li><span class="dot md"></span><span>${esc(s)}</span></li>`).join('')}</ul></div>
<div class="card"><h2>So läuft es ab</h2><ol style="margin:0;padding-left:18px">
  <li><b>Kostenloser Website-Check</b> – wir schauen uns Ihren bisherigen Auftritt an.</li>
  <li><b>Entwurf</b> – Sie sehen vorab, wie Ihre Website aussehen kann.</li>
  <li><b>Abstimmung</b> – Texte und eigene Fotos ergänzen, Änderungen einarbeiten.</li>
  <li><b>Online</b> – wir kümmern uns um Hosting, Domain und Wartung.</li>
</ol></div>
${packagesHtml(pr, sector)}
<div class="card"><h2>Häufige Fragen</h2>${sector.faq.map(([q, a]) => `<details style="border-top:1px solid #eee;padding:10px 0"><summary><b>${esc(q)}</b></summary><p style="margin-top:6px">${esc(a)}</p></details>`).join('')}</div>
${form(sector, city?.name ?? null, done, error)}
<div class="card"><h2>${city ? `Weitere Branchen in ${esc(city.name)}` : 'Städte'}</h2><p class="mut">${city
    ? SECTORS.filter((s) => s.key !== sector.key).map((s) => `<a href="${BASE}/${s.slug}/${city.slug}">${esc(s.title)}</a>`).join(' · ')
    : CITIES.map((x) => `<a href="${BASE}/${sector.slug}/${x.slug}">${esc(sector.title)} in ${esc(x.name)}</a>`).join(' · ')}</p></div>`;
  return page(title, body, 200, null, opts(title, desc, path, ld));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  return render(slug);
}

export async function POST(request: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  const sector = sectorBySlug(slug[0] ?? '');
  const city = slug[1] ? cityBySlug(slug[1]) : null;
  if (!sector) return notFound();
  if (rateLimit('landing-lead', clientKey(request), 5, 10 * 60_000)) return render(slug, false, 'Zu viele Anfragen. Bitte rufen Sie uns an.');
  const f = await formBody(request);
  const clip = (k: string, n: number) => (f.get(k) ?? '').trim().slice(0, n);
  const name = clip('name', 120), email = clip('email', 200);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return render(slug, false, 'Bitte Name und eine gültige E-Mail-Adresse angeben.');
  const company = clip('company', 160);
  try {
    saveLead({
      id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name, email, phone: clip('phone', 40), company,
      projectType: `Website (${sector.title})`, budget: 'Belirtilmedi',
      message: clip('message', 2000), source: `Tanıtım sayfası: ${sector.title}${city ? ` / ${city.name}` : ''}`,
      createdAt: new Date().toISOString(), status: 'new',
    });
  } catch {
    return render(slug, false, 'Ihre Anfrage konnte nicht gespeichert werden. Bitte rufen Sie uns an.');
  }
  void notify({ kind: 'lead', title: 'Yeni teklif talebi (tanıtım sayfası)', body: `${name}${company ? ` · ${company}` : ''} — ${sector.title}${city ? ` · ${city.name}` : ''}`, url: '/admin?m=leads' }).catch(() => {});
  return render(slug, true);
}
