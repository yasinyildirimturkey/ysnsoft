// Demonun Türkçe sürümü: Almanca demo sayfasının (index.html) metinleri ücretsiz GLM modeliyle çevrilir,
// aynı düzen ve görsellerle index.tr.html yazılır. Almanca sayfa değişmez; işletme sahibine Türkçe gösterim içindir.
// İşletme adı, adres, telefon, fiyat ve saatler korunur (modele böyle söylenir; sayı içeren kısa metinler hiç gönderilmez).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR } from './db.js';
import { llmJson } from './llm.js';

const TOKEN_RE = /(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->|<[^>]*>)|([^<]+)/gi;
const ATTR_RE = /\s(placeholder|aria-label|title)="([^"]*)"/g;
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') {
    const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
  }
  return ENT[e.toLowerCase()] ?? m;
});
const norm = (s) => decode(s).replace(/\s+/g, ' ').trim();
const encText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const encAttr = (s) => encText(s).replace(/"/g, '&quot;');
// Çevrilecek mi: harf içermeli; yalnız sayı/saat/telefon gibi kısa şeyler gönderilmez
const worth = (t) => /\p{L}{2}/u.test(t) && !(t.length < 24 && /\d/.test(t) && !/\p{L}{4}/u.test(t));

const SYSTEM = `Du übersetzt Texte einer deutschen Firmen-Website ins Türkische.
Regeln: Firmennamen, Personennamen, Straßen, Orte, Telefonnummern, E-Mail-Adressen, Preise, Uhrzeiten und Markennamen unverändert lassen.
Natürliches, höfliches Türkisch (Sie-Form → "siz"). Kurze Menüpunkte kurz übersetzen. Nichts hinzufügen, nichts weglassen.
Begriffe: unverbindlich = bağlayıcı olmayan, Entwurf = taslak, Gestaltungsvorschlag = tasarım önerisi, Platzhalter = örnek metin, Termin = randevu, Anfrage = talep.
Die Eingabe ist ein JSON-Objekt mit Nummern als Schlüssel. Antworte NUR mit einem JSON-Objekt mit denselben Schlüsseln und den türkischen Texten als Werte.`;

/** Parça çevirisi: { "1": "...", "2": "..." } → aynı anahtarlar. Eksik anahtar varsa o metin Almanca kalır. */
async function translateBatch(list) {
  const input = Object.fromEntries(list.map((t, i) => [String(i + 1), t]));
  const { json } = await llmJson(SYSTEM, JSON.stringify(input), { maxTokens: 4000 });
  const out = list.map((_, i) => {
    const v = json?.[String(i + 1)];
    return typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim().slice(0, 2000) : null;
  });
  return out.filter(Boolean).length >= Math.ceil(list.length / 2) ? out : null;
}

/** Arka plan işinin durumu (panel okur): tools/webscout/data/drafts/<token>/tr-status.json */
const status = (dir, s) => { try { writeFileSync(join(dir, 'tr-status.json'), JSON.stringify({ ...s, at: new Date().toISOString() }), 'utf8'); } catch { /* önemsiz */ } };

export async function translateDraft(db, id) {
  const d = db.prepare('SELECT token FROM drafts WHERE business_id=?').get(id);
  if (!d?.token) throw new Error('Bu adayın taslağı yok; önce taslak üretin.');
  const dir = join(DATA_DIR, 'drafts', d.token);
  const file = join(dir, 'index.html');
  if (!existsSync(file)) throw new Error('Taslak dosyası yok.');
  const html = readFileSync(file, 'utf8');

  // 1) Çevrilecek benzersiz metinler (metin düğümleri + placeholder/aria-label/title)
  const texts = new Set();
  for (const m of html.matchAll(TOKEN_RE)) {
    if (m[2] !== undefined) { const t = norm(m[2]); if (worth(t)) texts.add(t); }
    else if (m[1][1] !== '!' && !/^<(script|style)/i.test(m[1])) for (const a of m[1].matchAll(ATTR_RE)) { const t = norm(a[2]); if (worth(t)) texts.add(t); }
  }
  const all = [...texts].slice(0, 400);

  // 2) Parça parça çeviri. Ücretsiz model yoğunken 429 döner: artan beklemeyle 4 kez denenir; olmazsa o parça Almanca kalır
  const map = new Map();
  let failed = 0;
  let lastError = null;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tryBatch = (chunk) => translateBatch(chunk).then((r) => { if (!r) lastError = 'eksik ya da bozuk yanıt'; return r; }, (e) => { lastError = e.message; return null; });
  const SIZE = 20;
  status(dir, { state: 'running', done: 0, total: all.length });
  for (let i = 0; i < all.length; i += SIZE) {
    const chunk = all.slice(i, i + SIZE);
    let tr = null;
    for (let attempt = 0; attempt < 4 && !tr; attempt++) {
      if (attempt) await sleep(4000 * attempt);
      tr = await tryBatch(chunk);
    }
    if (!tr) failed += chunk.length;
    else chunk.forEach((t, j) => { if (tr[j]) map.set(t, tr[j]); else failed++; });
    status(dir, { state: 'running', done: Math.min(all.length, i + SIZE), total: all.length });
    await sleep(1500);
  }
  if (!map.size) {
    status(dir, { state: 'error', error: lastError ?? 'model yanıt vermedi' });
    throw new Error(`Çeviri yapılamadı: ${lastError ?? 'model yanıt vermedi'}`);
  }

  // 3) Aynı düzende Türkçe sayfa
  const out = html.replace(TOKEN_RE, (whole, tag, text) => {
    if (text !== undefined) {
      const t = norm(text);
      if (!map.has(t)) return whole;
      return `${text.match(/^\s*/)[0]}${encText(map.get(t))}${text.match(/\s*$/)[0]}`;
    }
    if (tag[1] === '!' || /^<(script|style)/i.test(tag)) return whole;
    return tag.replace(ATTR_RE, (a, name, val) => (map.has(norm(val)) ? ` ${name}="${encAttr(map.get(norm(val)))}"` : a));
  }).replace(/<html lang="de"/i, '<html lang="tr"');
  writeFileSync(join(dir, 'index.tr.html'), out, 'utf8');
  status(dir, { state: 'done', translated: map.size, failed, total: all.length });
  return { token: d.token, translated: map.size, failed, total: all.length, ...(failed ? { lastError } : {}) };
}
