import { describe, expect, it, vi } from "vitest";
import type { ElektraPmsConfig } from "../src/config/hotel.js";
import { ElektraClient, extractToken, mapPriceRows, type ElektraSecrets } from "../src/pms/elektra.js";
import { MockPmsClient } from "../src/pms/mock.js";
import { PmsError } from "../src/pms/types.js";

const q = { checkIn: "2027-03-10", checkOut: "2027-03-13", adults: 2, childAges: [5], currency: "TRY", language: "tr" };

describe("MockPmsClient", () => {
  const pms = new MockPmsClient();
  it("deterministiktir", async () => expect(await pms.searchOffers(q)).toEqual(await pms.searchOffers(q)));
  it("kapasiteyi aşan odaları döndürmez", async () => {
    const offers = await pms.searchOffers({ ...q, adults: 4, childAges: [] });
    expect(offers.map((o) => o.roomTypeName)).toEqual(["Aile Süiti"]);
  });
  it("ayın 13'ünde müsaitlik yoktur", async () => {
    expect(await pms.searchOffers({ ...q, checkIn: "2027-03-13", checkOut: "2027-03-14" })).toEqual([]);
  });
  it("ayın 31'inde PmsError fırlatır", async () => {
    await expect(pms.searchOffers({ ...q, checkIn: "2027-03-31", checkOut: "2027-04-02" })).rejects.toBeInstanceOf(
      PmsError,
    );
  });
});

// Resmi dokümandaki /price örnek yanıtı (hotel.docs.bookingapi.elektraweb.com), olduğu gibi.
const DOC_ROW = {
  id: "26780-425897-57053-34882-",
  "hotel-id": 26780,
  "room-type-id": 425897,
  "room-type": "Standart",
  "board-type-id": 57053,
  "board-type": "RO",
  "rate-type-id": 34882,
  "rate-type": "Refundable",
  "rate-code-id": 685316,
  "rate-code": "ONLINE",
  "price-agency-id": 459,
  "room-tosell": 10,
  "stop-sell": false,
  "stop-sell-closed-to-arrival": false,
  "stop-sell-closed-to-departure": false,
  "min-los": null,
  "max-los": null,
  "bookable-after-days": null,
  price: 5000,
  "currency-id": 142,
  currency: "TRY",
  "commission-percent": 0,
  "discount-percent": 10,
  "discount-amount": 500,
  "promotion-percent": 0,
  "promotion-amount": 0,
  "discounted-price": 4500,
  "cancellation-penalty": { description: "", "period-in-days": 7, "penalty-percentage": null, "is-refundable": false },
};

describe("mapPriceRows", () => {
  it("doküman örneğini eşler", () => {
    expect(mapPriceRows([DOC_ROW], "EUR")).toEqual([
      {
        roomTypeId: "425897",
        roomTypeName: "Standart",
        boardType: "RO",
        rateType: "Refundable",
        availableRooms: 10,
        price: 5000,
        discountedPrice: 4500,
        currency: "TRY",
        refundable: false,
        cancellationNote: null,
        minStayNights: null,
      },
    ]);
  });
  it("satışa kapalı ve odası kalmayan satırları eler", () => {
    const rows = [
      { ...DOC_ROW, "stop-sell": true },
      { ...DOC_ROW, "stop-sell-closed-to-arrival": true },
      { ...DOC_ROW, "room-tosell": 0 },
    ];
    expect(mapPriceRows(rows, "TRY")).toEqual([]);
  });
  it("fiyatı ya da oda adı olmayan satırı uydurmaz, atlar", () => {
    const rows = [{ ...DOC_ROW, price: null }, { ...DOC_ROW, price: "5000" }, { ...DOC_ROW, "room-type": "" }, null, "x"];
    expect(mapPriceRows(rows, "TRY")).toEqual([]);
  });
  it("indirim yoksa discountedPrice null olur", () => {
    expect(mapPriceRows([{ ...DOC_ROW, "discounted-price": 5000 }], "TRY")[0]!.discountedPrice).toBeNull();
  });
  it("dizi olmayan yanıtta PmsError fırlatır", () => {
    expect(() => mapPriceRows({ error: "x" }, "TRY")).toThrowError(PmsError);
  });
});

const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
const jwt = (payload: object) => `${b64({ alg: "HS256" })}.${b64(payload)}.c2lnbmF0dXJlLXBsYWNlaG9sZGVyLXZhbHVl`;

describe("extractToken", () => {
  const token = jwt({ sub: "hotel" });
  it("belirtilen alanı okur", () => expect(extractToken({ foo: token }, "foo")).toBe(token));
  it("belirtilen alan yoksa hata verir", () => expect(() => extractToken({ foo: token }, "bar")).toThrowError(/bar/));
  it("alan belirtilmemişse JWT biçimli tek değeri bulur", () => {
    expect(extractToken({ user: { name: "a.b.c" }, anything: token })).toBe(token);
  });
  it("düz metin JWT'yi kabul eder", () => expect(extractToken(token)).toBe(token));
  it("birden fazla aday varsa tahmin etmez", () => {
    expect(() => extractToken({ a: token, b: jwt({ sub: "other" }) })).toThrowError(/loginTokenField/);
  });
  it("aday yoksa alan adlarını bildirir ama değerleri sızdırmaz", () => {
    let message = "";
    try {
      extractToken({ ok: true, secret: "s3cret" });
    } catch (e) {
      message = String(e);
    }
    expect(message).toMatch(/alanlar: ok, secret/);
    expect(message).not.toContain("s3cret");
  });
});

describe("ElektraClient", () => {
  const cfg: ElektraPmsConfig = {
    type: "elektra",
    hotelId: 26780,
    secretsEnvPrefix: "ELEKTRA_TEST",
    baseUrl: "https://bookingapi.elektraweb.com",
    tokenTtlMinutes: 720,
    timeoutMs: 5000,
  };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const T0 = 1_800_000_000_000;

  function setup(secrets: ElektraSecrets, responses: Array<() => Response>) {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      const next = responses.shift();
      if (!next) throw new Error("beklenmeyen istek");
      return next();
    }) as typeof fetch;
    let now = T0;
    const client = new ElektraClient(cfg, secrets, fetchFn, () => now);
    return { client, calls, advance: (ms: number) => (now += ms) };
  }
  const header = (init: RequestInit, name: string) => (init.headers as Record<string, string>)[name];
  const logins = (calls: Array<{ url: string }>) => calls.filter((c) => c.url.endsWith("/login")).length;

  it("API anahtarıyla login olur ve dokümandaki sorgu parametrelerini gönderir", async () => {
    const token = jwt({ sub: "h" });
    const { client, calls } = setup({ apiKey: "KEY" }, [() => json({ t: token }), () => json([DOC_ROW])]);
    const offers = await client.searchOffers(q);

    expect(calls[0]!.url).toBe("https://bookingapi.elektraweb.com/login");
    expect(calls[0]!.init.method).toBe("POST");
    expect(header(calls[0]!.init, "Authorization")).toBe("Bearer KEY");

    const url = new URL(calls[1]!.url);
    expect(url.pathname).toBe("/hotel/26780/price/");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      fromdate: "2027-03-10",
      todate: "2027-03-13",
      adult: "2",
      childage: "5",
      currency: "TRY",
      nationality: "",
      onlybestoffer: "false",
      language: "tr",
    });
    expect(header(calls[1]!.init, "Authorization")).toBe(`Bearer ${token}`);
    expect(offers).toHaveLength(1);
  });

  it("kullanıcı kodu ve parolayla dokümandaki gövdeyi gönderir", async () => {
    const { client, calls } = setup({ usercode: "u", password: "p" }, [() => json({ t: jwt({}) }), () => json([])]);
    await client.searchOffers(q);
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({ "hotel-id": 26780, usercode: "u", password: "p" });
    expect(header(calls[0]!.init, "Authorization")).toBeUndefined();
  });

  it("token'ı yeniden kullanır, süresi dolunca yeniden login olur", async () => {
    const exp = T0 / 1000 + 3600;
    const { client, calls, advance } = setup({ apiKey: "KEY" }, [
      () => json({ t: jwt({ exp }) }),
      () => json([]),
      () => json([]),
      () => json({ t: jwt({ exp: exp + 7200 }) }),
      () => json([]),
    ]);
    await client.searchOffers(q);
    await client.searchOffers(q);
    expect(logins(calls)).toBe(1);
    advance(3_600_000);
    await client.searchOffers(q);
    expect(logins(calls)).toBe(2);
  });

  it("eşzamanlı sorgular tek login'i paylaşır", async () => {
    const { client, calls } = setup({ apiKey: "KEY" }, [() => json({ t: jwt({}) }), () => json([]), () => json([])]);
    await Promise.all([client.searchOffers(q), client.searchOffers(q)]);
    expect(logins(calls)).toBe(1);
  });

  it("401'de bir kez yeniden login olup tekrar dener", async () => {
    const { client, calls } = setup({ apiKey: "KEY" }, [
      () => json({ t: jwt({ n: 1 }) }),
      () => json({}, 401),
      () => json({ t: jwt({ n: 2 }) }),
      () => json([DOC_ROW]),
    ]);
    expect(await client.searchOffers(q)).toHaveLength(1);
    expect(calls).toHaveLength(4);
  });

  it("ikinci 401'de auth hatası verir", async () => {
    const { client } = setup({ apiKey: "KEY" }, [
      () => json({ t: jwt({ n: 1 }) }),
      () => json({}, 401),
      () => json({ t: jwt({ n: 2 }) }),
      () => json({}, 401),
    ]);
    await expect(client.searchOffers(q)).rejects.toMatchObject({ kind: "auth" });
  });

  it("kimlik bilgisi yoksa istek atmadan config hatası verir", async () => {
    const { client, calls } = setup({}, []);
    await expect(client.searchOffers(q)).rejects.toMatchObject({ kind: "config" });
    expect(calls).toHaveLength(0);
  });

  it("ağ hatası ve 5xx'i PmsError'a çevirir", async () => {
    const a = setup({ apiKey: "KEY" }, [
      () => {
        throw new TypeError("fetch failed");
      },
    ]);
    await expect(a.client.searchOffers(q)).rejects.toMatchObject({ kind: "network" });
    const b = setup({ apiKey: "KEY" }, [() => json({ t: jwt({}) }), () => json({}, 503)]);
    await expect(b.client.searchOffers(q)).rejects.toMatchObject({ kind: "bad_response", status: 503 });
  });

  it("hata mesajına gizli anahtarı yazmaz", async () => {
    const { client } = setup({ apiKey: "SUPER-SECRET" }, [() => json({ nope: 1 })]);
    const err = await client.searchOffers(q).catch((e: Error) => e);
    expect(err).toBeInstanceOf(PmsError);
    expect((err as Error).message).not.toContain("SUPER-SECRET");
  });
});
