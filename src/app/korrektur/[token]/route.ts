import { clientKey } from '@/lib/admin-auth';
import { addCorrection } from '@/lib/corrections';
import { editableTexts } from '@/lib/draft-text';
import { notify } from '@/lib/notifications';
import { bizForToken, contact, esc, formBody, notFound, page, type Brand } from '@/lib/public-pages';
import { rateLimit } from '@/lib/rate-limit';
import { readWebscoutDraft } from '@/lib/webscout';

/**
 * Metin düzeltme (/korrektur/<demo kodu>): işletme sahibi demodaki metinleri kendisi düzeltir, notunu bırakır.
 * Değişiklik hemen yayına girmez; ekip panelde bakıp "Uygula" der. Yalnız demoda gerçekten olan metinler kabul edilir.
 */
const clip = (v: string | null, n: number) => (v ?? '').replace(/\r/g, '').trim().slice(0, n);

async function load(token: string) {
  const found = await bizForToken(token);
  if (!found) return null;
  const draft = readWebscoutDraft(token);
  if (draft.state !== 'ok') return null;
  return { biz: found.biz, brand: found.brand, texts: editableTexts(draft.data.toString('utf8')) };
}

function view(token: string, name: string, texts: string[], done = false, error = '', brand: Brand = null) {
  const c = contact(brand);
  if (done) {
    return page(`Korrektur ${name}`, `<div class="card ok"><b>Vielen Dank!</b> Ihre Änderungswünsche sind bei uns angekommen. Wir übernehmen sie in Ihren Entwurf und melden uns.</div>
<div class="card"><a class="btn2" href="/demo/${esc(token)}">Zurück zum Entwurf</a></div>`, 200, brand);
  }
  const fields = texts.map((t, i) => `<label for="c${i}" class="mut">Text ${i + 1}</label>
<textarea id="c${i}" name="c${i}" rows="${Math.min(6, Math.max(2, Math.ceil(t.length / 60)))}" maxlength="1200">${esc(t)}</textarea>
<input type="hidden" name="o${i}" value="${esc(t)}">`).join('');
  const body = `
<div class="card">
  <p class="mut">Texte prüfen</p>
  <h1>${esc(name)}</h1>
  <p>Hier sehen Sie die Texte Ihres Entwurfs. Ändern Sie direkt im Feld, was nicht stimmt – z. B. Leistungen, Öffnungszeiten oder Beschreibungen. Unveränderte Felder lassen Sie einfach so.</p>
  <p><a class="btn2" href="/demo/${esc(token)}">Entwurf ansehen</a></p>
</div>
<form class="card" method="post">
  ${error ? `<p style="color:#b91c1c">${esc(error)}</p>` : ''}
  ${fields || '<p class="mut">Für diesen Entwurf gibt es keine bearbeitbaren Texte.</p>'}
  <label for="note">Weitere Wünsche (optional)</label>
  <textarea id="note" name="note" rows="3" maxlength="2000" placeholder="z. B. anderes Foto, neue Leistung, geänderte Telefonnummer"></textarea>
  <label for="who">Ihr Name</label><input id="who" name="who" maxlength="120" required>
  <p style="margin-top:14px"><button class="btn" type="submit">Änderungen senden</button></p>
  <p class="mut">Die Änderungen werden erst nach unserer Prüfung übernommen.</p>
</form>
<div class="card"><h2>Lieber telefonisch?</h2><div class="row">${c.tel ? `<a class="btn2" href="tel:${esc(c.tel)}">Anrufen</a>` : ''}<a class="btn2" href="mailto:${esc(c.email)}?subject=${encodeURIComponent(`Korrektur ${name}`)}">E-Mail</a></div></div>`;
  return page(`Korrektur ${name}`, body, 200, brand);
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await load(token);
  if (!d) return notFound();
  return view(token, d.biz.name, d.texts, false, '', d.brand);
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await load(token);
  if (!d) return notFound();
  if (rateLimit('korrektur', clientKey(request), 5, 60 * 60_000)) return view(token, d.biz.name, d.texts, false, 'Zu viele Versuche. Bitte rufen Sie uns an.', d.brand);
  const f = await formBody(request);
  const known = new Set(d.texts);
  const changes: { from: string; to: string }[] = [];
  for (let i = 0; i < 80; i++) {
    const from = clip(f.get(`o${i}`), 1200).replace(/\s+/g, ' ');
    const to = clip(f.get(`c${i}`), 1200).replace(/\s+/g, ' ');
    // Yalnız demoda gerçekten olan metin değiştirilebilir (uydurma "from" kabul edilmez)
    if (!from || !known.has(from) || !to || to === from) continue;
    changes.push({ from, to });
  }
  const note = clip(f.get('note'), 2000);
  const name = clip(f.get('who'), 120);
  if (!name) return view(token, d.biz.name, d.texts, false, 'Bitte geben Sie Ihren Namen an.', d.brand);
  if (!changes.length && !note) return view(token, d.biz.name, d.texts, false, 'Sie haben nichts geändert. Ändern Sie einen Text oder schreiben Sie einen Wunsch.', d.brand);
  addCorrection({ prospectId: d.biz.id, token, business: d.biz.name, changes: changes.slice(0, 60), note, name });
  void notify({ kind: 'correction', title: 'Metin düzeltme talebi ✍️', body: `${d.biz.name}: ${changes.length} metin değişikliği${note ? ' + not' : ''} (${name})`, url: `/admin/adaylar/${d.biz.id}` }).catch(() => {});
  return view(token, d.biz.name, d.texts, true, '', d.brand);
}
