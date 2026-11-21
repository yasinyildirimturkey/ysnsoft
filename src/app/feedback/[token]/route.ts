import { clientKey } from '@/lib/admin-auth';
import { notify } from '@/lib/notifications';
import { bizForToken, esc, formBody, notFound, page } from '@/lib/public-pages';
import { rateLimit } from '@/lib/rate-limit';
import { addTestimonial } from '@/lib/testimonials';

/**
 * Yorum isteği (/feedback/<demo kodu>): yalnız kazanılmış müşteri için. Müşteri yorumunu kendisi yazar ve
 * yayın iznini kendisi işaretler; adının görünüp görünmeyeceğini de kendisi seçer. Panelde onaylanmadan yayımlanmaz.
 */
const clip = (v: string | null, n: number) => (v ?? '').trim().slice(0, n);

async function view(token: string, done = false, error = '') {
  const found = await bizForToken(token);
  if (!found || found.biz.status !== 'won') return notFound();
  const { biz } = found;
  const body = done
    ? `<div class="card ok"><b>Herzlichen Dank!</b> Ihre Bewertung ist bei uns angekommen. Wir veröffentlichen sie erst nach kurzer Prüfung – und nur so, wie Sie es freigegeben haben.</div>`
    : `
<div class="card"><p class="mut">Ihre Meinung</p><h1>Wie zufrieden sind Sie mit Ihrer neuen Website?</h1><p class="mut">${esc(biz.name)} · ${esc(biz.city)}</p></div>
<form class="card" method="post">
  ${error ? `<p style="color:#b91c1c">${esc(error)}</p>` : ''}
  <label for="r">Bewertung</label>
  <select id="r" name="rating" required><option value="5">★★★★★ sehr zufrieden</option><option value="4">★★★★ zufrieden</option><option value="3">★★★ in Ordnung</option><option value="2">★★ weniger zufrieden</option><option value="1">★ unzufrieden</option></select>
  <label for="t">Ihr Kommentar</label><textarea id="t" name="text" rows="5" maxlength="1200" required placeholder="Was hat Ihnen gefallen? Was hat sich seitdem verändert?"></textarea>
  <label for="n">Ihr Name</label><input id="n" name="name" maxlength="80" required>
  <label for="o">Funktion (optional)</label><input id="o" name="role" maxlength="80" placeholder="z. B. Inhaberin">
  <label class="chk"><input type="checkbox" name="show" value="1"><span>Mein Name und meine Funktion dürfen zusammen mit der Bewertung angezeigt werden.</span></label>
  <label class="chk"><input type="checkbox" name="consent" value="1" required><span>Ich bin damit einverstanden, dass YSNSOFT diese Bewertung zusammen mit dem Namen meines Betriebs auf ysnsoft.com veröffentlicht. Ich kann die Einwilligung jederzeit per E-Mail widerrufen.</span></label>
  <p style="margin-top:14px"><button class="btn" type="submit">Bewertung senden</button></p>
</form>`;
  return page(`Bewertung ${biz.name}`, body, 200, found.brand);
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return view(token);
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (rateLimit('feedback', clientKey(request), 3, 60 * 60_000)) return view(token, false, 'Zu viele Versuche. Bitte versuchen Sie es später erneut.');
  const found = await bizForToken(token);
  if (!found || found.biz.status !== 'won') return notFound();
  const f = await formBody(request);
  const rating = Math.round(Number(f.get('rating')));
  const text = clip(f.get('text'), 1200);
  const name = clip(f.get('name'), 80);
  if (!(rating >= 1 && rating <= 5) || text.length < 5 || !name) return view(token, false, 'Bitte Bewertung, Kommentar und Namen angeben.');
  if (f.get('consent') !== '1') return view(token, false, 'Ohne Ihre Einwilligung können wir die Bewertung nicht veröffentlichen.');
  try {
    addTestimonial({ prospectId: found.biz.id, business: found.biz.name, city: found.biz.city, name, role: clip(f.get('role'), 80), rating, text, consent: true, showName: f.get('show') === '1' });
  } catch {
    return view(token, false, 'Ihre Bewertung konnte nicht gespeichert werden. Bitte versuchen Sie es später erneut.');
  }
  void notify({ kind: 'testimonial', title: 'Yeni müşteri yorumu', body: `${found.biz.name}: ${rating}★ — onaylamak için Ayarlar'a bakın`, url: '/admin?m=settings' }).catch(() => {});
  return view(token, true);
}
