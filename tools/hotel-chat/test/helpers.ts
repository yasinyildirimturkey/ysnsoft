import type { Limits } from "../src/config/env.js";
import { HotelConfigSchema, type Hotel } from "../src/config/hotel.js";
import type { ContentBlock, Llm, LlmRequest, LlmTurn } from "../src/llm/types.js";

export const LIMITS: Limits = {
  maxMessageChars: 200,
  ipPerMinute: 100,
  ipPerDay: 1000,
  sessionPerMinute: 100,
  maxTurnsPerSession: 5,
  maxToolCallsPerSession: 3,
  maxToolRoundsPerTurn: 2,
};

export function testHotel(overrides: Record<string, unknown> = {}): Hotel {
  const config = HotelConfigSchema.parse({
    id: "test-otel",
    name: "Test Otel",
    city: "İzmir",
    website: "https://test.example.com",
    languages: ["tr", "en"],
    defaultLanguage: "tr",
    currency: "TRY",
    pms: { type: "mock" },
    priceBasis: "total_stay",
    bookingLink: {
      template: "https://book.example.com/?in={checkin}&out={checkout}&a={adults}&ages={childAges}&room={roomTypeId}",
    },
    handoff: { email: "resepsiyon@test.example.com" },
    privacy: {
      noticeUrl: "https://test.example.com/kvkk",
      notice: { tr: "Aydınlatma", en: "Notice" },
      consentLabel: { tr: "Rıza", en: "Consent" },
      retentionDays: 30,
    },
    widget: {
      allowedOrigins: ["https://test.example.com"],
      title: { tr: "Asistan", en: "Assistant" },
      welcome: { tr: "Merhaba", en: "Hello" },
    },
    ...overrides,
  });
  return { dir: ".", config, knowledgeBase: "Giriş saati 14:00." };
}

export const text = (t: string): LlmTurn => ({
  content: [{ type: "text", text: t, citations: null } as ContentBlock],
  stopReason: "end_turn",
});

export const toolCall = (name: string, input: unknown, id = `toolu_${name}`): LlmTurn => ({
  content: [{ type: "tool_use", id, name, input } as ContentBlock],
  stopReason: "tool_use",
});

/** Önceden yazılmış adımları sırayla oynatan sahte model; aldığı istekleri kaydeder. */
export class ScriptedLlm implements Llm {
  readonly requests: LlmRequest[] = [];
  constructor(private readonly steps: Array<LlmTurn | Error>) {}

  async streamTurn(request: LlmRequest, onText: (delta: string) => void): Promise<LlmTurn> {
    this.requests.push(structuredClone(request));
    const step = this.steps.shift();
    if (!step) throw new Error("ScriptedLlm: adım kalmadı");
    if (step instanceof Error) throw step;
    for (const b of step.content) if (b.type === "text") onText(b.text);
    return step;
  }
}

/** Bir istekte modele dönen son tool_result içeriklerini verir. */
export function toolResultsOf(request: LlmRequest): Array<{ content: Record<string, unknown>; isError: boolean }> {
  const last = request.messages[request.messages.length - 1]!;
  if (!last.content || typeof last.content === "string") return [];
  return last.content.flatMap((b) =>
    b.type === "tool_result"
      ? [{ content: JSON.parse(b.content as string) as Record<string, unknown>, isError: b.is_error === true }]
      : [],
  );
}
