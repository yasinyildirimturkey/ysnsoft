#!/usr/bin/env node
/**
 * YAPAY ZEKÂ GÖRÜNÜRLÜK İZLEYİCİSİ (11.10.2026, GEO)
 *
 * Avukatların ChatGPT, Gemini, Perplexity, Grok ve Claude'a sorduğu soruları (sorular.json) web aramalı
 * modlarda sorar; KGLEX'in yanıtta geçip geçmediğini, kaçıncı sırada anıldığını, kglex.com'un kaynak
 * olarak gösterilip gösterilmediğini ve rakiplerin anılma sayısını kaydeder.
 *
 *   node izle.mjs                → tüm sağlayıcılar (anahtarı .env'de olanlar)
 *   node izle.mjs openai claude  → yalnız seçilenler
 *
 * Çıktı: raporlar/<tarih>.json (ham yanıtlar), raporlar/<tarih>.md (özet + önceki çalıştırmayla fark),
 * raporlar/gecmis.csv (her satır bir soru×sağlayıcı; Excel'de eğilim grafiği için).
 * Not: API yanıtı tüketici uygulamasıyla birebir aynı değildir (kişiselleştirme, bölge); eğilimi ölçer.
 * Google'ın "AI Bakışı"nın API'si yok; onu Search Console + elle arama izler.
 */
import { readFileSync, writeFileSync, existsSync, appendFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = dirname(fileURLToPath(import.meta.url));
const RAPOR = join(KOK, 'raporlar');
mkdirSync(RAPOR, { recursive: true });

// .env (bağımlılıksız okuyucu)
if (existsSync(join(KOK, '.env'))) {
  for (const satir of readFileSync(join(KOK, '.env'), 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(satir);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const env = (ad, varsayilan) => process.env[ad] || varsayilan;
const PROJE = (process.argv.find((a) => a.startsWith('--proje=')) || '').slice('--proje='.length) || 'kglex';
const DIL = (process.argv.find((a) => a.startsWith('--dil=')) || '').slice('--dil='.length) || 'tr';
let dosyaAdi;
if (DIL !== 'tr') {
  dosyaAdi = `sorular-${PROJE}-${DIL}.json`;
} else {
  dosyaAdi = PROJE === 'kglex' ? 'sorular.json' : `sorular-${PROJE}.json`;
}
const dosyaYolu = join(KOK, dosyaAdi);
if (!existsSync(dosyaYolu)) { console.error(`Soru dosyası bulunamadı: ${dosyaAdi}`); process.exit(1); }
const SORU_DOSYASI = JSON.parse(readFileSync(dosyaYolu, 'utf8'));
const { marka, rakipler } = SORU_DOSYASI;
// (14.11.2026) Soru kümesi: varsayılan genel sorular (24.10'dan beri eğilim bunlarla ölçülür, DEĞİŞTİRİLMEZ);
// `--kume=ozellik` özellik sorularını (sorular.json → ozellikSorulari) AYRI rapora ve AYRI geçmişe yazar (<tarih>-ozellik.*, gecmis-ozellik.csv).
const KUME = (process.argv.find((a) => a.startsWith('--kume=')) || '').slice('--kume='.length) || 'genel';
const sorular = KUME === 'ozellik' ? (SORU_DOSYASI.ozellikSorulari || []) : SORU_DOSYASI.sorular;
const projeEki = PROJE === 'kglex' ? '' : `-${PROJE}`;
const dilEki = DIL === 'tr' ? '' : `-${DIL}`;
const kumeEki = KUME === 'genel' ? '' : `-${KUME}`;
const EK = `${projeEki}${dilEki}${kumeEki}`;
if (!sorular.length) { console.error(`"${KUME}" kümesinde soru yok (${dosyaAdi}).`); process.exit(1); }

async function postJson(url, govde, basliklar) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...basliklar }, body: JSON.stringify(govde), signal: AbortSignal.timeout(180_000) });
  const metin = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${metin.slice(0, 300)}`);
  return JSON.parse(metin);
}

// OpenAI Responses biçimi (OpenAI + xAI ortak): output[].content[].text + url_citation açıklamaları
function responsesAyikla(d) {
  const metin = []; const kaynak = [];
  for (const o of d.output || []) for (const c of o.content || []) {
    if (c.text) metin.push(c.text);
    for (const a of c.annotations || []) if (a.url) kaynak.push(a.url);
  }
  for (const c of d.citations || []) kaynak.push(typeof c === 'string' ? c : c.url);
  return { metin: metin.join('\n') || d.output_text || '', kaynaklar: kaynak };
}

const SAGLAYICILAR = {
  openai: {
    anahtar: 'OPENAI_API_KEY', model: () => env('OPENAI_MODEL', 'gpt-5-mini'),
    sor: async (soru, model) => responsesAyikla(await postJson('https://api.openai.com/v1/responses',
      { model, input: soru, tools: [{ type: 'web_search' }] },
      { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` })),
  },
  gemini: {
    // (24.10.2026) 2.5 yeni anahtarlara kapandı. Ücretsiz katmanda Google Search kotası 0 → 429 gelirse aramasız sorulur (raporda işaretlenir).
    anahtar: 'GEMINI_API_KEY', model: () => env('GEMINI_MODEL', 'gemini-3.8-flash'),
    sor: async (soru, model) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const basliklar = { 'x-goog-api-key': process.env.GEMINI_API_KEY };
      let d; let not;
      try {
        d = await postJson(url, { contents: [{ parts: [{ text: soru }] }], tools: [{ google_search: {} }] }, basliklar);
      } catch (e) {
        if (!e.message.startsWith('HTTP 429')) throw e;
        d = await postJson(url, { contents: [{ parts: [{ text: soru }] }] }, basliklar);
        not = 'aramasız: Google Search kotası yok (faturalandırma açılınca aramalı sorulur)';
      }
      const aday = d.candidates?.[0] || {};
      return {
        metin: (aday.content?.parts || []).map((p) => p.text || '').join('\n'),
        kaynaklar: (aday.groundingMetadata?.groundingChunks || []).map((c) => [c.web?.uri, c.web?.title].filter(Boolean).join(' ')),
        not,
      };
    },
  },
  perplexity: {
    // (24.10.2026) Sonar → Agent API: /chat/completions 403 döner; model yerine "effort" (sonar = fast).
    // Raporda model sütununa effort yazılır. Yanıt: output[] içinde type=message (metin) ve type=search_results (kaynak).
    anahtar: 'PERPLEXITY_API_KEY', model: () => env('PERPLEXITY_EFFORT', 'fast'),
    sor: async (soru, effort) => {
      const d = await postJson('https://api.perplexity.ai/v1/agent',
        { effort, input: soru },
        { Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}` });
      const metin = []; const kaynak = [];
      for (const o of d.output || []) {
        if (o.type === 'message') for (const c of o.content || []) if (c.text) metin.push(c.text);
        if (o.type === 'search_results') for (const r of o.results || []) if (r.url) kaynak.push(r.url);
      }
      return { metin: metin.join('\n') || d.output_text || '', kaynaklar: kaynak };
    },
  },
  grok: {
    anahtar: 'XAI_API_KEY', model: () => env('XAI_MODEL', 'grok-4'),
    sor: async (soru, model) => {
      const basliklar = { Authorization: `Bearer ${process.env.XAI_API_KEY}` };
      try {
        return responsesAyikla(await postJson('https://api.x.ai/v1/responses', { model, input: soru, tools: [{ type: 'web_search' }, { type: 'x_search' }] }, basliklar));
      } catch (e) { // aramalı uç desteklenmiyorsa aramasız sohbete düş (raporda işaretlenir)
        const d = await postJson('https://api.x.ai/v1/chat/completions', { model, messages: [{ role: 'user', content: soru }] }, basliklar);
        return { metin: d.choices?.[0]?.message?.content || '', kaynaklar: d.citations || [], not: `aramasız: ${e.message.slice(0, 80)}` };
      }
    },
  },
  claude: {
    anahtar: 'ANTHROPIC_API_KEY', model: () => env('ANTHROPIC_MODEL', 'claude-sonnet-5-5'),
    sor: async (soru, model) => {
      const d = await postJson('https://api.anthropic.com/v1/messages',
        { model, max_tokens: 2000, messages: [{ role: 'user', content: soru }], tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }] },
        // Çalışma alanına bağlı olmayan anahtar "anthropic-workspace-id" başlığı ister (ANTHROPIC_WORKSPACE_ID=wrkspc_...)
        { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', ...(process.env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID } : {}) });
      const metin = []; const kaynak = [];
      for (const b of d.content || []) {
        if (b.type === 'text') { metin.push(b.text); for (const c of b.citations || []) if (c.url) kaynak.push(c.url); }
        if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) for (const r of b.content) if (r.url) kaynak.push(r.url);
      }
      return { metin: metin.join(''), kaynaklar: kaynak };
    },
  },
};

// Yanıtta bir adın ilk geçtiği konum (Türkçe büyük/küçük harf duyarsız, TAM KELİME: "Günce" ≠ "güncel")
const kucuk = (s) => s.toLocaleLowerCase('tr-TR');
const kacis = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const konum = (metin, ad) => kucuk(metin).search(new RegExp(`(?<![\\p{L}\\p{N}])${kacis(kucuk(ad))}(?![\\p{L}\\p{N}])`, 'u'));
const markaKonum = (metin) => {
  const k = [marka.desen, ...(marka.digerDesenler || [])].map((d) => konum(metin, d)).filter((x) => x >= 0);
  return k.length ? Math.min(...k) : -1;
};

function cozumle(metin, kaynaklar) {
  const anilanlar = [marka.ad, ...rakipler]
    // (28.11.2026) marka.digerDesenler: aynı markanın başka yazımları ("YSN Soft" ↔ "ysnsoft"); en erken eşleşme sayılır
    .map((ad) => ({ ad, k: ad === marka.ad ? markaKonum(metin) : konum(metin, ad) }))
    .filter((x) => x.k >= 0).sort((a, b) => a.k - b.k);
  const sira = anilanlar.findIndex((x) => x.ad === marka.ad);
  return {
    kglexGeciyor: sira >= 0,
    sira: sira >= 0 ? sira + 1 : null,
    anilanlar: anilanlar.map((x) => x.ad),
    kglexKaynak: kaynaklar.some((u) => String(u).toLowerCase().includes(marka.alanAdi)),
    kaynakSayisi: kaynaklar.length,
  };
}

const secilen = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const istenen = Object.entries(SAGLAYICILAR).filter(([ad]) => !secilen.length || secilen.includes(ad));
const aktif = istenen.filter(([, s]) => process.env[s.anahtar]);
const atlanan = istenen.filter(([, s]) => !process.env[s.anahtar]).map(([ad, s]) => `${ad} (${s.anahtar} yok)`);
if (!aktif.length) { console.error(`Sorgulanacak sağlayıcı yok. .env dosyasına anahtar ekleyin. Atlanan: ${atlanan.join(', ')}`); process.exit(1); }

// (02.11.2026) Tek çalıştırma kilidi: platform paneli ("Şimdi Ölç"), Pazartesi zamanlayıcısı ve IZLE.bat aynı kilidi görür.
// Canlı pid'li ve 3 saatten genç kilit varsa çıkılır; bayat kilit devralınır. Panel aynı dosyayı okur (kglex_back lib/ai-gorunurluk.ts).
const KILIT = join(KOK, `.izle${EK}.lock`);
const kilitAl = () => { try { writeFileSync(KILIT, JSON.stringify({ pid: process.pid, baslangic: new Date().toISOString() }), { flag: 'wx' }); return true; } catch { return false; } };
if (!kilitAl()) {
  let k = {};
  try { k = JSON.parse(readFileSync(KILIT, 'utf8')); } catch { /* yarım yazılmış */ }
  let yasiyor = false;
  try { process.kill(Number(k.pid), 0); yasiyor = true; } catch (e) { yasiyor = e?.code === 'EPERM'; }
  if (yasiyor && Date.now() - new Date(k.baslangic).getTime() < 3 * 3600_000) { console.log(`Ölçüm zaten sürüyor (pid ${k.pid}, ${k.baslangic}); çıkıldı.`); process.exit(0); }
  rmSync(KILIT, { force: true });
  if (!kilitAl()) { console.log('Kilit alınamadı (aynı anda başka çalıştırma); çıkıldı.'); process.exit(0); }
}
process.on('exit', () => { try { if (JSON.parse(readFileSync(KILIT, 'utf8')).pid === process.pid) rmSync(KILIT, { force: true }); } catch { /* yok */ } });

const tarih = new Date().toISOString().slice(0, 10);
const sonuclar = [];
for (const [ad, s] of aktif) {
  const model = s.model();
  for (let i = 0; i < sorular.length; i++) {
    const soru = sorular[i];
    process.stdout.write(`${ad} #${i + 1} … `);
    try {
      const { metin, kaynaklar, not } = await s.sor(soru, model);
      const c = cozumle(metin, kaynaklar);
      // Marka sorunun içinde geçiyorsa ("KGLEX nedir?") cevapta adın geçmesi bir şey kanıtlamaz (model "bulamadım" da
      // diyebilir): bu sorularda yalnız kglex.com kaynak gösterildiyse "anıldı" sayılır.
      if (konum(soru, marka.desen) >= 0 && !c.kglexKaynak) { c.kglexGeciyor = false; c.sira = null; }
      sonuclar.push({ saglayici: ad, model, soruNo: i + 1, soru, ...c, not, metin, kaynaklar });
      console.log(c.kglexGeciyor ? `${marka.ad} ✓ (${c.sira}. sırada${c.kglexKaynak ? ', kaynak' : ''})` : `${marka.ad} yok [${c.anilanlar.join(', ') || '-'}]`);
    } catch (e) {
      sonuclar.push({ saglayici: ad, model, soruNo: i + 1, soru, hata: e.message });
      console.log(`HATA ${e.message.slice(0, 120)}`);
    }
  }
}

// Önceki çalıştırma (fark için)
const oncekiDosya = readdirSync(RAPOR).filter((f) => new RegExp(`^\\d{4}-\\d{2}-\\d{2}${EK}\\.json$`).test(f) && f !== `${tarih}${EK}.json`).sort().pop();
const onceki = oncekiDosya ? JSON.parse(readFileSync(join(RAPOR, oncekiDosya), 'utf8')) : null;
const oncekiBul = (s) => onceki?.sonuclar.find((o) => o.saglayici === s.saglayici && o.soru === s.soru);

// Aynı gün başka sağlayıcılarla da çalıştırıldıysa birleştir (yalnız şimdi sorulan sağlayıcıların satırları yenilenir).
const bugunDosya = join(RAPOR, `${tarih}${EK}.json`);
if (existsSync(bugunDosya)) {
  const simdiki = new Set(aktif.map(([ad]) => ad));
  const eski = JSON.parse(readFileSync(bugunDosya, 'utf8')).sonuclar.filter((s) => !simdiki.has(s.saglayici));
  sonuclar.unshift(...eski);
  for (const ad of new Set(eski.map((s) => s.saglayici))) if (!aktif.some(([a]) => a === ad)) aktif.push([ad, SAGLAYICILAR[ad]]);
}
writeFileSync(bugunDosya, JSON.stringify({ tarih, sonuclar }, null, 2));

const csv = join(RAPOR, `gecmis${EK}.csv`);
if (!existsSync(csv)) writeFileSync(csv, `﻿tarih;saglayici;model;soru_no;${marka.desen}_geciyor;sira;${marka.desen}_kaynak;anilanlar;hata\n`);
for (const s of sonuclar) {
  appendFileSync(csv, [tarih, s.saglayici, s.model, s.soruNo, s.hata ? '' : s.kglexGeciyor ? 1 : 0, s.sira ?? '', s.kglexKaynak ? 1 : 0, (s.anilanlar || []).join('|'), s.hata ? 'HATA' : ''].join(';') + '\n');
}

// Markdown özet
const gecerli = sonuclar.filter((s) => !s.hata);
const oran = (liste) => (liste.length ? `${liste.filter((s) => s.kglexGeciyor).length}/${liste.length}` : '-');
const anilmaSayimi = {};
for (const s of gecerli) for (const a of s.anilanlar) anilmaSayimi[a] = (anilmaSayimi[a] || 0) + 1;
const md = [
  `# Yapay zekâ görünürlük raporu — ${marka.ad} — ${tarih}${KUME === 'genel' ? '' : ` (${KUME} soruları)`}`, '',
  `${marka.ad} anılma: **${oran(gecerli)}** yanıt${onceki ? ` (önceki ${onceki.tarih}: ${oran(onceki.sonuclar.filter((s) => !s.hata))})` : ''}`,
  atlanan.length ? `Atlanan: ${atlanan.join(', ')}` : '', '',
  '## Sağlayıcı bazında', '', `| Sağlayıcı | Model | ${marka.ad} anıldı | ${marka.alanAdi} kaynak |`, '|---|---|---|---|',
  ...aktif.map(([ad]) => { const l = gecerli.filter((s) => s.saglayici === ad); return `| ${ad} | ${l[0]?.model || '-'} | ${oran(l)} | ${l.filter((s) => s.kglexKaynak).length} |`; }),
  '', '## Kim anılıyor (yanıt sayısı)', '', ...Object.entries(anilmaSayimi).sort((a, b) => b[1] - a[1]).map(([a, n]) => `- ${a}: ${n}`),
  '', '## Soru bazında', '', `| # | Soru | Sağlayıcı | ${marka.ad} | Değişim | Anılanlar |`, '|---|---|---|---|---|---|',
  ...sonuclar.map((s) => {
    const o = oncekiBul(s);
    const simdi = s.hata ? 'HATA' : s.kglexGeciyor ? `✓ ${s.sira}.` : '—';
    const fark = !o || o.hata || s.hata || o.kglexGeciyor === s.kglexGeciyor ? '' : s.kglexGeciyor ? '🟢 yeni' : '🔴 düştü';
    return `| ${s.soruNo} | ${s.soru.slice(0, 60)} | ${s.saglayici} | ${simdi} | ${fark} | ${(s.anilanlar || []).join(', ')}${s.not ? ` (${s.not})` : ''} |`;
  }),
  '', `Ham yanıtlar: raporlar/${tarih}${EK}.json`,
].join('\n');
writeFileSync(join(RAPOR, `${tarih}${EK}.md`), md);
console.log(`\n${marka.ad} anılma: ${oran(gecerli)} — rapor: ${join(RAPOR, `${tarih}${EK}.md`)}`);
