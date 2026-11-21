import fs from "node:fs";
import { z } from "zod";
import type { Offer, OfferQuery, PmsClient } from "./types.js";
import { PmsError } from "./types.js";

/**
 * Dosyadan beslenen sanal PMS. Gerçek API bağlanana kadar bir otelin oda tiplerini,
 * sezon fiyatlarını ve doluluk durumunu `hotels/<id>/mock-pms.json` içinden okur.
 * Bilgi tabanındaki odalarla aynı veriyi kullanarak gerçeğe yakın bir müşteri testi sağlar.
 */

const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const MonthDay = z.string().regex(/^\d{2}-\d{2}$/);

export const SamplePmsDataSchema = z.object({
  currency: z.string().length(3),
  boardType: z.string(),
  /** Pansiyon adının diğer dillerdeki karşılığı: dil → ad. */
  boardTypeNames: z.record(z.string(), z.string()).default({}),
  /** Sezon dışında kalan her gün bu sezondan fiyatlanır. */
  defaultSeason: z.string(),
  /** Yıl içinde tekrar eden sezon aralıkları (AA-GG, uçlar dahil). */
  seasons: z.array(z.object({ name: z.string(), from: MonthDay, to: MonthDay })),
  /** Cuma ve cumartesi gecelerine uygulanan fark (%). */
  weekendSurchargePercent: z.number().min(0).default(0),
  children: z.object({
    /** Bu yaşın altındaki çocuklar ücretsizdir. */
    freeUnderAge: z.number().int().min(0),
    /** Bu yaşa kadar (dahil) çocuk fiyatı uygulanır; üstü yetişkin sayılır. */
    maxChildAge: z.number().int().min(0),
    perNight: z.number().min(0),
  }),
  ratePlans: z
    .array(
      z.object({
        name: z.string(),
        names: z.record(z.string(), z.string()).default({}),
        refundable: z.boolean(),
        discountPercent: z.number().min(0).max(90).default(0),
        cancellationNote: z.string().nullable().default(null),
        cancellationNotes: z.record(z.string(), z.string()).default({}),
      }),
    )
    .min(1),
  /** Sezona göre asgari konaklama süresi (gece). */
  minStay: z.record(z.string(), z.number().int().positive()).default({}),
  roomTypes: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        /** Oda adının diğer dillerdeki karşılığı: dil → ad. Sorgu dili burada yoksa `name` kullanılır. */
        names: z.record(z.string(), z.string()).default({}),
        /** Sohbet kartında gösterilecek fotoğrafın yolu. */
        image: z.string().regex(/^\/img\/[a-z0-9-]+\/[a-z0-9-]+[.](webp|jpg|png)$/).optional(),
        /** Bu tipten kaç fiziksel oda var. */
        units: z.number().int().positive(),
        maxAdults: z.number().int().positive(),
        maxChildren: z.number().int().min(0),
        maxGuests: z.number().int().positive(),
        /** Gecelik fiyata dahil kişi sayısı. */
        baseOccupancy: z.number().int().positive().default(2),
        extraAdultPerNight: z.number().min(0).default(0),
        /** Sezon adı → gecelik fiyat. */
        nightly: z.record(z.string(), z.number().positive()),
      }),
    )
    .min(1),
  /** Dolu odalar: `to` çıkış günüdür, o gece oda boştur. */
  bookings: z.array(z.object({ roomTypeId: z.string(), from: IsoDate, to: IsoDate, units: z.number().int().positive().default(1) })).default([]),
  /** Giriş günü bu tarihlerden biriyse sistem arızası taklit edilir (hata yolunu denemek için). */
  outageDates: z.array(IsoDate).default([]),
});

export type SamplePmsData = z.infer<typeof SamplePmsDataSchema>;

export function loadSamplePmsData(file: string): SamplePmsData {
  const parsed = SamplePmsDataSchema.safeParse(JSON.parse(fs.readFileSync(file, "utf8")));
  if (!parsed.success) throw new Error(`${file} geçersiz:\n${z.prettifyError(parsed.error)}`);
  const data = parsed.data;
  const seasonNames = new Set([data.defaultSeason, ...data.seasons.map((s) => s.name)]);
  for (const room of data.roomTypes) {
    for (const season of seasonNames) {
      if (room.nightly[season] === undefined) throw new Error(`${file}: "${room.name}" için "${season}" sezon fiyatı yok`);
    }
  }
  for (const b of data.bookings) {
    if (!data.roomTypes.some((r) => r.id === b.roomTypeId)) throw new Error(`${file}: bilinmeyen oda tipi "${b.roomTypeId}"`);
  }
  return data;
}

const DAY = 86_400_000;
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function stayNights(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  for (let t = Date.parse(`${checkIn}T00:00:00Z`); t < Date.parse(`${checkOut}T00:00:00Z`); t += DAY) nights.push(toIso(t));
  return nights;
}

export class SamplePmsClient implements PmsClient {
  constructor(private readonly data: SamplePmsData) {}

  private seasonOf(date: string): string {
    const md = date.slice(5);
    for (const s of this.data.seasons) {
      // Yıl sonunu aşan aralıklar (ör. 12-20 → 01-05) da desteklenir.
      const inRange = s.from <= s.to ? md >= s.from && md <= s.to : md >= s.from || md <= s.to;
      if (inRange) return s.name;
    }
    return this.data.defaultSeason;
  }

  async searchOffers(q: OfferQuery): Promise<Offer[]> {
    const d = this.data;
    if (d.outageDates.includes(q.checkIn)) throw new PmsError("network", "Sanal PMS: simüle edilmiş arıza");

    const nights = stayNights(q.checkIn, q.checkOut);
    if (nights.length === 0) return [];
    const minStay = d.minStay[this.seasonOf(q.checkIn)] ?? 1;
    if (nights.length < minStay) return [];

    // Çocuk yaş sınırını aşanlar yetişkin sayılır.
    const children = q.childAges.filter((age) => age <= d.children.maxChildAge);
    const adults = q.adults + (q.childAges.length - children.length);
    const payingChildren = children.filter((age) => age >= d.children.freeUnderAge).length;

    const lang = q.language.slice(0, 2).toLowerCase();
    const offers: Offer[] = [];
    for (const room of d.roomTypes) {
      if (adults > room.maxAdults || children.length > room.maxChildren) continue;
      if (adults + children.length > room.maxGuests) continue;

      // Konaklamanın her gecesinde boş kalan oda sayısının en küçüğü satılabilir adettir.
      let available = room.units;
      for (const night of nights) {
        const booked = d.bookings
          .filter((b) => b.roomTypeId === room.id && b.from <= night && night < b.to)
          .reduce((sum, b) => sum + b.units, 0);
        available = Math.min(available, room.units - booked);
      }
      if (available <= 0) continue;

      let total = 0;
      for (const night of nights) {
        const weekday = new Date(`${night}T00:00:00Z`).getUTCDay();
        const weekend = weekday === 5 || weekday === 6 ? 1 + d.weekendSurchargePercent / 100 : 1;
        total +=
          room.nightly[this.seasonOf(night)]! * weekend +
          Math.max(0, adults - room.baseOccupancy) * room.extraAdultPerNight +
          payingChildren * d.children.perNight;
      }
      total = Math.round(total);

      for (const plan of d.ratePlans) {
        offers.push({
          roomTypeId: room.id,
          roomTypeName: room.names[lang] ?? room.name,
          boardType: d.boardTypeNames[lang] ?? d.boardType,
          rateType: plan.names[lang] ?? plan.name,
          availableRooms: available,
          price: total,
          discountedPrice: plan.discountPercent > 0 ? Math.round(total * (1 - plan.discountPercent / 100)) : null,
          currency: d.currency,
          refundable: plan.refundable,
          cancellationNote: plan.cancellationNotes[lang] ?? plan.cancellationNote,
          minStayNights: minStay > 1 ? minStay : null,
          imagePath: room.image ?? null,
        });
      }
    }
    return offers;
  }
}
