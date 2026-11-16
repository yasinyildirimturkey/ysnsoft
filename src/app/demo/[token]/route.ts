import { readWebscoutDraft } from '@/lib/webscout';

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

function notice(title: string, text: string, status: number) {
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;background:#f5f5f7;color:#1d1d1f;text-align:center}p{color:#6e6e73;max-width:28em}</style></head><body><div><h1>${title}</h1><p>${text}</p></div></body></html>`;
  return new Response(html, { status, headers: { ...HEADERS, 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const draft = readWebscoutDraft(token);
  if (draft.state === 'expired') {
    return notice('Dieser Entwurf ist abgelaufen', 'Der Gestaltungsvorschlag war nur für begrenzte Zeit abrufbar. Sprechen Sie uns gern an, wir stellen ihn erneut bereit.', 410);
  }
  if (draft.state !== 'ok') return notice('Seite nicht gefunden', 'Unter dieser Adresse gibt es keinen Entwurf.', 404);
  return new Response(new Uint8Array(draft.data), { headers: { ...HEADERS, 'Content-Type': draft.type } });
}
