import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/admin-auth';
import { notify } from '@/lib/notifications';
import { checkDns, cleanLegal, gate, legalOf, normalizeDomain, publishConfig, publishedOf, removePublished, saveLegal, savePublished } from '@/lib/publish';
import { runWebscout } from '@/lib/webscout';

/**
 * Tek tıkla yayın (kazanılan müşteri): GET ?id= durum · POST action=ping|dns|check|publish|unpublish.
 * Yayın şartları: sunucu ayarlı, alan adı ve www sunucunun IP'sini gösteriyor, Impressum + Datenschutz dolu,
 * sayfada yer tutucu yok, müşteri onayı işaretli.
 */
const NO_STORE = { 'Cache-Control': 'no-store' };
const fail = (error: string, status = 400, extra: Record<string, unknown> = {}) => NextResponse.json({ success: false, error, ...extra }, { status, headers: NO_STORE });
const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');

interface Pack { dir: string; files: string[]; problems: string[]; notes: string[] }

async function prospect(id: number) {
  const res = await runWebscout<{ rows?: { id: number; name: string; status: string }[] }>(['query', '--id', String(id), '--min-score', '0', '--limit', '1']);
  return res.rows?.[0] ?? null;
}

export async function GET(request: Request) {
  const denied = requireRole(request, 'prospects', 'read');
  if (denied) return denied;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return fail('Geçersiz istek.');
  const c = publishConfig();
  return NextResponse.json({ success: true, configured: c.configured, ip: c.ip, published: publishedOf(id), legal: legalOf(id) }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const denied = requireRole(request, 'prospects', 'write');
  if (denied) return denied;
  let b: { action?: unknown; id?: unknown; domain?: unknown; legal?: Record<string, unknown>; confirm?: unknown } = {};
  try { b = await request.json(); } catch { /* aşağıda reddedilir */ }
  const c = publishConfig();

  if (b.action === 'ping') {
    if (!c.configured) return fail('Yayın sunucusu ayarlı değil (PUBLISH_HOST / PUBLISH_KEY).');
    const r = await gate('ping', undefined, 30_000);
    return r.ok && r.out.includes('pong') ? NextResponse.json({ success: true }, { headers: NO_STORE }) : fail(`Bağlantı olmadı: ${r.out}`);
  }

  const id = Number(b.id);
  if (!Number.isInteger(id) || id <= 0) return fail('Geçersiz aday.');
  const p = await prospect(id);
  if (!p) return fail('Aday bulunamadı.', 404);
  if (p.status !== 'won') return fail('Yayın yalnız kazanılan müşteri için.');

  if (b.action === 'unpublish') {
    const pub = publishedOf(id);
    if (!pub) return fail('Bu müşterinin yayında sitesi yok.');
    if (!c.configured) return fail('Yayın sunucusu ayarlı değil.');
    const r = await gate(`unpublish ${pub.domain}`);
    if (!r.ok) return fail(`Kaldırılamadı: ${r.out}`);
    removePublished(id);
    return NextResponse.json({ success: true }, { headers: NO_STORE });
  }

  const domain = normalizeDomain(String(b.domain ?? ''));
  if (b.action === 'dns') {
    if (!domain) return fail('Geçersiz alan adı.');
    return NextResponse.json({ success: true, domain, dns: await checkDns(domain) }, { headers: NO_STORE });
  }

  if (b.action === 'check' || b.action === 'publish') {
    const legal = cleanLegal(b.legal);
    saveLegal(id, legal);
    const pack = await runWebscout<Pack>(['publish-pack', '--id', String(id), '--legal-b64', b64(JSON.stringify(legal))]);
    if (b.action === 'check') return NextResponse.json({ success: true, problems: pack.problems, notes: pack.notes, files: pack.files }, { headers: NO_STORE });

    // Yayın
    if (!c.configured) return fail('Yayın sunucusu ayarlı değil (PUBLISH_HOST / PUBLISH_KEY).');
    if (!domain) return fail('Geçersiz alan adı.');
    if (pack.problems.length) return fail('Yayından önce düzeltilmesi gerekenler var.', 400, { problems: pack.problems });
    if (b.confirm !== true) return fail('Müşteri onayı işaretlenmeli.');
    const d = await checkDns(domain);
    if (!d.apexOk || !d.wwwOk) return fail(`Alan adı henüz sunucuyu göstermiyor (${domain}: ${d.apex.join(', ') || 'kayıt yok'}; www: ${d.www.join(', ') || 'kayıt yok'}; olması gereken ${d.ip}).`, 400, { dns: d });
    const r = await gate(`publish ${domain}`, pack.dir, 180_000);
    if (!r.ok || !r.out.includes(`OK ${domain}`)) return fail(`Yükleme olmadı: ${r.out}`, 502);
    const who = getAdminSession(request);
    savePublished({ prospectId: id, domain, at: new Date().toISOString(), by: who?.name || who?.email || '' });
    // Aylık rapor ve panel artık yeni siteyi ölçer
    await runWebscout(['prospect-set', '--id', String(id), '--website-b64', b64(`https://${domain}/`)]).catch(() => {});
    void notify({ kind: 'published', title: 'Site yayında 🚀', body: `${p.name}: https://${domain}`, url: `/admin/adaylar/${id}` }).catch(() => {});
    return NextResponse.json({ success: true, url: `https://${domain}/`, notes: pack.notes }, { headers: NO_STORE });
  }
  return fail('Geçersiz işlem.');
}
