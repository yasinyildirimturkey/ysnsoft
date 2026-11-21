import os from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import type { WebDeps } from "../src/channels/web/routes.js";
import { RateLimiter } from "../src/guard/rate-limit.js";
import type { Mail } from "../src/handoff/mailer.js";
import type { Llm } from "../src/llm/types.js";
import { MockPmsClient } from "../src/pms/mock.js";
import { Store } from "../src/store/store.js";
import { LIMITS, ScriptedLlm, testHotel, text, toolCall } from "./helpers.js";

const ORIGIN = "https://test.example.com";
const hotel = testHotel();

let store: Store;
let sent: Mail[];
let mailFails: boolean;

beforeEach(() => {
  store = new Store(":memory:");
  sent = [];
  mailFails = false;
});
afterEach(() => store.close());

function app(llm: Llm, limits = LIMITS) {
  const deps: WebDeps = {
    hotels: new Map([[hotel.config.id, hotel]]),
    store,
    limiter: new RateLimiter(),
    limits,
    llm,
    mailer: {
      send: async (mail) => {
        if (mailFails) throw new Error("smtp down");
        sent.push(mail);
      },
    },
    pmsFor: () => new MockPmsClient(),
    log: vi.fn(),
  };
  return buildApp({ deps, publicDir: os.tmpdir(), trustProxy: false });
}

function parseSse(body: string): Array<{ event: string; data: Record<string, unknown> }> {
  return body
    .split("\n\n")
    .filter(Boolean)
    .map((frame) => ({
      event: frame.match(/^event: (.*)$/m)![1]!,
      data: JSON.parse(frame.match(/^data: (.*)$/m)![1]!) as Record<string, unknown>,
    }));
}

const chat = (a: ReturnType<typeof app>, payload: Record<string, unknown>, origin: string | undefined = ORIGIN) =>
  a.inject({
    method: "POST",
    url: "/api/chat",
    headers: origin ? { origin } : {},
    payload: { hotelId: hotel.config.id, ...payload },
  });

describe("POST /api/chat", () => {
  it("SSE olarak oturum, metin ve bitiş olaylarını döner", async () => {
    const res = await chat(app(new ScriptedLlm([text("Merhaba!")])), { message: "selam" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
    expect(res.headers["access-control-allow-origin"]).toBe(ORIGIN);
    const events = parseSse(res.body);
    expect(events.map((e) => e.event)).toEqual(["session", "text", "done"]);
    expect(events[0]!.data.sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(events[1]!.data.delta).toBe("Merhaba!");
  });

  it("aynı oturum kimliğiyle konuşmayı sürdürür", async () => {
    const llm = new ScriptedLlm([text("Merhaba!"), text("14:00")]);
    const a = app(llm);
    const first = parseSse((await chat(a, { message: "selam" })).body);
    const sessionId = first[0]!.data.sessionId;
    const second = parseSse((await chat(a, { message: "giriş?", sessionId })).body);
    expect(second[0]!.data.sessionId).toBe(sessionId);
    expect(llm.requests[1]!.messages).toHaveLength(3);
  });

  it("bilinmeyen oturum kimliğini yok sayıp yeni oturum açar", async () => {
    const unknown = "00000000-0000-4000-8000-000000000000";
    const events = parseSse((await chat(app(new ScriptedLlm([text("ok")])), { message: "selam", sessionId: unknown })).body);
    expect(events[0]!.data.sessionId).not.toBe(unknown);
  });

  it("izinli olmayan kökeni reddeder", async () => {
    const res = await chat(app(new ScriptedLlm([])), { message: "selam" }, "https://evil.example");
    expect(res.statusCode).toBe(403);
  });

  it("bilinmeyen oteli, boş ve çok uzun mesajı modeli çağırmadan reddeder", async () => {
    const llm = new ScriptedLlm([]);
    const a = app(llm);
    expect((await chat(a, { hotelId: "yok", message: "selam" })).statusCode).toBe(404);
    expect((await chat(a, { message: "   " })).statusCode).toBe(400);
    expect((await chat(a, { message: "x".repeat(LIMITS.maxMessageChars + 1) })).statusCode).toBe(413);
    expect((await chat(a, {})).statusCode).toBe(400);
    expect(llm.requests).toHaveLength(0);
  });

  it("IP başına dakikalık sınırı uygular", async () => {
    const a = app(new ScriptedLlm([text("1"), text("2")]), { ...LIMITS, ipPerMinute: 2 });
    const codes = [];
    for (let i = 0; i < 3; i++) codes.push((await chat(a, { message: "selam" })).statusCode);
    expect(codes).toEqual([200, 200, 429]);
  });

  it("oturum başına dakikalık sınırı uygular", async () => {
    const a = app(new ScriptedLlm([text("1")]), { ...LIMITS, sessionPerMinute: 1 });
    const sessionId = parseSse((await chat(a, { message: "selam" })).body)[0]!.data.sessionId;
    expect((await chat(a, { message: "tekrar", sessionId })).statusCode).toBe(429);
  });
});

describe("POST /api/handoff", () => {
  async function startHandoff() {
    const llm = new ScriptedLlm([toolCall("insana_devret", { talep_ozeti: "Havalimanı transferi fiyatı" }), text("Formu doldurun.")]);
    const a = app(llm);
    const events = parseSse((await chat(a, { message: "yetkili" })).body);
    expect(events.map((e) => e.event)).toContain("handoff_form");
    return { a, sessionId: events[0]!.data.sessionId as string };
  }
  const submit = (a: ReturnType<typeof app>, payload: Record<string, unknown>) =>
    a.inject({
      method: "POST",
      url: "/api/handoff",
      headers: { origin: ORIGIN },
      payload: { hotelId: hotel.config.id, name: "Ayşe Yılmaz", contact: "+90 555 000 00 00", consent: true, ...payload },
    });

  it("rıza ile gönderilen formu resepsiyona e-postalar", async () => {
    const { a, sessionId } = await startHandoff();
    const res = await submit(a, { sessionId, note: "Öğleden sonra arayın" });
    expect(res.statusCode).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe("resepsiyon@test.example.com");
    expect(sent[0]!.text).toContain("Ayşe Yılmaz");
    expect(sent[0]!.text).toContain("+90 555 000 00 00");
    expect(sent[0]!.text).toContain("Havalimanı transferi fiyatı");
    expect(sent[0]!.text).toContain("Öğleden sonra arayın");
    expect(sent[0]!.subject).not.toContain("Ayşe");
    expect(store.countHandoffs(sessionId)).toBe(1);
  });

  it("açık rıza olmadan kişisel veriyi kabul etmez", async () => {
    const { a, sessionId } = await startHandoff();
    for (const consent of [false, "true", undefined]) {
      expect((await submit(a, { sessionId, consent })).statusCode).toBe(400);
    }
    expect(sent).toHaveLength(0);
    expect(store.countHandoffs(sessionId)).toBe(0);
  });

  it("hiç konuşma olmayan ya da bilinmeyen oturum için e-posta göndermez", async () => {
    const a = app(new ScriptedLlm([]));
    const empty = store.createSession(hotel.config.id, "web");
    expect((await submit(a, { sessionId: empty.id })).statusCode).toBe(404);
    expect((await submit(a, { sessionId: "00000000-0000-4000-8000-000000000000" })).statusCode).toBe(404);
    expect(sent).toHaveLength(0);
  });

  it("e-posta gönderilemezse hata döner ve kaydı oluşturmaz", async () => {
    const { a, sessionId } = await startHandoff();
    mailFails = true;
    expect((await submit(a, { sessionId })).statusCode).toBe(502);
    expect(store.countHandoffs(sessionId)).toBe(0);
  });

  it("oturum başına devir sayısını sınırlar", async () => {
    const { a, sessionId } = await startHandoff();
    const codes = [];
    for (let i = 0; i < 3; i++) codes.push((await submit(a, { sessionId })).statusCode);
    expect(codes).toEqual([200, 200, 429]);
    expect(sent).toHaveLength(2);
  });
});

describe("diğer uç noktalar", () => {
  it("widget ayarları gizli bilgi içermez ve dile göre döner", async () => {
    const a = app(new ScriptedLlm([]));
    const res = await a.inject({ url: `/api/hotels/${hotel.config.id}/widget-config?lang=en`, headers: { origin: ORIGIN } });
    const body = res.json();
    expect(body).toMatchObject({ language: "en", title: "Assistant", welcome: "Hello", privacyNotice: "Notice" });
    expect(JSON.stringify(body)).not.toContain("resepsiyon@");
    expect(JSON.stringify(body)).not.toContain("book.example.com");
  });

  it("desteklenmeyen dilde varsayılan dile düşer", async () => {
    const res = await app(new ScriptedLlm([])).inject({ url: `/api/hotels/${hotel.config.id}/widget-config?lang=de` });
    expect(res.json().language).toBe("tr");
  });

  it("misafir kendi sohbet kaydını silebilir", async () => {
    const a = app(new ScriptedLlm([text("Merhaba!")]));
    const sessionId = parseSse((await chat(a, { message: "selam" })).body)[0]!.data.sessionId as string;
    const res = await a.inject({
      method: "POST",
      url: "/api/session/delete",
      headers: { origin: ORIGIN },
      payload: { hotelId: hotel.config.id, sessionId },
    });
    expect(res.json()).toEqual({ deleted: true });
    expect(store.getMessages(sessionId)).toEqual([]);
  });

  it("ön kontrol isteğinde yalnızca tanımlı kökenlere izin verir", async () => {
    const a = app(new ScriptedLlm([]));
    const ok = await a.inject({ method: "OPTIONS", url: "/api/chat", headers: { origin: ORIGIN } });
    expect(ok.statusCode).toBe(204);
    expect(ok.headers["access-control-allow-origin"]).toBe(ORIGIN);
    const bad = await a.inject({ method: "OPTIONS", url: "/api/chat", headers: { origin: "https://evil.example" } });
    expect(bad.statusCode).toBe(403);
  });
});
