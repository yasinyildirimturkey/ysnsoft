/**
 * Otomatik kalite testi: bir otelin soru listesini GERÇEK modelle çalıştırır ve cevapları denetler.
 *
 *   npm run eval -- pati-koy            tüm sorular
 *   npm run eval -- pati-koy fiyat      kimliğinde "fiyat" geçen sorular
 *
 * Her çalıştırma model API'sine istek atar, yani ücretlidir (soru başına birkaç istek).
 * Bilgi bankası, sistem promptu ya da model değiştiğinde çalıştırın.
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { runChatTurn, type ChatEvent } from "../chat/engine.js";
import { limitsFromEnv, loadEnv } from "../config/env.js";
import { loadHotels } from "../config/hotel.js";
import { AnthropicLlm } from "../llm/anthropic.js";
import { createPmsClient } from "../pms/index.js";
import { Store } from "../store/store.js";

const CaseSchema = z.object({
  id: z.string(),
  /** Bu sorunun neyi sınadığı; raporda görünür. */
  about: z.string(),
  language: z.string().default("tr"),
  channel: z.enum(["web", "whatsapp"]).default("web"),
  /** Misafirin sırayla yazdığı mesajlar. Denetimler son cevaba (ve tüm konuşmadaki araçlara) uygulanır. */
  turns: z.array(z.string()).min(1),
  expect: z
    .object({
      /** Konuşma boyunca çağrılmış olması gereken araçlar. */
      tools: z.array(z.string()).default([]),
      /** Çağrılmamış olması gereken araçlar. */
      noTools: z.array(z.string()).default([]),
      /** Son cevapta hepsi eşleşmesi gereken düzenli ifadeler (büyük-küçük harf duyarsız). */
      match: z.array(z.string()).default([]),
      /** Son cevapta hiçbiri eşleşmemesi gereken düzenli ifadeler. */
      notMatch: z.array(z.string()).default([]),
      /** Son cevapta para tutarı geçmemeli (fiyat uydurma denetimi). */
      noPrice: z.boolean().default(false),
      /** Bu sorgunun PMS'teki fiyatı cevaplardan birinde aynen geçmeli. */
      price: z
        .object({
          checkIn: z.string(),
          checkOut: z.string(),
          adults: z.number(),
          childAges: z.array(z.number()).default([]),
          roomTypeId: z.string(),
          refundable: z.boolean(),
        })
        .optional(),
      handoff: z.boolean().optional(),
      unanswered: z.boolean().optional(),
    })
    .default({ tools: [], noTools: [], match: [], notMatch: [], noPrice: false }),
});
type EvalCase = z.infer<typeof CaseSchema>;

const MONEY = /\d[\d.,\s]*\s?(TL|TRY|₺|lira)/i;
/** 15000 → "15.000", "15,000", "15 000" ve "15000" yazımlarının hepsini kabul eder. */
const amountPattern = (n: number) => new RegExp(`(?<![\\d.,])${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "[.,\\s ]?")}(?![\\d])`);

const [hotelId, filter] = process.argv.slice(2);
if (!hotelId) {
  console.error("Kullanım: npm run eval -- <otel-id> [kimlik-filtresi]");
  process.exit(2);
}

const env = loadEnv();
if (env.LLM_MODE !== "anthropic") {
  console.error("Kalite testi gerçek modelle çalışır; LLM_MODE=anthropic olmalı.");
  process.exit(2);
}
const hotel = loadHotels(path.resolve(env.HOTELS_DIR)).get(hotelId);
if (!hotel) {
  console.error(`Otel bulunamadı: ${hotelId}`);
  process.exit(2);
}
const file = path.join(hotel.dir, "eval.json");
if (!fs.existsSync(file)) {
  console.error(`${file} yok. Soru listesini bu dosyaya yazın.`);
  process.exit(2);
}
const cases = z.array(CaseSchema).parse(JSON.parse(fs.readFileSync(file, "utf8"))).filter((c) => !filter || c.id.includes(filter));

const llm = new AnthropicLlm(env);
const pms = createPmsClient(hotel);
const limits = limitsFromEnv(env);
const store = new Store(":memory:");

interface Outcome {
  id: string;
  about: string;
  failures: string[];
  reply: string;
}

async function runCase(c: EvalCase): Promise<Outcome> {
  const failures: string[] = [];
  const tools: string[] = [];
  const replies: string[] = [];
  let handoff = false;
  const session = store.createSession(hotel!.config.id, c.channel);

  for (const message of c.turns) {
    let reply = "";
    const emit = (e: ChatEvent) => {
      if (e.type === "text") reply += e.delta;
      else if (e.type === "handoff_form") handoff = true;
      else if (e.type === "notice") failures.push(`asistan bildirim döndü: ${e.code}`);
    };
    await runChatTurn(
      { llm, store, limits, pmsFor: () => pms, log: () => undefined },
      { hotel: hotel!, session: store.getSession(session.id, hotel!.config.id)!, text: message, language: c.language, showsOfferCards: c.channel === "web", emit },
    );
    replies.push(reply);
  }
  // Çağrılan araçlar kayıtlı konuşmadan okunur (ücretsiz araçlar dahil).
  for (const m of store.getMessages(session.id)) {
    if (m.role !== "assistant" || typeof m.content === "string") continue;
    for (const b of m.content ?? []) if (b.type === "tool_use") tools.push(b.name);
  }

  const last = replies[replies.length - 1] ?? "";
  const e = c.expect;
  if (!last.trim()) failures.push("son cevap boş");
  for (const t of e.tools) if (!tools.includes(t)) failures.push(`beklenen araç çağrılmadı: ${t}`);
  for (const t of e.noTools) if (tools.includes(t)) failures.push(`çağrılmaması gereken araç çağrıldı: ${t}`);
  for (const p of e.match) if (!new RegExp(p, "i").test(last)) failures.push(`cevapta yok: /${p}/`);
  for (const p of e.notMatch) if (new RegExp(p, "i").test(last)) failures.push(`cevapta olmamalıydı: /${p}/`);
  if (e.noPrice && MONEY.test(last)) failures.push(`cevapta para tutarı var: "${last.match(MONEY)![0].trim()}"`);
  if (e.handoff !== undefined && e.handoff !== handoff) failures.push(e.handoff ? "devir başlatılmadı" : "gereksiz devir başlatıldı");
  if (e.unanswered !== undefined) {
    const recorded = store.listEvents(hotel!.config.id, "unanswered", 1000).some((ev) => ev.sessionId === session.id);
    if (recorded !== e.unanswered) failures.push(e.unanswered ? "eksik bilgi kaydedilmedi" : "gereksiz eksik bilgi kaydı");
  }
  if (e.price) {
    const offers = await pms.searchOffers({ ...e.price, currency: hotel!.config.currency, language: c.language });
    const offer = offers.find((o) => o.roomTypeId === e.price!.roomTypeId && o.refundable === e.price!.refundable);
    if (!offer) failures.push("test hatalı: PMS bu oda/plan için teklif dönmüyor");
    else {
      const expected = offer.discountedPrice ?? offer.price;
      // Web'de fiyatlar kartlarda gösterilir; asistan yalnızca birkaçını yazabilir. Bu yüzden tüm cevaplara bakılır.
      if (!replies.some((r) => amountPattern(expected).test(r))) failures.push(`PMS fiyatı (${expected}) hiçbir cevapta geçmiyor`);
    }
  }
  return { id: c.id, about: c.about, failures, reply: last };
}

console.log(`${hotel.config.name}: ${cases.length} soru, model ${env.ANTHROPIC_MODEL}\n`);
const outcomes: Outcome[] = [];
const queue = [...cases];
await Promise.all(
  Array.from({ length: 3 }, async () => {
    for (let c = queue.shift(); c; c = queue.shift()) {
      const outcome = await runCase(c).catch((err: unknown) => ({
        id: c!.id,
        about: c!.about,
        failures: [`çalıştırılamadı: ${err instanceof Error ? err.message : String(err)}`],
        reply: "",
      }));
      outcomes.push(outcome);
      console.log(`${outcome.failures.length ? "✗" : "✓"} ${outcome.id}`);
    }
  }),
);

const failed = outcomes.filter((o) => o.failures.length);
console.log(`\nSonuç: ${outcomes.length - failed.length}/${outcomes.length} geçti`);
for (const o of failed) {
  console.log(`\n✗ ${o.id} — ${o.about}`);
  for (const f of o.failures) console.log(`    ${f}`);
  console.log(`    Cevap: ${o.reply.replace(/\s+/g, " ").slice(0, 400)}`);
}
const u = store.getMonthUsage(hotel.config.id);
console.log(`\nKullanım: ${u.inputTokens + u.cacheReadTokens + u.cacheWriteTokens} girdi, ${u.outputTokens} çıktı token (${u.turns} model çağrısı)`);
process.exit(failed.length ? 1 : 0);
