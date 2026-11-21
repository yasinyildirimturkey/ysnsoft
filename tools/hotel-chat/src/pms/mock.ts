import type { Offer, OfferQuery, PmsClient } from "./types.js";
import { PmsError } from "./types.js";

interface MockRoom {
  id: string;
  name: string;
  maxAdults: number;
  maxGuests: number;
  basePerNight: number;
}

const ROOMS: MockRoom[] = [
  { id: "101", name: "Standart Oda", maxAdults: 2, maxGuests: 3, basePerNight: 3200 },
  { id: "102", name: "Deluxe Oda", maxAdults: 3, maxGuests: 4, basePerNight: 4500 },
  { id: "103", name: "Aile Süiti", maxAdults: 4, maxGuests: 6, basePerNight: 7200 },
];

function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000);
}

/**
 * Geliştirme ve test için sahte PMS. Deterministiktir:
 *  - Giriş günü ayın 13'ü ise hiç müsaitlik yoktur.
 *  - Giriş günü ayın 31'i ise PMS hatası fırlatır (hata yolunu denemek için).
 *  - Fiyatlar TRY bazlı sabit tablodan, toplam konaklama olarak hesaplanır.
 */
export class MockPmsClient implements PmsClient {
  async searchOffers(q: OfferQuery): Promise<Offer[]> {
    const day = Number(q.checkIn.slice(8, 10));
    if (day === 31) throw new PmsError("network", "Mock PMS: simüle edilmiş bağlantı hatası");
    if (day === 13) return [];

    const nights = nightsBetween(q.checkIn, q.checkOut);
    const guests = q.adults + q.childAges.length;
    const month = Number(q.checkIn.slice(5, 7));
    const season = month >= 6 && month <= 9 ? 1.4 : 1;

    return ROOMS.filter((r) => q.adults <= r.maxAdults && guests <= r.maxGuests).map((r) => {
      const perNight = r.basePerNight * season + (q.adults - 1) * 600 + q.childAges.length * 300;
      const price = Math.round(perNight * nights);
      const refundable = r.id !== "101";
      return {
        roomTypeId: r.id,
        roomTypeName: r.name,
        boardType: "Oda Kahvaltı",
        rateType: refundable ? "İade edilebilir" : "İade edilemez",
        availableRooms: 5 - (day % 4),
        price,
        discountedPrice: nights >= 3 ? Math.round(price * 0.9) : null,
        currency: "TRY",
        refundable,
        cancellationNote: refundable ? "Girişten 3 gün öncesine kadar ücretsiz iptal." : null,
        minStayNights: null,
      };
    });
  }
}
