/**
 * Müşteriye açık, YSNSOFT adlı Almanca sayfalar (site kontrolü, teklif, yorum) için ortak parçalar.
 *
 * Adres, adayın gizli demo koduyla açılır (/check/<kod>, /angebot/<kod>, /feedback/<kod>): tahmin edilemez,
 * arama motorlarına kapalıdır. Sayfalarda betik yoktur; içerik dışarıdan toplanmış metin içerebileceği için
 * katı CSP ile sunulur (form yalnız aynı adrese gönderilebilir).
 */
import { draftBusinessId, readWebscoutDraft, runWebscout } from '@/lib/webscout';

export const PUBLIC_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const TOKEN_RE = /^[A-Za-z0-9_-]{16}$/;

export interface Finding { code: string; points: number; de?: string; tr?: string; verified?: string }
export interface PublicBiz {
  id: number; name: string; city: string; address?: string | null; phone?: string | null; status: string; kind?: string | null;
  findings?: Finding[] | null; final_url?: string | null; website?: string | null;
  offer_package?: string | null; offer_setup?: number | null; offer_monthly?: number | null; offer_addons?: string | null; category?: string | null;
  draft_token?: string | null;
}

/** Kod → işletme (taslak süresi dolmuş olsa da kod geçerlidir; demo bağlantısı ayrıca denetlenir). */
export async function bizForToken(token: string): Promise<{ biz: PublicBiz; demoOpen: boolean } | null> {
  if (!TOKEN_RE.test(token)) return null;
  const id = draftBusinessId(token);
  if (!id) return null;
  const res = await runWebscout<{ rows?: PublicBiz[] }>(['query', '--id', String(id), '--min-score', '0', '--limit', '1']);
  const biz = res.rows?.[0];
  if (!biz || biz.status === 'do_not_contact') return null;
  return { biz, demoOpen: readWebscoutDraft(token).state === 'ok' };
}

export function contact() {
  const phone = process.env.COMPANY_PHONE || '';
  const email = process.env.COMPANY_INFO_EMAIL || 'info@ysnsoft.com';
  return { phone, email, tel: phone.replace(/[^+\d]/g, '') };
}

export function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${esc(title)} · YSNSOFT</title>
<style>
:root{--a:#0071e3;--t:#1d1d1f;--m:#6e6e73;--b:#f5f5f7}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--b);color:var(--t);line-height:1.55}
.wrap{max-width:640px;margin:0 auto;padding:24px 16px 48px}
header{display:flex;align-items:center;gap:10px;margin-bottom:20px}.logo{width:36px;height:36px;border-radius:10px;background:#1d1d1f;color:#fff;display:grid;place-items:center;font-weight:700;font-size:13px}
.card{background:#fff;border-radius:18px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.06);margin-bottom:14px}
h1{font-size:1.45rem;margin:0 0 6px}h2{font-size:1.05rem;margin:0 0 10px}p{margin:0 0 10px}.mut{color:var(--m);font-size:.9rem}
ul.f{list-style:none;padding:0;margin:0}ul.f li{display:flex;gap:10px;padding:9px 0;border-top:1px solid #eee}ul.f li:first-child{border-top:0}
.dot{flex:0 0 10px;height:10px;border-radius:50%;margin-top:7px}.hi{background:#e5484d}.md{background:#f5a524}.lo{background:#a1a1aa}
.btn{display:inline-block;background:var(--a);color:#fff;text-decoration:none;border:0;border-radius:12px;padding:12px 18px;font-weight:600;font-size:1rem;cursor:pointer}
.btn2{display:inline-block;color:var(--a);text-decoration:none;border:1px solid #d2d2d7;border-radius:12px;padding:11px 16px;font-weight:600;background:#fff}
.row{display:flex;flex-wrap:wrap;gap:10px}label{display:block;font-size:.9rem;margin:10px 0 4px}
input,textarea,select{width:100%;font:inherit;padding:10px 12px;border:1px solid #d2d2d7;border-radius:10px;background:#fff}
.chk{display:flex;gap:10px;align-items:flex-start;font-size:.9rem;margin-top:12px}.chk input{width:auto;margin-top:4px}
.price{font-size:1.8rem;font-weight:700}.ok{background:#e8f8ee;color:#126b35;border-radius:12px;padding:14px}
footer{text-align:center;color:var(--m);font-size:.8rem;margin-top:24px}
</style></head><body><div class="wrap">
<header><div class="logo">YSN</div><div><b>YSNSOFT</b><div class="mut">Websites für lokale Betriebe</div></div></header>
${body}
<footer>YSNSOFT · Diese Seite ist nur über Ihren persönlichen Link erreichbar.</footer>
</div></body></html>`;
  return new Response(html, { status, headers: { ...PUBLIC_HEADERS, 'Content-Type': 'text/html; charset=utf-8' } });
}

export const notFound = () => page('Nicht gefunden', `<div class="card"><h1>Seite nicht gefunden</h1><p class="mut">Unter dieser Adresse gibt es keine Seite. Bitte prüfen Sie den Link.</p></div>`, 404);

/** HTML formundan gelen gövde (application/x-www-form-urlencoded). */
export async function formBody(request: Request): Promise<URLSearchParams> {
  const text = (await request.text()).slice(0, 20_000);
  return new URLSearchParams(text);
}
