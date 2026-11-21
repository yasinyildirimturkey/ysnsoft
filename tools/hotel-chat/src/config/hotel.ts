import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const Localized = z.record(z.string(), z.string());

const PmsSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("mock") }),
  z.object({
    type: z.literal("elektra"),
    /** Elektra'daki sayısal otel kimliği (URL'deki /hotel/{id}). */
    hotelId: z.number().int().positive(),
    /** Gizli anahtarların ortam değişkeni öneki, ör. ELEKTRA_DEMO → ELEKTRA_DEMO_API_KEY. */
    secretsEnvPrefix: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    baseUrl: z.string().url().default("https://bookingapi.elektraweb.com"),
    /**
     * /login yanıtında JWT'nin bulunduğu alan. Resmi dokümanda örnek yanıt yok;
     * boş bırakılırsa yanıttaki JWT biçimli tek değer kullanılır.
     */
    loginTokenField: z.string().optional(),
    /** JWT'de exp yoksa kaç dakikada bir yeniden login olunacağı. */
    tokenTtlMinutes: z.number().int().positive().default(720),
    timeoutMs: z.number().int().positive().default(10000),
  }),
]);

export const HotelConfigSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  name: z.string().min(1),
  city: z.string().min(1),
  website: z.string().url(),
  timezone: z.string().default("Europe/Istanbul"),
  languages: z.array(z.string().min(2)).min(1),
  defaultLanguage: z.string().min(2),
  currency: z.string().length(3),
  knowledgeBaseFile: z.string().default("bilgi-tabani.md"),

  pms: PmsSchema,
  /**
   * PMS'in döndürdüğü fiyatın anlamı. Elektra dokümanı toplam mı gecelik mi olduğunu
   * belirtmiyor; gerçek yanıtla teyit edilene kadar "unknown" kalmalı.
   */
  priceBasis: z.enum(["total_stay", "per_night", "unknown"]).default("unknown"),

  bookingLink: z.object({
    /**
     * Rezervasyon motoru URL şablonu. Yer tutucular: {checkin} {checkout} {adults}
     * {children} {childAges} {roomTypeId} {language} {currency}
     */
    template: z.string().url(),
    dateFormat: z.enum(["YYYY-MM-DD", "DD.MM.YYYY", "DD-MM-YYYY", "DD/MM/YYYY"]).default("YYYY-MM-DD"),
  }),

  handoff: z.object({
    email: z.string().email(),
    subjectPrefix: z.string().default("[Web sohbet]"),
  }),

  privacy: z.object({
    noticeUrl: z.string().url(),
    notice: Localized,
    consentLabel: Localized,
    /** Sohbet ve devir kayıtlarının saklanacağı gün sayısı. */
    retentionDays: z.number().int().positive(),
  }),

  widget: z.object({
    /** Widget'ın gömülebileceği kökenler (Origin başlığı). "*" yalnızca geliştirme içindir. */
    allowedOrigins: z.array(z.string()).min(1),
    title: Localized,
    welcome: Localized,
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#1f4e79"),
  }),
});

export type HotelConfig = z.infer<typeof HotelConfigSchema>;
export type ElektraPmsConfig = Extract<HotelConfig["pms"], { type: "elektra" }>;

export interface Hotel {
  config: HotelConfig;
  knowledgeBase: string;
}

export function loadHotel(dir: string): Hotel {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, "hotel.json"), "utf8"));
  const parsed = HotelConfigSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`${path.join(dir, "hotel.json")} geçersiz:\n${z.prettifyError(parsed.error)}`);
  }
  const config = parsed.data;
  if (config.id !== path.basename(dir)) {
    throw new Error(`hotel.json içindeki id ("${config.id}") klasör adıyla ("${path.basename(dir)}") aynı olmalı`);
  }
  if (!config.languages.includes(config.defaultLanguage)) {
    throw new Error(`${config.id}: defaultLanguage, languages listesinde olmalı`);
  }
  const knowledgeBase = fs.readFileSync(path.join(dir, config.knowledgeBaseFile), "utf8").trim();
  if (!knowledgeBase) throw new Error(`${config.id}: bilgi tabanı dosyası boş`);
  return { config, knowledgeBase };
}

/** hotels/ altındaki her klasörü bir otel olarak yükler. Yeni otel = yeni klasör. */
export function loadHotels(hotelsDir: string): Map<string, Hotel> {
  const hotels = new Map<string, Hotel>();
  for (const entry of fs.readdirSync(hotelsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
    const hotel = loadHotel(path.join(hotelsDir, entry.name));
    hotels.set(hotel.config.id, hotel);
  }
  if (hotels.size === 0) throw new Error(`${hotelsDir} altında otel bulunamadı`);
  return hotels;
}

export function localized(map: Record<string, string>, lang: string, fallbackLang: string): string {
  return map[lang] ?? map[fallbackLang] ?? Object.values(map)[0] ?? "";
}
