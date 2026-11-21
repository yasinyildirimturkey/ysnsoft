import { beforeEach, describe, expect, it, vi } from "vitest";
import { runChatTurn, type ChatDeps, type ChatEvent } from "../src/chat/engine.js";
import { RateLimiter } from "../src/guard/rate-limit.js";
import type { Llm } from "../src/llm/types.js";
import { MockPmsClient } from "../src/pms/mock.js";
import { Store } from "../src/store/store.js";
import { LIMITS, ScriptedLlm, testHotel, text, toolCall, toolResultsOf } from "./helpers.js";

const hotel = testHotel();
const NOW = new Date("2027-03-01T09:00:00Z");
const stay = { giris_tarihi: "2027-03-10", cikis_tarihi: "2027-03-12", yetiskin_sayisi: 2, cocuk_yaslari: [] };
const oneOffer = async () => new MockPmsClient().searchOffers({ checkIn: "2027-03-10", checkOut: "2027-03-12", adults: 2, childAges: [], currency: "TRY", language: "tr" });

let store: Store;
beforeEach(() => {
  store = new Store(":memory:");
});

function setup(llm: Llm, limits = LIMITS) {
  const deps: ChatDeps = { llm, store, limits, pmsFor: () => new MockPmsClient(), log: vi.fn(), now: () => NOW };
  const session = store.createSession(hotel.config.id, "web");
  const events: ChatEvent[] = [];
  const say = (message: string) => {
    const current = store.getSession(session.id, hotel.config.id)!;
    return runChatTurn(deps, { hotel, session: current, text: message, language: "tr", emit: (e) => events.push(e) });
  };
  return { deps, session, events, say };
}
const texts = (events: ChatEvent[]) => events.flatMap((e) => (e.type === "text" ? [e.delta] : [])).join("");
const notices = (events: ChatEvent[]) => events.flatMap((e) => (e.type === "notice" ? [e.code] : []));

describe("runChatTurn", () => {
  it("düz cevabı akıtır ve turu kaydeder", async () => {
    const llm = new ScriptedLlm([text("Giriş saati 14:00.")]);
    const { say, events, session } = setup(llm);
    await say("Giriş saati kaç?");

    expect(texts(events)).toBe("Giriş saati 14:00.");
    expect(store.getMessages(session.id)).toHaveLength(2);
    expect(store.getSession(session.id, hotel.config.id)).toMatchObject({ turns: 1, toolCalls: 0 });
  });

  it("sistem promptu bilgi tabanını ve bugünün tarihini içerir; tarih önbellek sınırının dışındadır", async () => {
    const llm = new ScriptedLlm([text("ok")]);
    await setup(llm).say("selam");
    const system = llm.requests[0]!.system;
    expect(system[0]!.text).toContain("Giriş saati 14:00.");
    expect(system[0]!.cache_control).toEqual({ type: "ephemeral" });
    expect(system[0]!.text).not.toContain("2027-03-01");
    expect(system[1]!.text).toContain("2027-03-01");
  });

  it("müsaitlik aracını çalıştırır ve PMS sonucunu modele aynen verir", async () => {
    const llm = new ScriptedLlm([toolCall("musaitlik_sorgula", stay), text("Standart Oda müsait.")]);
    const { say, events, session } = setup(llm);
    await say("10-12 Mart 2 kişi müsait mi?");

    const [result] = toolResultsOf(llm.requests[1]!);
    expect(result!.isError).toBe(false);
    expect(result!.content.offers).toEqual(
      await new MockPmsClient().searchOffers({
        checkIn: "2027-03-10",
        checkOut: "2027-03-12",
        adults: 2,
        childAges: [],
        currency: "TRY",
        language: "tr",
      }),
    );
    expect(events.some((e) => e.type === "tool" && e.name === "musaitlik_sorgula")).toBe(true);
    expect(store.getMessages(session.id).map((m) => m.role)).toEqual(["user", "assistant", "user", "assistant"]);
    expect(store.getSession(session.id, hotel.config.id)!.toolCalls).toBe(1);
  });

  it("PMS hatasını modele hata olarak iletir (fiyat uydurmasına zemin bırakmaz)", async () => {
    const failing = { ...stay, giris_tarihi: "2027-03-31", cikis_tarihi: "2027-04-02" };
    const llm = new ScriptedLlm([toolCall("musaitlik_sorgula", failing), text("Sisteme ulaşamıyorum.")]);
    await setup(llm).say("31 Mart?");
    const [result] = toolResultsOf(llm.requests[1]!);
    expect(result!.isError).toBe(true);
    expect(result!.content.error).toMatch(/could not be reached/);
  });

  it("insana devirde form olayını yayar ve özeti oturuma yazar", async () => {
    const llm = new ScriptedLlm([toolCall("insana_devret", { talep_ozeti: "Düğün organizasyonu" }), text("Formu doldurun.")]);
    const { say, events, session } = setup(llm);
    await say("Bir yetkiliyle görüşmek istiyorum");
    expect(events).toContainEqual({ type: "handoff_form", summary: "Düğün organizasyonu" });
    expect(store.getSession(session.id, hotel.config.id)!.pendingHandoff).toBe("Düğün organizasyonu");
  });

  it("sonraki turda önceki konuşmayı modele gönderir", async () => {
    const llm = new ScriptedLlm([text("Merhaba!"), text("14:00")]);
    const { say } = setup(llm);
    await say("selam");
    await say("giriş saati?");
    expect(llm.requests[1]!.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });

  it("tur başına araç turu sınırını aşınca aracı çalıştırmaz, modele sınırı bildirir", async () => {
    const pms = { searchOffers: vi.fn(oneOffer) };
    const llm = new ScriptedLlm([
      toolCall("musaitlik_sorgula", stay, "t1"),
      toolCall("musaitlik_sorgula", stay, "t2"),
      toolCall("musaitlik_sorgula", stay, "t3"),
      text("Daha fazla sorgulayamıyorum."),
    ]);
    const { deps, say } = setup(llm);
    deps.pmsFor = () => pms;
    await say("sürekli sorgula");

    expect(pms.searchOffers).toHaveBeenCalledTimes(LIMITS.maxToolRoundsPerTurn);
    const [third] = toolResultsOf(llm.requests[3]!);
    expect(third).toMatchObject({ isError: true });
    expect(third!.content.error).toMatch(/limit reached/);
  });

  it("model sınırdan sonra da araç isterse turu hata ile bitirir ve kaydetmez", async () => {
    const llm = new ScriptedLlm(Array.from({ length: 6 }, (_, i) => toolCall("musaitlik_sorgula", stay, `t${i}`)));
    const { say, events, session } = setup(llm);
    await say("döngü");
    expect(notices(events)).toEqual(["error"]);
    expect(llm.requests).toHaveLength(LIMITS.maxToolRoundsPerTurn + 2);
    expect(store.getMessages(session.id)).toHaveLength(0);
  });

  it("konuşma başına araç çağrısı sınırını turlar arasında uygular", async () => {
    const pms = { searchOffers: vi.fn(oneOffer) };
    const turnScript = () => [toolCall("musaitlik_sorgula", stay), text("yok")];
    const llm = new ScriptedLlm([...turnScript(), ...turnScript(), ...turnScript(), ...turnScript()]);
    const { deps, say } = setup(llm);
    deps.pmsFor = () => pms;
    for (let i = 0; i < 4; i++) await say(`sorgu ${i}`);

    expect(pms.searchOffers).toHaveBeenCalledTimes(LIMITS.maxToolCallsPerSession);
    expect(toolResultsOf(llm.requests[7]!)[0]).toMatchObject({ isError: true });
  });

  it("oturum azami tur sayısına ulaşınca modeli çağırmaz", async () => {
    const llm = new ScriptedLlm(Array.from({ length: LIMITS.maxTurnsPerSession }, () => text("ok")));
    const { say, events } = setup(llm);
    for (let i = 0; i <= LIMITS.maxTurnsPerSession; i++) await say("selam");
    expect(llm.requests).toHaveLength(LIMITS.maxTurnsPerSession);
    expect(notices(events)).toEqual(["session_full"]);
  });

  it("model hatasında özür mesajı verir ve geçmişi bozmaz", async () => {
    const llm = new ScriptedLlm([text("Merhaba!"), new Error("API 529"), text("14:00")]);
    const { say, events, session } = setup(llm);
    await say("selam");
    await say("giriş saati?");
    expect(notices(events)).toEqual(["error"]);
    expect(store.getMessages(session.id)).toHaveLength(2);
    await say("giriş saati?");
    expect(llm.requests[2]!.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });

  it("araç çağrısı ortasında hata olursa yarım turu kaydetmez", async () => {
    const llm = new ScriptedLlm([toolCall("musaitlik_sorgula", stay), new Error("bağlantı koptu")]);
    const { say, session } = setup(llm);
    await say("müsait mi?");
    expect(store.getMessages(session.id)).toHaveLength(0);
    expect(store.getSession(session.id, hotel.config.id)).toMatchObject({ turns: 0, toolCalls: 0 });
  });

  it("max_tokens ile kesilmiş araç çağrısını yürütmez", async () => {
    const pms = { searchOffers: vi.fn(oneOffer) };
    const cut = { ...toolCall("musaitlik_sorgula", stay), stopReason: "max_tokens" };
    const { deps, say, events } = setup(new ScriptedLlm([cut]));
    deps.pmsFor = () => pms;
    await say("müsait mi?");
    expect(pms.searchOffers).not.toHaveBeenCalled();
    expect(notices(events)).toEqual(["error"]);
  });

  it("model reddederse nazik bir mesaj verir ve turu kaydetmez", async () => {
    const llm = new ScriptedLlm([{ content: [], stopReason: "refusal" }]);
    const { say, events, session } = setup(llm);
    await say("...");
    expect(notices(events)).toEqual(["refused"]);
    expect(store.getMessages(session.id)).toHaveLength(0);
  });
});

describe("RateLimiter", () => {
  it("pencere içinde sınırı uygular, pencere dolunca sıfırlar", () => {
    let now = 0;
    const limiter = new RateLimiter(() => now);
    expect([1, 2, 3].map(() => limiter.take("k", 2, 1000))).toEqual([true, true, false]);
    expect(limiter.take("other", 2, 1000)).toBe(true);
    now = 1000;
    expect(limiter.take("k", 2, 1000)).toBe(true);
  });
});

describe("Store", () => {
  it("oturum başka otelin kimliğiyle okunamaz", () => {
    const s = store.createSession("otel-a", "web");
    expect(store.getSession(s.id, "otel-b")).toBeNull();
  });

  it("saklama süresi dolan oturumları mesaj ve devir kayıtlarıyla siler", () => {
    let now = Date.parse("2027-01-01T00:00:00Z");
    const timed = new Store(":memory:", () => now);
    const old = timed.createSession("otel-a", "web");
    timed.appendTurn(old.id, [{ role: "user", content: "eski" }], 0, "özet");
    timed.saveHandoff({ sessionId: old.id, hotelId: "otel-a", name: "A", contact: "a@b.c", summary: "özet", note: null });
    now += 20 * 86_400_000;
    const fresh = timed.createSession("otel-a", "web");
    const otherHotel = timed.createSession("otel-b", "web");
    now += 15 * 86_400_000;

    expect(timed.purgeExpired("otel-a", 30)).toBe(1);
    expect(timed.getSession(old.id, "otel-a")).toBeNull();
    expect(timed.getMessages(old.id)).toEqual([]);
    expect(timed.countHandoffs(old.id)).toBe(0);
    expect(timed.getSession(fresh.id, "otel-a")).not.toBeNull();
    expect(timed.getSession(otherHotel.id, "otel-b")).not.toBeNull();
  });
});
