import { describe, expect, it, vi } from "vitest";
import { MockPmsClient } from "../src/pms/mock.js";
import { PmsError, type PmsClient } from "../src/pms/types.js";
import { todayInZone, validateStay } from "../src/tools/dates.js";
import { buildBookingLink, executeTool, type ToolContext } from "../src/tools/index.js";
import { testHotel } from "./helpers.js";

const TODAY = "2027-03-01";

function ctx(over: Partial<ToolContext> = {}): ToolContext {
  return {
    hotel: testHotel().config,
    pms: new MockPmsClient(),
    today: TODAY,
    language: "tr",
    requestHandoff: vi.fn(),
    log: vi.fn(),
    ...over,
  };
}
const stay = { giris_tarihi: "2027-03-10", cikis_tarihi: "2027-03-12", yetiskin_sayisi: 2, cocuk_yaslari: [] as number[] };

describe("validateStay", () => {
  it("geçerli konaklamayı kabul eder", () => expect(validateStay("2027-03-10", "2027-03-12", TODAY)).toBeNull());
  it("geçmiş tarihi reddeder", () => expect(validateStay("2027-02-20", "2027-02-22", TODAY)).toMatch(/past/));
  it("çıkış girişten önce olamaz", () => expect(validateStay("2027-03-12", "2027-03-10", TODAY)).toMatch(/after/));
  it("aynı gün giriş-çıkışı reddeder", () => expect(validateStay("2027-03-10", "2027-03-10", TODAY)).toMatch(/after/));
  it("takvimde olmayan günü reddeder", () => expect(validateStay("2027-02-30", "2027-03-02", TODAY)).toMatch(/real calendar/));
  it("biçimi bozuk tarihi reddeder", () => expect(validateStay("10.03.2027", "12.03.2027", TODAY)).toMatch(/YYYY-MM-DD/));
  it("30 geceden uzun konaklamayı reddeder", () => expect(validateStay("2027-03-10", "2027-05-10", TODAY)).toMatch(/30 nights/));
});

describe("todayInZone", () => {
  it("otelin saat dilimine göre günü verir", () => {
    // UTC 22:30, İstanbul'da ertesi gün 01:30
    expect(todayInZone("Europe/Istanbul", new Date("2027-03-01T22:30:00Z"))).toBe("2027-03-02");
  });
});

describe("musaitlik_sorgula", () => {
  it("PMS tekliflerini değiştirmeden aktarır", async () => {
    const r = await executeTool("musaitlik_sorgula", stay, ctx());
    expect(r.isError).toBe(false);
    const data = JSON.parse(r.content);
    expect(data.available).toBe(true);
    expect(data.nights).toBe(2);
    expect(data.offers).toEqual(
      await new MockPmsClient().searchOffers({
        checkIn: stay.giris_tarihi,
        checkOut: stay.cikis_tarihi,
        adults: 2,
        childAges: [],
        currency: "TRY",
        language: "tr",
      }),
    );
    expect(data.priceNote).toMatch(/TOTAL/);
  });

  it("müsaitlik yoksa available=false döner", async () => {
    const r = await executeTool(
      "musaitlik_sorgula",
      { ...stay, giris_tarihi: "2027-03-13", cikis_tarihi: "2027-03-15" },
      ctx(),
    );
    expect(JSON.parse(r.content)).toMatchObject({ available: false, offers: [] });
  });

  it("PMS hatasında fiyat içermeyen hata döner ve devir önerir", async () => {
    const pms: PmsClient = {
      searchOffers: async () => {
        throw new PmsError("network", "x");
      },
    };
    const r = await executeTool("musaitlik_sorgula", stay, ctx({ pms }));
    expect(r.isError).toBe(true);
    expect(r.content).toMatch(/could not be reached/);
    expect(r.content).toMatch(/human handoff/);
    expect(r.content).not.toMatch(/\d{3,}/);
  });

  it("geçersiz girdide PMS'i çağırmaz", async () => {
    const pms = { searchOffers: vi.fn() };
    for (const bad of [
      { ...stay, yetiskin_sayisi: 0 },
      { ...stay, yetiskin_sayisi: "iki" },
      { ...stay, giris_tarihi: "2020-01-01" },
      { giris_tarihi: "2027-03-10" },
    ]) {
      const r = await executeTool("musaitlik_sorgula", bad, ctx({ pms }));
      expect(r.isError).toBe(true);
    }
    expect(pms.searchOffers).not.toHaveBeenCalled();
  });

  it("fiyat birimi bilinmiyorsa bunu modele söyler", async () => {
    const hotel = testHotel({ priceBasis: "unknown" }).config;
    const r = await executeTool("musaitlik_sorgula", stay, ctx({ hotel }));
    expect(JSON.parse(r.content).priceNote).toMatch(/NOT confirmed/);
  });
});

describe("rezervasyon_linki_uret", () => {
  it("şablonu doldurur", async () => {
    const r = await executeTool("rezervasyon_linki_uret", { ...stay, cocuk_yaslari: [4, 7], oda_tipi_id: "102" }, ctx());
    expect(JSON.parse(r.content).url).toBe(
      "https://book.example.com/?in=2027-03-10&out=2027-03-12&a=2&ages=4%2C7&room=102",
    );
  });

  it("boş kalan parametreleri linkten çıkarır", () => {
    const url = buildBookingLink(testHotel().config, stay, "tr");
    expect(url).toBe("https://book.example.com/?in=2027-03-10&out=2027-03-12&a=2");
  });

  it("tarih biçimi ayarına uyar", () => {
    const hotel = testHotel({
      bookingLink: { template: "https://book.example.com/?in={checkin}", dateFormat: "DD.MM.YYYY" },
    }).config;
    expect(buildBookingLink(hotel, stay, "tr")).toBe("https://book.example.com/?in=10.03.2027");
  });

  it("oda tipi kimliğindeki özel karakterler yeni parametre ekleyemez", () => {
    const url = new URL(buildBookingLink(testHotel().config, { ...stay, oda_tipi_id: "1&evil=1" }, "tr"));
    expect(url.searchParams.get("room")).toBe("1&evil=1");
    expect(url.searchParams.has("evil")).toBe(false);
  });

  it("geçmiş tarih için link üretmez", async () => {
    const r = await executeTool(
      "rezervasyon_linki_uret",
      { ...stay, giris_tarihi: "2026-01-01", cikis_tarihi: "2026-01-03" },
      ctx(),
    );
    expect(r.isError).toBe(true);
  });
});

describe("insana_devret", () => {
  it("formu tetikler ve henüz bir şey gönderilmediğini bildirir", async () => {
    const requestHandoff = vi.fn();
    const r = await executeTool("insana_devret", { talep_ozeti: "Grup rezervasyonu soruyor" }, ctx({ requestHandoff }));
    expect(requestHandoff).toHaveBeenCalledWith("Grup rezervasyonu soruyor");
    expect(JSON.parse(r.content).status).toBe("contact_form_shown");
    expect(r.content).toMatch(/Nothing has been sent/);
  });

  it("özet olmadan çalışmaz", async () => {
    const requestHandoff = vi.fn();
    const r = await executeTool("insana_devret", {}, ctx({ requestHandoff }));
    expect(r.isError).toBe(true);
    expect(requestHandoff).not.toHaveBeenCalled();
  });
});

it("bilinmeyen araç hata döner", async () => {
  expect((await executeTool("rezervasyon_olustur", {}, ctx())).isError).toBe(true);
});
