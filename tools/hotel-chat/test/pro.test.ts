import { createHmac } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import type { WebDeps } from "../src/channels/web/routes.js";
import { parseIncoming, verifySignature } from "../src/channels/whatsapp/routes.js";
import { runChatTurn, type ChatEvent } from "../src/chat/engine.js";
import { RateLimiter } from "../src/guard/rate-limit.js";
import type { Mail } from "../src/handoff/mailer.js";
import type { Llm } from "../src/llm/types.js";
import { Alerter } from "../src/ops/alerter.js";
import { MockPmsClient } from "../src/pms/mock.js";
import type { PmsClient } from "../src/pms/types.js";
import { Store } from "../src/store/store.js";
import { executeTool, teamAvailable, type ToolContext } from "../src/tools/index.js";
import { LIMITS, ScriptedLlm, testHotel, text, toolCall, toolResultsOf } from "./helpers.js";

const NOW = new Date("2027-03-01T09:00:00Z"); // İstanbul 12:00
const stay = { giris_tarihi: "2027-03-10", cikis_tarihi: "2027-03-12", yetiskin_sayisi: 2, cocuk_yaslari: [] as number[] };

let store: Store;
let sent: Mail[];
beforeEach(() => {
  store = new Store(":memory:");
  sent = [];
});
afterEach(() => store.close());

function toolCtx(over: Partial<ToolContext> = {}): ToolContext {
  return {
    hotel: testHotel().config,
    pms: new MockPmsClient(),
    today: "2027-03-01",
    now: NOW,
    language: "tr",
    channel: "web",
    showsOfferCards: false,
    requestHandoff: vi.fn(),
    showOffers: vi.fn(),
    record: vi.fn(),
    log: vi.fn(),
    ...over,
  };
}

describe("alternatif tarih önerisi", () => {
  it("müsaitlik yoksa yakın tarihleri en düşük fiyatıyla döner", async () => {
    // Sahte PMS'te ayın 13'ünde giriş için müsaitlik yoktur.
    const r = await executeTool("musaitlik_sorgula", { ...stay, giris_tarihi: "2027-03-13", cikis_tarihi: "2027-03-15" }, toolCtx());
    const data = JSON.parse(r.content);
    expect(data.available).toBe(false);
    expect(data.alternatives.map((a: { checkIn: string }) => a.checkIn)).toEqual(["2027-03-14", "2027-03-12"]);
    const direct = await new MockPmsClient().searchOffers({ checkIn: "2027-03-14", checkOut: "2027-03-16", adults: 2, childAges: [], currency: "TRY", language: "tr" });
    expect(data.alternatives[0].fromPrice).toBe(Math.min(...direct.map((o) => o.discountedPrice ?? o.price)));
  });

  it("geçmişe düşen alternatifi önermez", async () => {
    const pms: PmsClient = { searchOffers: vi.fn(async (q) => (q.checkIn === "2027-03-01" ? [] : new MockPmsClient().searchOffers(q))) };
    const r = await executeTool("musaitlik_sorgula", { ...stay, giris_tarihi: "2027-03-01", cikis_tarihi: "2027-03-02" }, toolCtx({ pms }));
    const checkIns = JSON.parse(r.content).alternatives.map((a: { checkIn: string }) => a.checkIn);
    expect(checkIns).toEqual(["2027-03-02", "2027-03-03"]);
  });

  it("alternatif araması hata verirse asıl sonucu yine de döner", async () => {
    let calls = 0;
    const pms: PmsClient = {
      searchOffers: async () => {
        if (calls++ === 0) return [];
        throw new Error("boom");
      },
    };
    const r = await executeTool("musaitlik_sorgula", stay, toolCtx({ pms }));
    expect(r.isError).toBe(false);
    expect(JSON.parse(r.content)).toMatchObject({ available: false, alternatives: [] });
  });
});

describe("oda kartları ve olay kaydı", () => {
  it("kart gösteren kanalda teklifleri oda bazında gruplayıp yayar", async () => {
    const showOffers = vi.fn();
    const record = vi.fn();
    const r = await executeTool("musaitlik_sorgula", { ...stay, cikis_tarihi: "2027-03-13" }, toolCtx({ showsOfferCards: true, showOffers, record }));
    const payload = showOffers.mock.calls[0]![0];
    expect(payload.rooms.map((x: { roomTypeName: string }) => x.roomTypeName)).toEqual(["Standart Oda", "Deluxe Oda", "Aile Süiti"]);
    expect(payload.rooms[0].plans).toHaveLength(1);
    expect(JSON.parse(r.content).displayNote).toMatch(/cards/);
    expect(record).toHaveBeenCalledWith("availability_query", expect.objectContaining({ available: true }));
  });

  it("kart göstermeyen kanalda (WhatsApp) kart yaymaz", async () => {
    const showOffers = vi.fn();
    const r = await executeTool("musaitlik_sorgula", stay, toolCtx({ showOffers }));
    expect(showOffers).not.toHaveBeenCalled();
    expect(JSON.parse(r.content).displayNote).toBeUndefined();
  });

  it("link üretimini ve cevaplanamayan soruyu kaydeder", async () => {
    const record = vi.fn();
    await executeTool("rezervasyon_linki_uret", stay, toolCtx({ record }));
    await executeTool("bilgi_eksigi_kaydet", { soru: "Otelde spor salonu var mı?" }, toolCtx({ record }));
    expect(record).toHaveBeenCalledWith("link_created", expect.objectContaining({ url: expect.stringContaining("book.example.com") }));
    expect(record).toHaveBeenCalledWith("unanswered", { question: "Otelde spor salonu var mı?" });
  });
});

describe("mesai saatleri", () => {
  const hotel = testHotel({ handoff: { email: "r@test.example.com", hours: { open: "08:00", close: "23:00" } } }).config;
  it("otelin saat dilimine göre hesaplanır", () => {
    expect(teamAvailable(hotel, new Date("2027-03-01T09:00:00Z"))).toBe(true); // 12:00
    expect(teamAvailable(hotel, new Date("2027-03-01T21:30:00Z"))).toBe(false); // 00:30
    expect(teamAvailable(hotel, new Date("2027-03-01T04:59:00Z"))).toBe(false); // 07:59
    expect(teamAvailable(testHotel().config, new Date("2027-03-01T21:30:00Z"))).toBe(true);
  });
  it("mesai dışında devirde modele hemen dönülmeyeceğini bildirir", async () => {
    const night = await executeTool("insana_devret", { talep_ozeti: "Transfer" }, toolCtx({ hotel, now: new Date("2027-03-01T21:30:00Z") }));
    expect(night.content).toMatch(/outside its working hours \(08:00-23:00/);
    const day = await executeTool("insana_devret", { talep_ozeti: "Transfer" }, toolCtx({ hotel }));
    expect(day.content).not.toMatch(/outside/);
  });
  it("WhatsApp'ta form yerine onay düğmesini anlatır", async () => {
    const r = await executeTool("insana_devret", { talep_ozeti: "Transfer" }, toolCtx({ channel: "whatsapp" }));
    expect(JSON.parse(r.content).status).toBe("consent_prompt_sent");
  });
});

describe("kullanım ve bütçe", () => {
  const usage = { inputTokens: 100, outputTokens: 20, cacheReadTokens: 900, cacheWriteTokens: 0 };
  const run = (llm: Llm, hotel = testHotel(), alert = vi.fn()) => {
    const session = store.createSession(hotel.config.id, "web");
    const events: ChatEvent[] = [];
    return runChatTurn(
      { llm, store, limits: LIMITS, pmsFor: () => new MockPmsClient(), log: vi.fn(), alert, now: () => NOW },
      { hotel, session, text: "selam", language: "tr", emit: (e) => events.push(e) },
    ).then(() => ({ events, alert, session }));
  };

  it("her model çağrısının token kullanımını aylık toplamda biriktirir", async () => {
    await run(new ScriptedLlm([{ ...toolCall("musaitlik_sorgula", stay), usage }, { ...text("ok"), usage }]));
    expect(store.getMonthUsage("test-otel")).toMatchObject({ inputTokens: 200, outputTokens: 40, cacheReadTokens: 1800, turns: 2 });
  });

  it("aylık sınır aşıldıysa modeli çağırmaz, uyarı gönderir", async () => {
    const hotel = testHotel({ monthlyTokenLimit: 1000 });
    store.addUsage("test-otel", usage);
    const llm = new ScriptedLlm([]);
    const { events, alert } = await run(llm, hotel);
    expect(llm.requests).toHaveLength(0);
    expect(events).toEqual([expect.objectContaining({ type: "notice", code: "budget" })]);
    expect(alert).toHaveBeenCalledWith("budget_exceeded", "test-otel", expect.any(String));
  });

  it("eksik bilgi kaydı araç bütçesine sayılmaz ve olay olarak saklanır", async () => {
    const llm = new ScriptedLlm([toolCall("bilgi_eksigi_kaydet", { soru: "Spor salonu var mı?" }), text("Bu bilgiye sahip değilim.")]);
    const { session, events } = await run(llm);
    expect(store.getSession(session.id, "test-otel")!.toolCalls).toBe(0);
    expect(events.some((e) => e.type === "tool")).toBe(false);
    expect(store.listEvents("test-otel", "unanswered")[0]!.data.question).toBe("Spor salonu var mı?");
    expect(toolResultsOf(llm.requests[1]!)[0]!.isError).toBe(false);
  });

  it("PMS arızasında ve model hatasında uyarı tetikler", async () => {
    const failing = { ...stay, giris_tarihi: "2027-03-31", cikis_tarihi: "2027-04-02" };
    const a = await run(new ScriptedLlm([toolCall("musaitlik_sorgula", failing), text("Ulaşamıyorum.")]));
    expect(a.alert).toHaveBeenCalledWith("pms_error", "test-otel", expect.any(String));
    const b = await run(new ScriptedLlm([new Error("API 529")]));
    expect(b.alert).toHaveBeenCalledWith("chat_turn_failed", "test-otel", "API 529");
  });
});

describe("Alerter", () => {
  it("aynı otel ve tür için pencere başına tek e-posta gönderir", async () => {
    let now = 0;
    const mails: Mail[] = [];
    const alerter = new Alerter({ send: async (m) => void mails.push(m) }, "ops@example.com", vi.fn(), 15 * 60_000, () => now);
    alerter.alert("pms_error", "a", "x");
    alerter.alert("pms_error", "a", "y");
    alerter.alert("pms_error", "b", "z");
    alerter.alert("chat_turn_failed", "a", "w");
    now = 15 * 60_000;
    alerter.alert("pms_error", "a", "again");
    await Promise.resolve();
    expect(mails.map((m) => m.subject)).toEqual([
      "[hotel-chat uyarı] a: Rezervasyon sistemine ulaşılamıyor",
      "[hotel-chat uyarı] b: Rezervasyon sistemine ulaşılamıyor",
      "[hotel-chat uyarı] a: Asistan bir mesaja yanıt veremedi",
      "[hotel-chat uyarı] a: Rezervasyon sistemine ulaşılamıyor",
    ]);
  });
  it("adres tanımlı değilse hiçbir şey göndermez", () => {
    const send = vi.fn();
    new Alerter({ send }, undefined, vi.fn()).alert("pms_error", "a", "x");
    expect(send).not.toHaveBeenCalled();
  });
});

// --- HTTP: web tıklama takibi, panel, WhatsApp ------------------------------

const ORIGIN = "https://test.example.com";
const ADMIN = "panel-parolasi-0123456789";
const WA = { verifyToken: "verify-me", appSecret: "app-secret", apiVersion: "v99.0" };
const PHONE_ID = "1234567890";

function setup(llm: Llm, opts: { whatsapp?: boolean; hotelOver?: Record<string, unknown>; env?: NodeJS.ProcessEnv } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hotel-chat-"));
  fs.writeFileSync(path.join(dir, "bilgi-tabani.md"), "Giriş saati 14:00.\n");
  const hotel = {
    ...testHotel({ ...(opts.whatsapp ? { whatsapp: { phoneNumberId: PHONE_ID, secretsEnvPrefix: "WA_TEST" } } : {}), ...opts.hotelOver }),
    dir,
  };
  const graph: Array<{ url: string; auth: string; body: Record<string, any> }> = [];
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
    graph.push({ url: String(url), auth: (init!.headers as Record<string, string>).Authorization ?? "", body: JSON.parse(init!.body as string) });
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  const deps: WebDeps = {
    hotels: new Map([[hotel.config.id, hotel]]),
    store,
    limiter: new RateLimiter(),
    limits: LIMITS,
    llm,
    mailer: { send: async (m) => void sent.push(m) },
    pmsFor: () => new MockPmsClient(),
    log: vi.fn(),
  };
  const app = buildApp({
    deps,
    publicDir: path.resolve("public"),
    trustProxy: false,
    admin: { adminToken: ADMIN, backupDir: path.join(dir, "backups"), priceInputPerMTok: 0.1, priceOutputPerMTok: 0.5 },
    whatsapp: opts.whatsapp ? { config: WA, tokenFor: () => "wa-token", fetchFn } : undefined,
  });
  return { app, hotel, graph, dir };
}

const sse = (body: string) =>
  body.split("\n\n").filter(Boolean).map((f) => ({ event: f.match(/^event: (.*)$/m)![1]!, data: JSON.parse(f.match(/^data: (.*)$/m)![1]!) }));

describe("web: kartlar ve link tıklama takibi", () => {
  it("müsaitlik sonucunu offers olayıyla gönderir", async () => {
    const { app } = setup(new ScriptedLlm([toolCall("musaitlik_sorgula", stay), text("Üç seçenek var.")]));
    const res = await app.inject({ method: "POST", url: "/api/chat", headers: { origin: ORIGIN }, payload: { hotelId: "test-otel", message: "müsait mi" } });
    const offers = sse(res.body).find((e) => e.event === "offers")!;
    expect(offers.data.payload.rooms).toHaveLength(3);
    expect(offers.data.payload.nights).toBe(2);
  });

  it("yalnızca o oturumda üretilmiş linkin tıklamasını sayar", async () => {
    const { app } = setup(new ScriptedLlm([toolCall("rezervasyon_linki_uret", stay), text("Linkiniz hazır.")]));
    const chat = await app.inject({ method: "POST", url: "/api/chat", headers: { origin: ORIGIN }, payload: { hotelId: "test-otel", message: "rezervasyon" } });
    const sessionId = sse(chat.body)[0]!.data.sessionId;
    const url = (store.listEvents("test-otel", "link_created")[0]!.data.url as string);
    const click = (u: string) => app.inject({ method: "POST", url: "/api/link-click", headers: { origin: ORIGIN }, payload: { hotelId: "test-otel", sessionId, url: u } });
    expect((await click(url)).json()).toEqual({ counted: true });
    expect((await click("https://evil.example/")).json()).toEqual({ counted: false });
    expect(store.stats("test-otel", 30)).toMatchObject({ linksCreated: 1, linksClicked: 1 });
  });
});

describe("yönetim paneli", () => {
  const auth = { authorization: `Bearer ${ADMIN}` };

  it("parola olmadan ya da yanlış parolayla hiçbir veri vermez", async () => {
    const { app } = setup(new ScriptedLlm([]));
    for (const url of ["/admin/api/hotels", "/admin/api/hotels/test-otel/stats", "/admin/api/hotels/test-otel/sessions", "/admin/api/hotels/test-otel/knowledge-base"]) {
      expect((await app.inject({ url })).statusCode).toBe(401);
      expect((await app.inject({ url, headers: { authorization: "Bearer yanlis" } })).statusCode).toBe(401);
    }
    const put = await app.inject({ method: "PUT", url: "/admin/api/hotels/test-otel/knowledge-base", payload: { content: "x" } });
    expect(put.statusCode).toBe(401);
  });

  it("parola denemelerini sınırlar", async () => {
    const { app } = setup(new ScriptedLlm([]));
    const codes = [];
    for (let i = 0; i < 12; i++) codes.push((await app.inject({ url: "/admin/api/hotels", headers: { authorization: "Bearer x" } })).statusCode);
    expect(codes.slice(0, 10).every((c) => c === 401)).toBe(true);
    expect(codes.slice(10)).toEqual([429, 429]);
  });

  it("ADMIN_TOKEN yoksa panel uç noktaları hiç açılmaz", async () => {
    const deps = setup(new ScriptedLlm([]));
    const bare = buildApp({ deps: { hotels: new Map([["test-otel", deps.hotel]]), store, limiter: new RateLimiter(), limits: LIMITS, llm: new ScriptedLlm([]), mailer: { send: async () => {} }, pmsFor: () => new MockPmsClient(), log: vi.fn() }, publicDir: path.resolve("public"), trustProxy: false });
    expect((await bare.inject({ url: "/admin" })).statusCode).toBe(404);
    expect((await bare.inject({ url: "/admin/api/hotels", headers: auth })).statusCode).toBe(404);
  });

  it("istatistik, sohbet dökümü, devir ve cevaplanamayan soruları gösterir", async () => {
    const usage = { inputTokens: 1_000_000, outputTokens: 1_000_000, cacheReadTokens: 0, cacheWriteTokens: 0 };
    const llm = new ScriptedLlm([
      { ...toolCall("bilgi_eksigi_kaydet", { soru: "Spor salonu var mı?" }), usage },
      toolCall("insana_devret", { talep_ozeti: "Spor salonu bilgisi" }),
      text("Formu doldurun."),
    ]);
    const { app } = setup(llm);
    const chat = await app.inject({ method: "POST", url: "/api/chat", headers: { origin: ORIGIN }, payload: { hotelId: "test-otel", message: "Spor salonu var mı? Yetkili istiyorum" } });
    const sessionId = sse(chat.body)[0]!.data.sessionId;
    await app.inject({ method: "POST", url: "/api/handoff", headers: { origin: ORIGIN }, payload: { hotelId: "test-otel", sessionId, name: "Ayşe Yılmaz", contact: "ayse@example.com", consent: true } });

    const get = async (p: string) => (await app.inject({ url: `/admin/api/hotels/test-otel${p}`, headers: auth })).json();
    expect(await get("/stats")).toMatchObject({ sessions: 1, guestMessages: 1, handoffs: 1, unanswered: 1, usage: { totalTokens: 2_000_000, estimatedCostUsd: 0.6 } });
    expect((await get("/sessions"))[0]).toMatchObject({ id: sessionId, channel: "web", preview: "Spor salonu var mı? Yetkili istiyorum" });
    const detail = await get(`/sessions/${sessionId}`);
    expect(detail.transcript.map((l: { role: string }) => l.role)).toEqual(["guest", "tool", "tool", "assistant"]);
    expect((await get("/handoffs"))[0]).toMatchObject({ name: "Ayşe Yılmaz", summary: "Spor salonu bilgisi" });
    expect((await get("/unanswered"))[0].question).toBe("Spor salonu var mı?");
  });

  it("bilgi bankasını kaydeder, yedekler ve sonraki mesajda kullanır", async () => {
    const llm = new ScriptedLlm([text("ok")]);
    const { app, dir } = setup(llm);
    const put = await app.inject({ method: "PUT", url: "/admin/api/hotels/test-otel/knowledge-base", headers: auth, payload: { content: "Giriş saati 15:00.\nSpor salonu vardır." } });
    expect(put.statusCode).toBe(200);
    expect(fs.readFileSync(path.join(dir, "bilgi-tabani.md"), "utf8")).toBe("Giriş saati 15:00.\nSpor salonu vardır.\n");
    const backups = fs.readdirSync(path.join(dir, "backups"));
    expect(backups).toHaveLength(1);
    expect(fs.readFileSync(path.join(dir, "backups", backups[0]!), "utf8")).toBe("Giriş saati 14:00.\n");

    await app.inject({ method: "POST", url: "/api/chat", headers: { origin: ORIGIN }, payload: { hotelId: "test-otel", message: "selam" } });
    expect(llm.requests[0]!.system[0]!.text).toContain("Spor salonu vardır.");
  });

  it("boş ya da çok büyük bilgi bankasını reddeder", async () => {
    const { app, dir } = setup(new ScriptedLlm([]));
    const put = (content: unknown) => app.inject({ method: "PUT", url: "/admin/api/hotels/test-otel/knowledge-base", headers: auth, payload: { content } });
    expect((await put("   ")).statusCode).toBe(400);
    expect((await put(42)).statusCode).toBe(400);
    expect((await put("x".repeat(201 * 1024))).statusCode).toBe(413);
    expect(fs.readFileSync(path.join(dir, "bilgi-tabani.md"), "utf8")).toBe("Giriş saati 14:00.\n");
  });
});

describe("WhatsApp kanalı", () => {
  const FROM = "905550000000";
  const sign = (raw: string) => "sha256=" + createHmac("sha256", WA.appSecret).update(raw).digest("hex");
  const envelope = (message: Record<string, unknown>, phoneId = PHONE_ID) =>
    JSON.stringify({
      object: "whatsapp_business_account",
      entry: [{ id: "1", changes: [{ field: "messages", value: { messaging_product: "whatsapp", metadata: { phone_number_id: phoneId }, contacts: [{ wa_id: FROM, profile: { name: "Ayşe Y." } }], messages: [{ from: FROM, ...message }] } }] }],
    });
  const textMsg = (id: string, body: string) => envelope({ id, type: "text", text: { body } });
  const buttonMsg = (id: string, button: string) => envelope({ id, type: "interactive", interactive: { type: "button_reply", button_reply: { id: button, title: "x" } } });

  async function deliver(app: ReturnType<typeof setup>["app"], raw: string, signature = sign(raw)) {
    const res = await app.inject({ method: "POST", url: "/webhooks/whatsapp", headers: { "content-type": "application/json", "x-hub-signature-256": signature }, payload: raw });
    await (app as unknown as { whatsappIdle: () => Promise<void> }).whatsappIdle();
    return res;
  }

  it("webhook doğrulamasında challenge'ı yalnızca doğru anahtarla döner", async () => {
    const { app } = setup(new ScriptedLlm([]), { whatsapp: true });
    const ok = await app.inject({ url: "/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=12345" });
    expect([ok.statusCode, ok.body]).toEqual([200, "12345"]);
    expect((await app.inject({ url: "/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1" })).statusCode).toBe(403);
  });

  it("imzası geçersiz bildirimi reddeder ve işlemez", async () => {
    const llm = new ScriptedLlm([]);
    const { app, graph } = setup(llm, { whatsapp: true });
    const raw = textMsg("wamid.1", "selam");
    expect((await deliver(app, raw, "sha256=" + "0".repeat(64))).statusCode).toBe(401);
    expect((await deliver(app, raw, "")).statusCode).toBe(401);
    expect(llm.requests).toHaveLength(0);
    expect(graph).toHaveLength(0);
  });

  it("ilk mesajda aydınlatma metnini, ardından cevabı gönderir", async () => {
    const { app, graph } = setup(new ScriptedLlm([text("Giriş saati 14:00.")]), { whatsapp: true });
    expect((await deliver(app, textMsg("wamid.1", "Giriş saati kaç?"))).statusCode).toBe(200);
    expect(graph.map((g) => g.body.text.body)).toEqual(["Aydınlatma\nhttps://test.example.com/kvkk", "Giriş saati 14:00."]);
    expect(graph[0]).toMatchObject({ url: `https://graph.facebook.com/v99.0/${PHONE_ID}/messages`, auth: "Bearer wa-token" });
    expect(graph[0]!.body).toMatchObject({ messaging_product: "whatsapp", to: FROM, type: "text" });
  });

  it("aynı numaranın sonraki mesajında konuşmayı sürdürür, aydınlatmayı tekrarlamaz", async () => {
    const llm = new ScriptedLlm([text("Merhaba!"), text("14:00")]);
    const { app, graph } = setup(llm, { whatsapp: true });
    await deliver(app, textMsg("wamid.1", "selam"));
    await deliver(app, textMsg("wamid.2", "giriş saati?"));
    expect(llm.requests[1]!.messages).toHaveLength(3);
    expect(graph).toHaveLength(3);
  });

  it("yinelenen bildirimi ve başka numaraya ait mesajı işlemez", async () => {
    const llm = new ScriptedLlm([text("Merhaba!")]);
    const { app } = setup(llm, { whatsapp: true });
    await deliver(app, textMsg("wamid.1", "selam"));
    await deliver(app, textMsg("wamid.1", "selam"));
    await deliver(app, envelope({ id: "wamid.9", type: "text", text: { body: "selam" } }, "999"));
    expect(llm.requests).toHaveLength(1);
  });

  it("metin olmayan mesaja modeli çağırmadan yanıt verir", async () => {
    const llm = new ScriptedLlm([]);
    const { app, graph } = setup(llm, { whatsapp: true });
    await deliver(app, envelope({ id: "wamid.1", type: "image", image: { id: "x" } }));
    expect(llm.requests).toHaveLength(0);
    expect(graph[0]!.body.text.body).toMatch(/yalnızca yazılı/);
  });

  it("devirde onay düğmesi gönderir; numarayı ancak onaydan sonra otelle paylaşır", async () => {
    const llm = new ScriptedLlm([toolCall("insana_devret", { talep_ozeti: "Transfer fiyatı" }), text("Onaylarsanız ekibimiz size dönecek.")]);
    const { app, graph } = setup(llm, { whatsapp: true });
    await deliver(app, textMsg("wamid.1", "yetkili"));
    const prompt = graph[graph.length - 1]!.body;
    expect(prompt.type).toBe("interactive");
    expect(prompt.interactive.body.text).toBe("Rıza");
    expect(prompt.interactive.action.buttons.map((b: { reply: { id: string } }) => b.reply.id)).toEqual(["handoff_yes", "handoff_no"]);
    expect(sent).toHaveLength(0);

    await deliver(app, buttonMsg("wamid.2", "handoff_yes"));
    expect(sent).toHaveLength(1);
    expect(sent[0]!.text).toContain("Ayşe Y.");
    expect(sent[0]!.text).toContain("WhatsApp +905550000000");
    expect(sent[0]!.text).toContain("Transfer fiyatı");
    expect(graph[graph.length - 1]!.body.text.body).toMatch(/iletildi/);
    expect(store.stats("test-otel", 30)).toMatchObject({ handoffs: 1, whatsappSessions: 1 });
  });

  it("misafir vazgeçerse hiçbir şey paylaşmaz", async () => {
    const llm = new ScriptedLlm([toolCall("insana_devret", { talep_ozeti: "Transfer" }), text("Onaylayın.")]);
    const { app, graph } = setup(llm, { whatsapp: true });
    await deliver(app, textMsg("wamid.1", "yetkili"));
    await deliver(app, buttonMsg("wamid.2", "handoff_no"));
    await deliver(app, buttonMsg("wamid.3", "handoff_yes"));
    expect(sent).toHaveLength(0);
    expect(graph.slice(-2).map((g) => g.body.text.body)).toEqual(["Tamam, bilgileriniz paylaşılmadı.", "Bekleyen bir talebiniz yok."]);
  });

  it("WhatsApp'ta müsaitlik sonucu kart olarak değil metin olarak gider", async () => {
    const llm = new ScriptedLlm([toolCall("musaitlik_sorgula", stay), text("Standart Oda 7.600 TRY.")]);
    const { app } = setup(llm, { whatsapp: true });
    await deliver(app, textMsg("wamid.1", "10-12 Mart 2 kişi"));
    expect(toolResultsOf(llm.requests[1]!)[0]!.content.displayNote).toBeUndefined();
  });

  it("ayar verilmemişse webhook hiç açılmaz", async () => {
    const { app } = setup(new ScriptedLlm([]));
    expect((await app.inject({ url: "/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=1" })).statusCode).toBe(404);
  });

  it("parseIncoming durum bildirimlerini ve bozuk gövdeyi atlar", () => {
    expect(parseIncoming(null)).toEqual([]);
    expect(parseIncoming({ entry: [{ changes: [{ value: { metadata: { phone_number_id: PHONE_ID }, statuses: [{ id: "x", status: "read" }] } }] }] })).toEqual([]);
    expect(verifySignature("s", Buffer.from("a"), undefined)).toBe(false);
  });
});

describe("devir: anlık bildirim", () => {
  it("webhook adresi ortam değişkeninden okunur ve e-postadan sonra çağrılır", async () => {
    const { completeHandoff } = await import("../src/handoff/service.js");
    const hotel = testHotel({ handoff: { email: "r@test.example.com", notifyWebhookEnv: "TEST_HOOK" } });
    const session = store.createSession("test-otel", "web");
    store.appendTurn(session.id, [{ role: "user", content: "x" }], 0, "Transfer fiyatı");
    const calls: Array<{ url: string; body: any }> = [];
    const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), body: JSON.parse(init!.body as string) });
      return new Response("ok");
    }) as typeof fetch;
    const outcome = await completeHandoff(
      { store, mailer: { send: async (m) => void sent.push(m) }, log: vi.fn(), fetchFn, env: { TEST_HOOK: "https://hooks.example.com/abc" } },
      hotel,
      store.getSession(session.id, "test-otel")!,
      { name: "Ayşe", contact: "a@b.co", note: null },
    );
    expect(outcome).toBe("sent");
    expect(calls).toEqual([{ url: "https://hooks.example.com/abc", body: { text: expect.stringContaining("Transfer fiyatı") } }]);
    // Anlık bildirime misafirin adı ve iletişim bilgisi konmaz.
    expect(calls[0]!.body.text).not.toContain("Ayşe");
    expect(calls[0]!.body.text).not.toContain("a@b.co");
  });
});

describe("web: iletişim formu", () => {
  const post = (app: ReturnType<typeof setup>["app"], payload: Record<string, unknown>) =>
    app.inject({ method: "POST", url: "/api/contact", headers: { origin: ORIGIN }, payload: { hotelId: "test-otel", name: "Ayşe Yılmaz", contact: "ayse@example.com", message: "Grup konaklaması için bilgi istiyorum.", consent: true, ...payload } });

  it("rıza ile gelen mesajı resepsiyona iletir ve panelde gösterir", async () => {
    const { app } = setup(new ScriptedLlm([]));
    expect((await post(app, {})).statusCode).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.text).toContain("Grup konaklaması için bilgi istiyorum.");
    expect(sent[0]!.text).toContain("ayse@example.com");
    expect(store.listHandoffs("test-otel")[0]).toMatchObject({ name: "Ayşe Yılmaz", summary: expect.stringContaining("İletişim formu") });
  });

  it("rıza olmadan ya da eksik alanla kabul etmez", async () => {
    const { app } = setup(new ScriptedLlm([]));
    expect((await post(app, { consent: false })).statusCode).toBe(400);
    expect((await post(app, { message: "kısa" })).statusCode).toBe(400);
    expect((await post(app, { name: "" })).statusCode).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it("tuzak alanı dolduran botu sessizce yok sayar", async () => {
    const { app } = setup(new ScriptedLlm([]));
    const res = await post(app, { website: "http://spam.example" });
    expect(res.json()).toEqual({ ok: true });
    expect(sent).toHaveLength(0);
  });

  it("aynı adresten günde en fazla 5 mesaj alır", async () => {
    const { app } = setup(new ScriptedLlm([]));
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await post(app, {})).statusCode);
    expect(codes).toEqual([200, 200, 200, 200, 200, 429]);
  });
});
