import type { ElektraPmsConfig } from "../config/hotel.js";
import type { Offer, OfferQuery, PmsClient } from "./types.js";
import { PmsError } from "./types.js";

/**
 * ElektraWeb Booking API istemcisi.
 *
 * Kaynak: https://hotel.docs.bookingapi.elektraweb.com/ (Postman koleksiyonu, 2023-05-08 yayını)
 *
 * DOKÜMANDAN DOĞRULANANLAR
 *  - POST {base}/login — gövde {"hotel-id","usercode","password"} veya
 *    başlık "Authorization: Bearer APIKEY_TOKEN".
 *  - GET {base}/hotel/{id}/price/?fromdate&todate&adult&childage&currency&nationality
 *    &onlybestoffer&language — Bearer token ile. Yanıt alanları: aşağıdaki ElektraPriceRow.
 *
 * DOĞRULANAMAYANLAR (gerçek kimlik bilgisiyle denenmeli)
 *  - /login yanıtının biçimi: dokümanda örnek yanıt yok. JWT alanı `loginTokenField`
 *    ile verilebilir; verilmezse yanıtta JWT biçimli TEK değer aranır, yoksa hata.
 *  - JWT ömrü: exp alanı varsa o kullanılır, yoksa `tokenTtlMinutes`. 401'de bir kez yeniden login.
 *  - `price` toplam konaklama mı gecelik mi: belirtilmemiş (hotel.json → priceBasis).
 *  - Hız sınırı ve kullanım koşulları: belirtilmemiş.
 */

export interface ElektraSecrets {
  apiKey?: string;
  usercode?: string;
  password?: string;
}

export function elektraSecretsFromEnv(prefix: string, env: NodeJS.ProcessEnv = process.env): ElektraSecrets {
  const get = (k: string) => env[`${prefix}_${k}`]?.trim() || undefined;
  return { apiKey: get("API_KEY"), usercode: get("USERCODE"), password: get("PASSWORD") };
}

/** Dokümandaki /price örnek yanıtının satır biçimi. */
interface ElektraPriceRow {
  "room-type-id"?: unknown;
  "room-type"?: unknown;
  "board-type"?: unknown;
  "rate-type"?: unknown;
  "room-tosell"?: unknown;
  "stop-sell"?: unknown;
  "stop-sell-closed-to-arrival"?: unknown;
  "min-los"?: unknown;
  price?: unknown;
  "discounted-price"?: unknown;
  currency?: unknown;
  "cancellation-penalty"?: { description?: unknown; "is-refundable"?: unknown } | null;
}

const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function mapPriceRows(rows: unknown, fallbackCurrency: string): Offer[] {
  if (!Array.isArray(rows)) throw new PmsError("bad_response", "Elektra /price yanıtı dizi değil");
  const offers: Offer[] = [];
  for (const row of rows as ElektraPriceRow[]) {
    if (!row || typeof row !== "object") continue;
    const price = num(row.price);
    const roomTypeId = row["room-type-id"];
    const roomTypeName = str(row["room-type"]);
    // Fiyatı ya da oda tipi olmayan satır misafire gösterilemez; uydurmak yerine atlanır.
    if (price === null || price <= 0 || roomTypeName === null) continue;
    if (typeof roomTypeId !== "number" && typeof roomTypeId !== "string") continue;
    if (row["stop-sell"] === true || row["stop-sell-closed-to-arrival"] === true) continue;
    const toSell = num(row["room-tosell"]);
    if (toSell !== null && toSell <= 0) continue;

    const discounted = num(row["discounted-price"]);
    const penalty = row["cancellation-penalty"];
    offers.push({
      roomTypeId: String(roomTypeId),
      roomTypeName,
      boardType: str(row["board-type"]),
      rateType: str(row["rate-type"]),
      availableRooms: toSell,
      price,
      discountedPrice: discounted !== null && discounted > 0 && discounted < price ? discounted : null,
      currency: str(row.currency) ?? fallbackCurrency,
      refundable: typeof penalty?.["is-refundable"] === "boolean" ? penalty["is-refundable"] : null,
      cancellationNote: str(penalty?.description),
      minStayNights: num(row["min-los"]),
    });
  }
  return offers;
}

/** Login yanıtından JWT'yi çıkarır. Alan adı tahmin edilmez. */
export function extractToken(body: unknown, field?: string): string {
  if (field) {
    const v = body && typeof body === "object" ? (body as Record<string, unknown>)[field] : undefined;
    if (typeof v === "string" && v) return v;
    throw new PmsError("auth", `Elektra login yanıtında "${field}" alanı yok`);
  }
  if (typeof body === "string" && JWT_RE.test(body.trim())) return body.trim();
  const found: string[] = [];
  const walk = (v: unknown, depth: number) => {
    if (typeof v === "string") {
      if (JWT_RE.test(v) && v.length > 40) found.push(v);
    } else if (v && typeof v === "object" && depth < 3) {
      for (const child of Object.values(v)) walk(child, depth + 1);
    }
  };
  walk(body, 0);
  const unique = [...new Set(found)];
  if (unique.length === 1) return unique[0]!;
  const keys = body && typeof body === "object" ? Object.keys(body).join(", ") : typeof body;
  throw new PmsError(
    "auth",
    `Elektra login yanıtında JWT belirlenemedi (bulunan aday: ${unique.length}; alanlar: ${keys}). ` +
      `hotel.json → pms.loginTokenField ile alan adını belirtin.`,
  );
}

function jwtExpiryMs(token: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

type FetchFn = typeof fetch;

export class ElektraClient implements PmsClient {
  private token: { value: string; expiresAt: number } | null = null;
  private loginInFlight: Promise<string> | null = null;

  constructor(
    private readonly cfg: ElektraPmsConfig,
    private readonly secrets: ElektraSecrets,
    private readonly fetchFn: FetchFn = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  async searchOffers(q: OfferQuery): Promise<Offer[]> {
    const params = new URLSearchParams({
      fromdate: q.checkIn,
      todate: q.checkOut,
      adult: String(q.adults),
      childage: q.childAges.join(","),
      currency: q.currency,
      nationality: "",
      onlybestoffer: "false",
      language: q.language,
    });
    const url = `${this.cfg.baseUrl}/hotel/${this.cfg.hotelId}/price/?${params}`;

    let res = await this.request(url, { headers: { Authorization: `Bearer ${await this.getToken()}` } });
    if (res.status === 401) {
      this.token = null;
      res = await this.request(url, { headers: { Authorization: `Bearer ${await this.getToken()}` } });
    }
    if (res.status === 401 || res.status === 403) {
      throw new PmsError("auth", `Elektra /price yetki hatası (${res.status})`, res.status);
    }
    if (!res.ok) throw new PmsError("bad_response", `Elektra /price HTTP ${res.status}`, res.status);
    return mapPriceRows(await this.json(res), q.currency);
  }

  private async getToken(): Promise<string> {
    if (this.token && this.token.expiresAt - 60_000 > this.now()) return this.token.value;
    // Eşzamanlı istekler tek login'i paylaşır.
    this.loginInFlight ??= this.login().finally(() => {
      this.loginInFlight = null;
    });
    return this.loginInFlight;
  }

  private async login(): Promise<string> {
    const { apiKey, usercode, password } = this.secrets;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    let body: string;
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
      body = "{}";
    } else if (usercode && password) {
      body = JSON.stringify({ "hotel-id": this.cfg.hotelId, usercode, password });
    } else {
      throw new PmsError(
        "config",
        `Elektra kimlik bilgisi yok: ${this.cfg.secretsEnvPrefix}_API_KEY ya da ` +
          `${this.cfg.secretsEnvPrefix}_USERCODE + ${this.cfg.secretsEnvPrefix}_PASSWORD tanımlayın`,
      );
    }
    const res = await this.request(`${this.cfg.baseUrl}/login`, { method: "POST", headers, body });
    if (!res.ok) throw new PmsError("auth", `Elektra login HTTP ${res.status}`, res.status);
    const value = extractToken(await this.json(res), this.cfg.loginTokenField);
    const expiresAt = jwtExpiryMs(value) ?? this.now() + this.cfg.tokenTtlMinutes * 60_000;
    this.token = { value, expiresAt };
    return value;
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    try {
      return await this.fetchFn(url, { ...init, signal: AbortSignal.timeout(this.cfg.timeoutMs) });
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "TimeoutError" || name === "AbortError") {
        throw new PmsError("timeout", "Elektra isteği zaman aşımına uğradı");
      }
      throw new PmsError("network", "Elektra'ya bağlanılamadı");
    }
  }

  private async json(res: Response): Promise<unknown> {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      // Login düz metin JWT dönebilir; extractToken bunu ele alır.
      return text;
    }
  }
}
