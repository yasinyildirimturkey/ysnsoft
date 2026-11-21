import { createHash } from 'node:crypto';
import { clientKey, getAdminSession, isOwnDevice } from '@/lib/admin-auth';
import { draftBusinessId, readDemoViews, readWebscoutDraft, readWebscoutDraftTr, recordDemoView, runWebscout } from '@/lib/webscout';
import { notify } from '@/lib/notifications';

/** Demonun sahibi işletmeyi bulup ekibe bildirim gönderir. Aynı demo 2 saat içinde tekrar açılırsa tek bildirimde sayılır. */
async function notifyDemoOpened(token: string) {
  const id = draftBusinessId(token);
  let name = 'Bir demo';
  let city = '';
  if (id) {
    const res = await runWebscout(['query', '--id', String(id), '--kind', 'all', '--limit', '1']) as { rows?: { name: string; city: string }[] };
    name = res.rows?.[0]?.name ?? name;
    city = res.rows?.[0]?.city ?? '';
  }
  // Tekrar açılış = ilgi sürüyor: bildirim bunu söyler (saha ekranında da "Demosunu açanlar" başta görünür)
  const count = readDemoViews(token)?.count ?? 1;
  const title = count >= 2 ? `Demo ${count}. kez açıldı 🔥` : 'Demo açıldı';
  await notify(
    { kind: 'demo_view', title, body: `${name}${city ? ` · ${city}` : ''} — ${count >= 2 ? 'ilgi sürüyor, bugün arayın ya da uğrayın' : 'şimdi arayın ya da uğrayın'}`, url: id ? `/admin/adaylar/${id}` : '/admin?m=prospects', key: `demo:${token}` },
    { mergeMinutes: 120 },
  );
}

/**
 * Müşteri adayına gösterilen şablon taslağı (Seviye 3) — /demo/<gizli belirteç>.
 *
 * Sayfa WebScout'un ürettiği, kendi kendine yeten tek bir HTML dosyasıdır; bilerek bir Next sayfası
 * DEĞİLDİR (YSNSOFT düzeni, yazı tipleri ve betikleri karışmasın). Oturum gerekmez: adres tahmin
 * edilemez bir belirteçtir, arama motorlarına kapalıdır ve süresi dolunca kapanır.
 * İçerik dışarıdan toplanmış metin içerdiği için katı bir CSP ile sunulur: betik yok, dış istek yok.
 */

const HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
};

// Bağlantı önizlemesi yapan uygulamalar (WhatsApp, Telegram…) ve botlar "açıldı" sayılmaz
const NOT_A_VISIT = /bot|crawl|spider|preview|whatsapp|telegram|facebookexternalhit|slack|discord|skype|teams|linkedin|twitter|curl|wget|python|node-fetch|headless/i;
// Aynı ziyaretçinin yenilemeleri tek açılış sayılır. Bellekte, tuzlu karma ile; diske yazılmaz.
const SEEN_MS = 30 * 60 * 1000;
const seen = new Map<string, number>();
const SALT = Math.random().toString(36);

function countable(request: Request, token: string): boolean {
  // Biz sayılmayız: panele girişliyken ya da daha önce panele girilmiş ("bizim") bir cihazdan açınca
  if (getAdminSession(request) || isOwnDevice(request)) return false;
  const ua = request.headers.get('user-agent') ?? '';
  if (!ua || NOT_A_VISIT.test(ua)) return false;
  const purpose = `${request.headers.get('sec-purpose') ?? ''} ${request.headers.get('purpose') ?? ''}`;
  if (/prefetch|prerender/i.test(purpose)) return false;
  const key = createHash('sha256').update(`${SALT}|${token}|${clientKey(request)}|${ua}`).digest('base64url');
  const now = Date.now();
  if ((seen.get(key) ?? 0) > now - SEEN_MS) return false;
  seen.set(key, now);
  if (seen.size > 5000) for (const [k, t] of seen) if (t < now - SEEN_MS) seen.delete(k);
  return true;
}

function notice(title: string, text: string, status: number) {
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;background:#f5f5f7;color:#1d1d1f;text-align:center}p{color:#6e6e73;max-width:28em}</style></head><body><div><h1>${title}</h1><p>${text}</p></div></body></html>`;
  return new Response(html, { status, headers: { ...HEADERS, 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const draft = readWebscoutDraft(token);
  if (draft.state === 'expired') {
    return notice('Dieser Entwurf ist abgelaufen', 'Der Gestaltungsvorschlag war nur für begrenzte Zeit abrufbar. Sprechen Sie uns gern an, wir stellen ihn erneut bereit.', 410);
  }
  if (draft.state !== 'ok') return notice('Seite nicht gefunden', 'Unter dieser Adresse gibt es keinen Entwurf.', 404);
  if (countable(request, token)) {
    recordDemoView(token);
    // Ekibe anında haber: "Demo açıldı" (zil + telefona bildirim). Sayfayı bekletmez; hata sessizce geçer.
    void notifyDemoOpened(token).catch(() => {});
  }
  // Türkçe sürüm varsa sağ üstte DE | TR anahtarı (betik yok, yalnız bağlantı); ?lang=tr Türkçe sayfayı açar
  const tr = readWebscoutDraftTr(token);
  if (!tr) return new Response(new Uint8Array(draft.data), { headers: { ...HEADERS, 'Content-Type': draft.type } });
  const wantTr = new URL(request.url).searchParams.get('lang') === 'tr';
  const html = (wantTr ? tr : draft.data).toString('utf8');
  const link = (code: string, on: boolean) => `<a href="/demo/${token}${code === 'tr' ? '?lang=tr' : ''}" style="color:${on ? '#fff' : '#d2d2d7'};text-decoration:none;font-weight:${on ? 700 : 500};padding:2px 6px">${code.toUpperCase()}</a>`;
  const toggle = `<div style="position:fixed;bottom:96px;right:12px;z-index:2147483647;box-shadow:0 2px 8px rgba(0,0,0,.25);background:rgba(29,29,31,.82);border-radius:999px;padding:4px 6px;font:13px system-ui,sans-serif" lang="de" aria-label="Sprache">${link('de', !wantTr)}${link('tr', wantTr)}</div>`;
  const out = html.replace(/<body\b[^>]*>/i, (m) => `${m}${toggle}`);
  return new Response(out, { headers: { ...HEADERS, 'Content-Type': 'text/html; charset=utf-8' } });
}
