import { contact, esc, page } from '@/lib/public-pages';
import { runWebscout } from '@/lib/webscout';

/**
 * Ortaklık sunumu (/partner): ajans, vergi danışmanı, odalar vb. için Almanca, yazdırılabilir tanıtım.
 * Bağlantıyla paylaşılır, arama motorlarına kapalıdır. Ölçülmemiş rakam ve uydurma referans yok; ortak payı "nach Vereinbarung".
 */
interface Pricing { vatNote: string; packages: { key: string; name: string; setup: number; monthly: number }[] }
const eur = (n: number) => `${n.toLocaleString('de-DE')} €`;

export async function GET() {
  let pr: Pricing | null = null;
  try { pr = (await runWebscout<{ pricing: Pricing }>(['pricing'])).pricing; } catch { /* fiyatsız */ }
  const c = contact();
  const body = `
<div class="card">
  <p class="mut">Partnerprogramm</p>
  <h1>Websites für lokale Betriebe – gemeinsam mit Ihnen</h1>
  <p>YSNSOFT gestaltet, betreibt und pflegt Websites für kleine Betriebe: Restaurants, Salons, Handwerk, Praxen, Einzelhandel. Wenn Ihre Kundschaft eine Website braucht, übernehmen wir die Umsetzung – unter unserem Namen oder unter Ihrem.</p>
</div>
<div class="card">
  <h2>Zwei Wege der Zusammenarbeit</h2>
  <ul class="f">
    <li><span class="dot lo"></span><span><b>Empfehlung</b> – Sie nennen uns Betriebe, die eine Website brauchen. Wir übernehmen Beratung, Entwurf, Umsetzung und Betreuung. Vergütung nach Vereinbarung.</span></li>
    <li><span class="dot lo"></span><span><b>White-Label</b> – Ihre Kundschaft sieht Ihren Namen: Website-Check, Angebot, Entwurf, Monatsbericht und Korrekturseite erscheinen mit Ihrem Namen und Ihren Kontaktdaten. Wir arbeiten im Hintergrund.</span></li>
  </ul>
</div>
<div class="card">
  <h2>Was Ihre Kundschaft bekommt</h2>
  <ul class="f">
    <li><span class="dot md"></span><span><b>Kostenloser Website-Check</b> – Auswertung des bisherigen Auftritts, per QR-Karte oder Link.</span></li>
    <li><span class="dot md"></span><span><b>Entwurf vorab</b> – ein persönlicher Gestaltungsvorschlag mit Namen, Öffnungszeiten und Leistungen des Betriebs, auf Wunsch zusätzlich auf Türkisch.</span></li>
    <li><span class="dot md"></span><span><b>Online-Angebot</b> – transparent, mit unverbindlicher Annahme per Klick.</span></li>
    <li><span class="dot md"></span><span><b>Texte selbst korrigieren</b> – der Betrieb ändert Texte im Entwurf direkt, wir übernehmen sie.</span></li>
    <li><span class="dot md"></span><span><b>Monatsbericht</b> – Erreichbarkeit, Ladezeit, Zertifikat und erledigte Pflege am Google-Unternehmensprofil.</span></li>
  </ul>
</div>
${pr ? `<div class="card"><h2>Pakete</h2><ul class="f">${pr.packages.map((p) => `<li><span><b>${esc(p.name)}</b> – ${eur(p.setup)} einmalig + ${eur(p.monthly)} / Monat</span></li>`).join('')}</ul><p class="mut" style="margin-top:8px">${esc(pr.vatNote)} Zusatzmodule (z. B. Online-Terminbuchung, digitale Speisekarte, Pflege des Google-Unternehmensprofils) nach Bedarf.</p></div>` : ''}
<div class="card">
  <h2>So starten wir</h2>
  <ol style="margin:0;padding-left:18px">
    <li>Kurzes Gespräch: Branche, Region, Empfehlung oder White-Label.</li>
    <li>Bei White-Label: Name, Kontaktdaten und Ansprechperson für Ihre Kundschaft hinterlegen.</li>
    <li>Erste Betriebe gemeinsam auswählen – wir erstellen Website-Check und Entwurf.</li>
  </ol>
</div>
<div class="card">
  <h2>Kontakt</h2>
  <div class="row">${c.tel ? `<a class="btn" href="tel:${esc(c.tel)}">Anrufen</a>` : ''}<a class="btn2" href="mailto:${esc(c.email)}?subject=${encodeURIComponent('Partnerprogramm')}">E-Mail schreiben</a></div>
  <p class="mut" style="margin-top:10px">Tipp: Diese Seite lässt sich über „Drucken“ als PDF speichern.</p>
</div>`;
  return page('Partnerprogramm', body, 200, null, { footer: 'YSNSOFT · Partnerprogramm' });
}
