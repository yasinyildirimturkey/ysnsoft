import { z } from "zod";
import type { HotelConfig } from "../config/hotel.js";
import type { PmsClient } from "../pms/types.js";
import { PmsError } from "../pms/types.js";
import { formatDate, nightsBetween, validateStay } from "./dates.js";

/** Araçların çalışırken ihtiyaç duyduğu her şey; kanal ve HTTP'den bağımsızdır. */
export interface ToolContext {
  hotel: HotelConfig;
  pms: PmsClient;
  /** Otelin saat dilimine göre bugün (YYYY-MM-DD). */
  today: string;
  /** Misafirin dili (widget'tan gelen ipucu); PMS sorgusu ve link için. */
  language: string;
  /** İnsana devir istendiğinde kanal adaptörüne haber verir (web'de form açılır). */
  requestHandoff: (summary: string) => void;
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

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "musaitlik_sorgula",
    description:
      "Query live room availability and prices from the hotel's reservation system for a specific stay. " +
      "Call this whenever the guest asks about availability or prices and you know the check-in date, " +
      "check-out date and number of adults. This is the ONLY source of prices and availability.",
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
      "offer of one after you could not answer. It shows the guest a secure contact form (name, contact, consent); " +
      "you must NOT collect name, phone or e-mail in the chat yourself.",
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
];

const PRICE_BASIS_NOTE: Record<HotelConfig["priceBasis"], string> = {
  total_stay: "Prices are the TOTAL for the whole stay.",
  per_night: "Prices are PER NIGHT.",
  unknown:
    "It is NOT confirmed whether prices are per night or for the whole stay. Do not claim either; " +
    "tell the guest the exact total is shown on the booking page.",
};

async function musaitlikSorgula(raw: unknown, ctx: ToolContext): Promise<ToolResult> {
  const parsed = StayInput.safeParse(raw);
  if (!parsed.success) return fail(`Invalid input: ${z.prettifyError(parsed.error)}`);
  const input = parsed.data;
  const problem = validateStay(input.giris_tarihi, input.cikis_tarihi, ctx.today);
  if (problem) return fail(problem);

  try {
    const offers = await ctx.pms.searchOffers({
      checkIn: input.giris_tarihi,
      checkOut: input.cikis_tarihi,
      adults: input.yetiskin_sayisi,
      childAges: input.cocuk_yaslari,
      currency: ctx.hotel.currency,
      language: ctx.language,
    });
    return ok({
      checkIn: input.giris_tarihi,
      checkOut: input.cikis_tarihi,
      nights: nightsBetween(input.giris_tarihi, input.cikis_tarihi),
      adults: input.yetiskin_sayisi,
      childAges: input.cocuk_yaslari,
      available: offers.length > 0,
      priceNote: PRICE_BASIS_NOTE[ctx.hotel.priceBasis],
      offers,
    });
  } catch (err) {
    const kind = err instanceof PmsError ? err.kind : "unknown";
    ctx.log("pms_error", { kind, message: err instanceof Error ? err.message : String(err) });
    return fail(
      "The reservation system could not be reached, so availability and prices are unknown right now. " +
        "Tell the guest this plainly, do not state any price or availability, and offer human handoff.",
    );
  }
}

export function buildBookingLink(
  hotel: HotelConfig,
  input: z.infer<typeof LinkInput>,
  language: string,
): string {
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
  return ok({
    url: buildBookingLink(ctx.hotel, parsed.data, ctx.language),
    note: "Give this exact URL to the guest. Booking and payment happen only on that page.",
  });
}

function insanaDevret(raw: unknown, ctx: ToolContext): ToolResult {
  const parsed = HandoffInput.safeParse(raw);
  if (!parsed.success) return fail(`Invalid input: ${z.prettifyError(parsed.error)}`);
  ctx.requestHandoff(parsed.data.talep_ozeti);
  return ok({
    status: "contact_form_shown",
    note:
      "A contact form is now shown to the guest below your message. Tell them briefly to fill it in so " +
      "reception can get back to them. Nothing has been sent to the hotel yet. Do not ask for their details in chat.",
  });
}

export async function executeTool(name: string, input: unknown, ctx: ToolContext): Promise<ToolResult> {
  switch (name) {
    case "musaitlik_sorgula":
      return musaitlikSorgula(input, ctx);
    case "rezervasyon_linki_uret":
      return rezervasyonLinkiUret(input, ctx);
    case "insana_devret":
      return insanaDevret(input, ctx);
    default:
      return fail(`Unknown tool: ${name}`);
  }
}
