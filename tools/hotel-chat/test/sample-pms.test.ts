import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadHotels } from "../src/config/hotel.js";
import { createPmsClient } from "../src/pms/index.js";
import { loadSamplePmsData, SamplePmsClient, SamplePmsDataSchema } from "../src/pms/sample.js";
import { PmsError } from "../src/pms/types.js";

const data = SamplePmsDataSchema.parse({
  currency: "TRY",
  boardType: "Oda Kahvaltı",
  defaultSeason: "dusuk",
  seasons: [
    { name: "yuksek", from: "06-15", to: "09-15" },
    { name: "yilbasi", from: "12-28", to: "01-02" },
  ],
  weekendSurchargePercent: 10,
  children: { freeUnderAge: 7, maxChildAge: 12, perNight: 600 },
  ratePlans: [
    { name: "İade edilebilir", refundable: true, cancellationNote: "7 gün" },
    { name: "İade edilemez", refundable: false, discountPercent: 10 },
  ],
  minStay: { yuksek: 3 },
  roomTypes: [
    { id: "STD", name: "Standart", units: 2, maxAdults: 2, maxChildren: 0, maxGuests: 2, nightly: { dusuk: 1000, yuksek: 2000, yilbasi: 1500 } },
    { id: "SUIT", name: "Süit", units: 1, maxAdults: 3, maxChildren: 2, maxGuests: 4, extraAdultPerNight: 300, nightly: { dusuk: 3000, yuksek: 5000, yilbasi: 4000 } },
  ],
  bookings: [
    { roomTypeId: "STD", from: "2027-03-08", to: "2027-03-10" },
    { roomTypeId: "STD", from: "2027-03-09", to: "2027-03-11" },
    { roomTypeId: "SUIT", from: "2027-03-01", to: "2027-03-03" },
  ],
  outageDates: ["2027-05-05"],
});
const pms = new SamplePmsClient(data);
const q = (checkIn: string, checkOut: string, adults = 2, childAges: number[] = []) =>
  pms.searchOffers({ checkIn, checkOut, adults, childAges, currency: "TRY", language: "tr" });
const refundable = async (...args: Parameters<typeof q>) => (await q(...args)).filter((o) => o.refundable);

describe("SamplePmsClient fiyat", () => {
  it("hafta içi geceleri sezon fiyatından toplar", async () => {
    // 2027-03-01 pazartesi; pazartesi ve salı geceleri
    const [std] = await refundable("2027-03-15", "2027-03-17");
    expect(std).toMatchObject({ roomTypeId: "STD", price: 2000, discountedPrice: null, availableRooms: 2 });
  });

  it("cuma ve cumartesi gecelerine hafta sonu farkı ekler", async () => {
    // 2027-03-19 cuma: cuma + cumartesi geceleri %10 farklı
    const [std] = await refundable("2027-03-19", "2027-03-21");
    expect(std!.price).toBe(2200);
  });

  it("sezon sınırını geçen konaklamada her geceyi kendi sezonundan fiyatlar", async () => {
    // 13 Haziran (pazar, düşük) + 14 Haziran (pazartesi, düşük) + 15 Haziran (salı, yüksek)
    const [std] = await refundable("2027-06-13", "2027-06-16");
    expect(std!.price).toBe(1000 + 1000 + 2000);
  });

  it("yıl sonunu aşan sezonu tanır", async () => {
    // 2027-12-28 salı, 2028-01-02 pazar: ikisi de yılbaşı sezonu, hafta içi/pazar gecesi
    expect((await refundable("2027-12-28", "2027-12-29"))[0]!.price).toBe(1500);
    expect((await refundable("2028-01-02", "2028-01-03"))[0]!.price).toBe(1500);
    expect((await refundable("2028-01-03", "2028-01-04"))[0]!.price).toBe(1000);
  });

  it("iade edilemez planda indirimli fiyatı ayrıca verir", async () => {
    const offers = await q("2027-03-15", "2027-03-17");
    const nonRef = offers.find((o) => o.roomTypeId === "STD" && !o.refundable)!;
    expect(nonRef).toMatchObject({ price: 2000, discountedPrice: 1800, rateType: "İade edilemez" });
  });

  it("ücretsiz yaş altındaki çocuktan ücret almaz, üstündekinden alır", async () => {
    const suite = async (ages: number[]) => (await refundable("2027-03-15", "2027-03-16", 2, ages)).find((o) => o.roomTypeId === "SUIT")!;
    expect((await suite([6])).price).toBe(3000);
    expect((await suite([7])).price).toBe(3600);
    expect((await suite([4, 10])).price).toBe(3600);
  });

  it("çocuk yaş sınırını aşanı yetişkin sayar", async () => {
    // 2 yetişkin + 13 yaş = 3 yetişkin: Standart'a sığmaz, Süit'te ek yetişkin farkı alınır
    const offers = await refundable("2027-03-15", "2027-03-16", 2, [13]);
    expect(offers.map((o) => o.roomTypeId)).toEqual(["SUIT"]);
    expect(offers[0]!.price).toBe(3300);
  });
});

describe("SamplePmsClient müsaitlik", () => {
  it("kapasiteyi aşan oda tiplerini döndürmez", async () => {
    expect((await refundable("2027-03-15", "2027-03-16", 2, [5])).map((o) => o.roomTypeId)).toEqual(["SUIT"]);
    expect(await q("2027-03-15", "2027-03-16", 4)).toEqual([]);
    expect(await q("2027-03-15", "2027-03-16", 2, [3, 4, 5])).toEqual([]);
  });

  it("kalan oda sayısını konaklamanın en dolu gecesine göre hesaplar", async () => {
    // 8 Mart gecesi 1 oda dolu, 9 Mart gecesi 2 oda dolu, 10 Mart gecesi 1 oda dolu
    const std = async (a: string, b: string) => (await refundable(a, b)).find((o) => o.roomTypeId === "STD");
    expect((await std("2027-03-08", "2027-03-09"))!.availableRooms).toBe(1);
    expect(await std("2027-03-08", "2027-03-10")).toBeUndefined();
    expect((await std("2027-03-10", "2027-03-11"))!.availableRooms).toBe(1);
  });

  it("çıkış günü oda yeniden satılabilir", async () => {
    const suite = async (a: string, b: string) => (await refundable(a, b)).some((o) => o.roomTypeId === "SUIT");
    expect(await suite("2027-03-02", "2027-03-03")).toBe(false);
    expect(await suite("2027-03-03", "2027-03-04")).toBe(true);
    expect(await suite("2027-02-27", "2027-03-01")).toBe(true);
  });

  it("asgari konaklama süresinin altındaki sorguya teklif vermez", async () => {
    expect(await q("2027-07-05", "2027-07-07")).toEqual([]);
    const offers = await q("2027-07-05", "2027-07-08");
    expect(offers.length).toBeGreaterThan(0);
    expect(offers[0]!.minStayNights).toBe(3);
  });

  it("arıza tarihinde PmsError fırlatır", async () => {
    await expect(q("2027-05-05", "2027-05-06")).rejects.toBeInstanceOf(PmsError);
  });
});

describe("örnek otel verisi (hotels/pati-koy)", () => {
  const hotels = loadHotels(path.resolve("hotels"));
  const hotel = hotels.get("pati-koy")!;

  it("yüklenir ve sanal PMS'e bağlanır", async () => {
    expect(hotel.config.pms).toMatchObject({ type: "mock", dataFile: "mock-pms.json" });
    const offers = await createPmsClient(hotel).searchOffers({
      checkIn: "2027-03-15", checkOut: "2027-03-17", adults: 2, childAges: [], currency: "TRY", language: "tr",
    });
    expect(new Set(offers.map((o) => o.roomTypeId))).toEqual(new Set(["STD", "DLX", "PATI", "SUIT"]));
  });

  it("toplam 5 odası vardır ve her oda tipi bilgi tabanında geçer", () => {
    const pmsData = loadSamplePmsData(path.join(hotel.dir, "mock-pms.json"));
    expect(pmsData.roomTypes.reduce((n, r) => n + r.units, 0)).toBe(5);
    for (const room of pmsData.roomTypes) expect(hotel.knowledgeBase).toContain(room.name);
  });

  it("bilgi tabanı fiyat içermez (fiyatın tek kaynağı PMS'tir)", () => {
    const pmsData = loadSamplePmsData(path.join(hotel.dir, "mock-pms.json"));
    for (const room of pmsData.roomTypes) {
      for (const price of Object.values(room.nightly)) {
        expect(hotel.knowledgeBase).not.toContain(String(price));
        expect(hotel.knowledgeBase).not.toContain(price.toLocaleString("tr-TR"));
      }
    }
  });

  it("geçersiz veri dosyasını açıklayıcı hatayla reddeder", () => {
    expect(() => loadSamplePmsData(path.join(hotel.dir, "hotel.json"))).toThrowError(/geçersiz/);
  });
});
