import { z } from "zod";
import type { HotelConfig } from "../config/hotel.js";
import type { Offer, OfferQuery, PmsClient } from "../pms/types.js";
import { PmsError } from "../pms/types.js";
import type { EventType } from "../store/store.js";
import { formatDate, nightsBetween, validateStay } from "./dates.js";

/** Kanalın misafire kart olarak gösterebileceği müsaitlik sonucu. */
export interface OffersPayload {
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: Array<{
    roomTypeId: string;
    roomTypeName: string;
    boardType: string | null;
    availableRooms: number | null;
    plans: Array<{ rateType: string | null; price: number; discountedPrice: number | null; currency: string; refundable: boolean | null }>;
  }>;
}

/** Araçların çalışırken ihtiyaç duyduğu her şey; kanal ve HTTP'den bağımsızdır. */
export interface ToolContext {
  hotel: HotelConfig;
  pms: PmsClient;
  /** Otelin saat dilimine göre bugün (YYYY-MM-DD). */
  today: string;
  now: Date;
  /** Misafirin dili (kanaldan gelen ipucu); PMS sorgusu ve link için. */
  language: string;
  channel: string;
  /** Kanal müsaitlik sonucunu kart olarak gösterebiliyorsa true (web). */
  showsOfferCards: boolean;
  /** İnsana devir istendiğinde kanal adaptörüne haber verir (web'de form, WhatsApp'ta onay düğmesi). */
  requestHandoff: (summary: string) => void;
  showOffers: (payload: OffersPayload) => void;
  /** Panel istatistikleri için olay kaydı. */
  record: (type: EventType, data: Record<string, unknown>) => void;
  log: (msg: string, extra?: Record<string, unknown>) => void;
}

export interface ToolResult {
  content: string;
  isError: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: { type: "object"; properties: Record<string, unknown>; required: string[]; additionalProperties: false };
}

/** Konuşma başına araç çağrısı sınırına sayılmayan, PMS'e gitmeyen araçlar. */
export const FREE_TOOLS: ReadonlySet<string> = new Set(["bilgi_eksigi_kaydet"]);

const ok = (data: unknown): ToolResult => ({ content: JSON.stringify(data), isError: false });
const fail = (message: string): ToolResult => ({ content: JSON.stringify({ error: message }), isError: true });

const stayProps = {
  giris_tarihi: { type: "string", description: "Check-in date, YYYY-MM-DD." },
  cikis_tarihi: { type: "string", description: "Check-out date, YYYY-MM-DD." },
  yetiskin_sayisi: { type: "integer", description: "Number of adults (1-10)." },
  cocuk_yaslari: {
    type: "array",
    items: { type: "integer" },
    description: "Age of each child, one entry per child. Empty array if no children.",
  },
};

const StayInput = z.object({
  giris_tarihi: z.string(),
  cikis_tarihi: z.string(),
  yetiskin_sayisi: z.number().int().min(1).max(10),
  cocuk_yaslari: z.array(z.number().int().min(0).max(17)).max(6).default([]),
});

const LinkInput = StayInput.extend({ oda_tipi_id: z.string().max(40).optional() });
const HandoffInput = z.object({ talep_ozeti: z.string().min(3).max(600) });
const GapInput = z.object({ soru: z.string().min(3).max(300) });

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "musaitlik_sorgula",
    description:
      "Query live room availability and prices from the hotel's reservation system for a specific stay. " +
      "Call this whenever the guest asks about availability or prices and you know the check-in date, " +
      "check-out date and number of adults. This is the ONLY source of prices and availability. " +
      "When nothing is available it also returns nearby alternative dates that are.",
    input_schema: {
      type: "object",
      properties: stayProps,
      required: ["giris_tarihi", "cikis_tarihi", "yetiskin_sayisi", "cocuk_yaslari"],
      additionalProperties: false,
    },
  },
  {
    name: "rezervasyon_linki_uret",
    description:
      "Build a link to the hotel's online booking engine with the stay details pre-filled. " +
      "Call this when the guest wants to book. The guest completes the booking and payment on that page; " +
      "you never create reservations or handle payment yourself.",
    input_schema: {
      type: "object",
      properties: {
        ...stayProps,
        oda_tipi_id: {
          type: "string",
          description: "roomTypeId from a previous musaitlik_sorgula result, if the guest chose a room type.",
        },
      },
      required: ["giris_tarihi", "cikis_tarihi", "yetiskin_sayisi", "cocuk_yaslari"],
      additionalProperties: false,
    },
  },
  {
    name: "insana_devret",
    description:
      "Hand the conversation over to hotel staff. Call this when the guest asks for a human, or accepts your " +
      "offer of one after you could not answer. The channel then collects the guest's contact details and " +
      "consent itself; you must NOT collect name, phone or e-mail in the chat.",
    input_schema: {
      type: "object",
      properties: {
        talep_ozeti: {
          type: "string",
          description:
            "Short summary of what the guest needs, for reception staff. Include dates/party size if known. " +
            "No personal contact details.",
        },
      },
      required: ["talep_ozeti"],
      additionalProperties: false,
    },
  },
  {
    name: "bilgi_eksigi_kaydet",
    description:
      "Record a question about the hotel that you could not answer because the information is missing from " +
      "what you know. The hotel uses this list to fill the gaps. Call it once for each such question, in the " +
      "same turn in which you tell the guest you don't have the information. Do not call it for off-topic " +
      "requests, for prices/availability, or for things you did answer.",
    input_schema: {
      type: "object",
      properties: {
        soru: {
          type: "string",
          description: "The missing topic as a short neutral question in Turkish, without any personal details.",
        },
      },
      required: ["soru"],
      additionalProperties: false,
    },
  },
];

const PRICE_BASIS_NOTE: Record<HotelConfig["priceBasis"], string> = {
  total_stay: "Prices are the TOTAL for the whole stay.",
  per_night: "Prices are PER NIGHT.",
  unknown:
    "It is NOT confirmed whether prices are per night or for the whole stay. Do not claim either; " +
    "tell the guest the exact total is shown on the booking page.",
};

const DAY_MS = 86_400_000;
const shiftDate = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

function groupOffers(offers: Offer[]): OffersPayload["rooms"] {
  const rooms = new Map<string, OffersPayload["rooms"][number]>();
  for (const o of offers) {
    let room = rooms.get(o.roomTypeId);
    if (!room) {
      room = { roomTypeId: o.roomTypeId, roomTypeName: o.roomTypeName, boardType: o.boardType, availableRooms: o.availableRooms, plans: [] };
      rooms.set(o.roomTypeId, room);
    }
    room.plans.push({ rateType: o.rateType, price: o.price, discountedPrice: o.discountedPrice, currency: o.currency, refundable: o.refundable });
  }
  return [...rooms.values()];
}

/** Aynı gece sayısıyla 1-2 gün öncesi ve sonrasını dener; en fazla iki müsait alternatif döner. */
async function findAlternatives(query: OfferQuery, ctx: ToolContext) {
  const nights = nightsBetween(query.checkIn, query.checkOut);
  const found: Array<{ checkIn: string; checkOut: string; fromPrice: number; currency: string; roomTypes: string[] }> = [];
  for (const shift of [1, -1, 2, -2]) {
    const checkIn = shiftDate(query.checkIn, shift);
    const checkOut = shiftDate(checkIn, nights);
    if (validateStay(checkIn, checkOut, ctx.today)) continue;
    const offers = await ctx.pms.searchOffers({ ...query, checkIn, checkOut });
    if (offers.length === 0) continue;
    const cheapest = offers.reduce((a, b) => ((b.discountedPrice ?? b.price) < (a.discountedPrice ?? a.price) ? b : a));
    found.push({
      checkIn,
      checkOut,
      fromPrice: cheapest.discountedPrice ?? cheapest.price,
      currency: cheapest.currency,
      roomTypes: [...new Set(offers.map((o) => o.roomTypeName))],
    });
    if (found.length === 2) break;
  }
  return found;
}

async function musaitlikSorgula(raw: unknown, ctx: ToolContext): Promise<ToolResult> {
  const parsed = StayInput.safeParse(raw);
  if (!parsed.success) return fail(`Invalid input: ${z.prettifyError(parsed.error)}`);
  const input = parsed.data;
  const problem = validateStay(input.giris_tarihi, input.cikis_tarihi, ctx.today);
  if (problem) return fail(problem);

  const query: OfferQuery = {
    checkIn: input.giris_tarihi,
    checkOut: input.cikis_tarihi,
    adults: input.yetiskin_sayisi,
    childAges: input.cocuk_yaslari,
    currency: ctx.hotel.currency,
    language: ctx.language,
  };
  const nights = nightsBetween(query.checkIn, query.checkOut);
  try {
    const offers = await ctx.pms.searchOffers(query);
    ctx.record("availability_query", { checkIn: query.checkIn, checkOut: query.checkOut, adults: query.adults, children: query.childAges.length, available: offers.length > 0 });
    const base = { checkIn: query.checkIn, checkOut: query.checkOut, nights, adults: query.adults, childAges: query.childAges };

    if (offers.length === 0) {
      // Alternatif arama başarısız olursa asıl sonuç ("müsait değil") yine de geçerlidir.
      const alternatives = await findAlternatives(query, ctx).catch(() => []);
      return ok({
        ...base,
        available: false,
        offers: [],
        alternatives,
        note: alternatives.length
          ? "Nothing is available for the requested dates. `alternatives` lists nearby dates that ARE available, with the lowest price for each (" +
            PRICE_BASIS_NOTE[ctx.hotel.priceBasis] +
            "). Offer them to the guest; query again for full details if they pick one."
          : "Nothing is available for the requested dates or within two days either side. Suggest trying other dates.",
      });
    }

    if (ctx.showsOfferCards) ctx.showOffers({ checkIn: query.checkIn, checkOut: query.checkOut, nights, rooms: groupOffers(offers) });
    // "En düşük fiyat" kodda hesaplanır; modelin listeden kendisi seçmesi hataya açıktır.
    const cheapest = offers.reduce((a, b) => ((b.discountedPrice ?? b.price) < (a.discountedPrice ?? a.price) ? b : a));
    return ok({
      ...base,
      available: true,
      priceNote: PRICE_BASIS_NOTE[ctx.hotel.priceBasis],
      lowestPrice: {
        amount: cheapest.discountedPrice ?? cheapest.price,
        currency: cheapest.currency,
        roomTypeName: cheapest.roomTypeName,
        rateType: cheapest.rateType,
        note: "Use exactly this if you mention a starting or lowest price, and name its rate type.",
      },
      ...(ctx.showsOfferCards
        ? {
            displayNote:
              "The guest already sees every room and price from this result as cards with a booking button, right below " +
              "your message. Don't repeat the full list: answer in one to three sentences (for example the dates, how " +
              "many options there are, lowestPrice, anything relevant to what they asked) and point to the cards.",
          }
        : {}),
      offers,
    });
  } catch (err) {
    const kind = err instanceof PmsError ? err.kind : "unknown";
    ctx.log("pms_error", { kind, hotelId: ctx.hotel.id, message: err instanceof Error ? err.message : String(err) });
    return fail(
      "The reservation system could not be reached, so availability and prices are unknown right now. " +
        "Tell the guest this plainly, do not state any price or availability, and offer human handoff.",
    );
  }
}

export function buildBookingLink(hotel: HotelConfig, input: z.infer<typeof LinkInput>, language: string): string {
  const values: Record<string, string> = {
    checkin: formatDate(input.giris_tarihi, hotel.bookingLink.dateFormat),
    checkout: formatDate(input.cikis_tarihi, hotel.bookingLink.dateFormat),
    adults: String(input.yetiskin_sayisi),
    children: String(input.cocuk_yaslari.length),
    childAges: input.cocuk_yaslari.join(","),
    roomTypeId: input.oda_tipi_id ?? "",
    language,
    currency: hotel.currency,
  };
  const filled = hotel.bookingLink.template.replace(/\{(\w+)\}/g, (_, key: string) =>
    encodeURIComponent(values[key] ?? ""),
  );
  // Değeri boş kalan sorgu parametreleri (ör. oda tipi seçilmediyse) linkten çıkarılır.
  const url = new URL(filled);
  for (const [key, value] of [...url.searchParams.entries()]) {
    if (value === "") url.searchParams.delete(key);
  }
  return url.toString();
}

function rezervasyonLinkiUret(raw: unknown, ctx: ToolContext): ToolResult {
  const parsed = LinkInput.safeParse(raw);
  if (!parsed.success) return fail(`Invalid input: ${z.prettifyError(parsed.error)}`);
  const problem = validateStay(parsed.data.giris_tarihi, parsed.data.cikis_tarihi, ctx.today);
  if (problem) return fail(problem);
  const url = buildBookingLink(ctx.hotel, parsed.data, ctx.language);
  ctx.record("link_created", { url, checkIn: parsed.data.giris_tarihi, checkOut: parsed.data.cikis_tarihi, roomTypeId: parsed.data.oda_tipi_id ?? null });
  return ok({ url, note: "Give this exact URL to the guest. Booking and payment happen only on that page." });
}

/** Ekibin dönüş yaptığı saatler içinde miyiz? Saat tanımlı değilse her zaman evet. */
export function teamAvailable(hotel: HotelConfig, now: Date): boolean {
  const hours = hotel.handoff.hours;
  if (!hours) return true;
  const hhmm = new Intl.DateTimeFormat("en-GB", { timeZone: hotel.timezone, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  return hours.open <= hours.close ? hhmm >= hours.open && hhmm < hours.close : hhmm >= hours.open || hhmm < hours.close;
}

function insanaDevret(raw: unknown, ctx: ToolContext): ToolResult {
  const parsed = HandoffInput.safeParse(raw);
  if (!parsed.success) return fail(`Invalid input: ${z.prettifyError(parsed.error)}`);
  ctx.requestHandoff(parsed.data.talep_ozeti);

  const hours = ctx.hotel.handoff.hours;
  const timing =
    hours && !teamAvailable(ctx.hotel, ctx.now)
      ? ` The hotel team is currently outside its working hours (${hours.open}-${hours.close}, hotel time); ` +
        "tell the guest they will be contacted once the team is back, not right away."
      : "";
  const how =
    ctx.channel === "whatsapp"
      ? "A message with confirm/cancel buttons was just sent to the guest. If they confirm, their WhatsApp name and " +
        "number are shared with reception so the team can reply. Tell them briefly to tap confirm."
      : "A contact form is now shown to the guest below your message. Tell them briefly to fill it in so " +
        "reception can get back to them.";
  return ok({
    status: ctx.channel === "whatsapp" ? "consent_prompt_sent" : "contact_form_shown",
    note: `${how} Nothing has been sent to the hotel yet. Do not ask for their details in chat.${timing}`,
  });
}

function bilgiEksigiKaydet(raw: unknown, ctx: ToolContext): ToolResult {
  const parsed = GapInput.safeParse(raw);
  if (!parsed.success) return fail(`Invalid input: ${z.prettifyError(parsed.error)}`);
  ctx.record("unanswered", { question: parsed.data.soru });
  return ok({ status: "recorded", note: "Recorded for the hotel. Don't mention this to the guest." });
}

export async function executeTool(name: string, input: unknown, ctx: ToolContext): Promise<ToolResult> {
  switch (name) {
    case "musaitlik_sorgula":
      return musaitlikSorgula(input, ctx);
    case "rezervasyon_linki_uret":
      return rezervasyonLinkiUret(input, ctx);
    case "insana_devret":
      return insanaDevret(input, ctx);
    case "bilgi_eksigi_kaydet":
      return bilgiEksigiKaydet(input, ctx);
    default:
      return fail(`Unknown tool: ${name}`);
  }
}
