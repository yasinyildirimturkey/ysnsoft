/** PMS'ten bağımsız müsaitlik sorgusu. Tarihler YYYY-MM-DD. */
export interface OfferQuery {
  checkIn: string;
  checkOut: string;
  adults: number;
  childAges: number[];
  currency: string;
  language: string;
}

export interface Offer {
  roomTypeId: string;
  roomTypeName: string;
  boardType: string | null;
  rateType: string | null;
  /** Satılabilir oda adedi; PMS bildirmiyorsa null. */
  availableRooms: number | null;
  /** İndirim öncesi fiyat. */
  price: number;
  /** İndirimli fiyat; indirim yoksa null. */
  discountedPrice: number | null;
  currency: string;
  refundable: boolean | null;
  cancellationNote: string | null;
  minStayNights: number | null;
  /** Oda fotoğrafının sohbet sunucusuna göre yolu (ör. /img/otel/oda-640.webp); yoksa null. */
  imagePath?: string | null;
}

export interface PmsClient {
  /** Yalnızca satılabilir teklifleri döner. Müsaitlik yoksa boş dizi. Hata durumunda PmsError fırlatır. */
  searchOffers(query: OfferQuery): Promise<Offer[]>;
}

export type PmsErrorKind = "auth" | "network" | "timeout" | "bad_response" | "config";

export class PmsError extends Error {
  constructor(
    public readonly kind: PmsErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "PmsError";
  }
}
