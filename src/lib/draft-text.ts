/**
 * Demo sayfasının (WebScout'un ürettiği tek HTML) metin düğümleri: müşteri metin düzeltmesi için
 * okunur ve onaylanan düzeltme aynı düğümlere yazılır. <script>/<style>/yorumlar ve etiketler atlanır.
 */
export interface Segment { raw: string; text: string; isText: boolean }

const TOKEN_RE = /(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->|<[^>]*>)|([^<]+)/gi;
const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export const decode = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
  if (e[0] === '#') {
    const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
  }
  return ENT[e.toLowerCase()] ?? m;
});
const encode = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function segments(html: string): Segment[] {
  const out: Segment[] = [];
  for (const m of html.matchAll(TOKEN_RE)) {
    if (m[1] !== undefined) out.push({ raw: m[1], text: '', isText: false });
    else out.push({ raw: m[2], text: decode(m[2]).replace(/\s+/g, ' ').trim(), isText: true });
  }
  return out;
}

/** Müşteriye düzenlemesi için gösterilecek metinler: gövdedeki, harf içeren, en az 3 sözcüklü; tekrar edenler bir kez. */
export function editableTexts(html: string, limit = 60): string[] {
  // Gövde; "Entwurf" şeridi ve Vorher/Nachher karşılaştırması (bizim satış notumuz, sitenin parçası değil) hariç
  const body = html.slice(Math.max(0, html.search(/<body\b/i)))
    .replace(/<div class="draft">[\s\S]*?<\/div>/i, '')
    .replace(/<section id="vorher-nachher"[\s\S]*?<\/section>/i, '');
  const seen = new Set<string>();
  const list: string[] = [];
  for (const s of segments(body)) {
    const words = s.text.split(' ').filter((w) => /\p{L}/u.test(w)).length;
    if (!s.isText || words < 3 || /vorher|nachher/i.test(s.text) || seen.has(s.text)) continue;
    seen.add(s.text);
    list.push(s.text);
    if (list.length >= limit) break;
  }
  return list;
}

/** Düzeltmeleri uygular: metni tam eşleşen her düğüm değişir (boşluklar korunur). Değişen düğüm sayısını döner. */
export function applyChanges(html: string, changes: { from: string; to: string }[]): { html: string; replaced: number } {
  const map = new Map(changes.filter((c) => c.from && c.to && c.from !== c.to).map((c) => [c.from, c.to]));
  let replaced = 0;
  const out = segments(html).map((s) => {
    if (!s.isText || !map.has(s.text)) return s.raw;
    replaced++;
    const lead = s.raw.match(/^\s*/)?.[0] ?? '';
    const trail = s.raw.match(/\s*$/)?.[0] ?? '';
    return `${lead}${encode(map.get(s.text)!)}${trail}`;
  }).join('');
  return { html: out, replaced };
}
