import type { Limits } from "../config/env.js";
import type { Hotel } from "../config/hotel.js";
import type { ChatMessage, Llm, ToolResultBlock, ToolUseBlock } from "../llm/types.js";
import type { PmsClient } from "../pms/types.js";
import type { Session, Store } from "../store/store.js";
import { todayInZone } from "../tools/dates.js";
import { executeTool, FREE_TOOLS, TOOL_DEFINITIONS, type OffersPayload, type ToolContext } from "../tools/index.js";
import { buildSystemPrompt } from "./prompt.js";

/** Kanal adaptörüne (web SSE, WhatsApp) giden olaylar. */
export type ChatEvent =
  | { type: "text"; delta: string }
  | { type: "tool"; name: string }
  | { type: "offers"; payload: OffersPayload }
  | { type: "handoff_form"; summary: string }
  | { type: "notice"; code: NoticeCode; message: string };

export type NoticeCode = "error" | "refused" | "session_full" | "budget";

const NOTICES: Record<NoticeCode, Record<string, string>> = {
  error: {
    tr: "Şu anda yanıt veremiyorum. Lütfen biraz sonra tekrar deneyin ya da otel ekibimizle görüşmek için “yetkili” yazın.",
    en: "I can't respond right now. Please try again shortly, or type “human” to reach our hotel team.",
    de: "Ich kann gerade nicht antworten. Bitte versuchen Sie es gleich noch einmal oder schreiben Sie „Mitarbeiter“, um unser Hotelteam zu erreichen.",
    ru: "Сейчас я не могу ответить. Пожалуйста, попробуйте чуть позже или напишите «оператор», чтобы связаться с нашей командой.",
    ar: "لا أستطيع الرد الآن. يُرجى المحاولة بعد قليل، أو اكتبوا «موظف» للتواصل مع فريق الفندق.",
  },
  refused: {
    tr: "Bu konuda yardımcı olamıyorum. Otelimizle ilgili başka bir sorunuz varsa memnuniyetle yanıtlarım.",
    en: "I can't help with that. I'm happy to answer any other question about our hotel.",
    de: "Dabei kann ich nicht helfen. Andere Fragen zu unserem Hotel beantworte ich gern.",
    ru: "С этим я помочь не могу. С удовольствием отвечу на другие вопросы о нашем отеле.",
    ar: "لا أستطيع المساعدة في ذلك. يسعدني الإجابة عن أي سؤال آخر حول فندقنا.",
  },
  session_full: {
    tr: "Bu sohbet azami uzunluğa ulaştı. Devam etmek için lütfen yeni bir sohbet başlatın.",
    en: "This chat has reached its maximum length. Please start a new chat to continue.",
    de: "Dieser Chat hat die maximale Länge erreicht. Bitte starten Sie einen neuen Chat.",
    ru: "Этот чат достиг максимальной длины. Пожалуйста, начните новый чат.",
    ar: "وصلت هذه المحادثة إلى الحد الأقصى. يُرجى بدء محادثة جديدة.",
  },
  budget: {
    tr: "Asistanımız şu anda hizmet veremiyor. Lütfen otel ekibimizle doğrudan iletişime geçin.",
    en: "Our assistant is unavailable at the moment. Please contact our hotel team directly.",
    de: "Unser Assistent ist derzeit nicht verfügbar. Bitte wenden Sie sich direkt an unser Hotelteam.",
    ru: "Наш ассистент сейчас недоступен. Пожалуйста, свяжитесь с командой отеля напрямую.",
    ar: "المساعد غير متاح حاليًا. يُرجى التواصل مع فريق الفندق مباشرة.",
  },
};

export function noticeText(code: NoticeCode, language: string): string {
  const lang = language.slice(0, 2).toLowerCase();
  return NOTICES[code][lang] ?? NOTICES[code].en!;
}

export interface ChatDeps {
  llm: Llm;
  store: Store;
  limits: Limits;
  pmsFor: (hotelId: string) => PmsClient;
  log: (msg: string, extra?: Record<string, unknown>) => void;
  /** İşletme uyarısı (PMS arızası, model hatası, bütçe aşımı). Verilmezse yalnızca loglanır. */
  alert?: (kind: string, hotelId: string, detail: string) => void;
  now?: () => Date;
}

export interface TurnInput {
  hotel: Hotel;
  session: Session;
  text: string;
  language: string;
  /** Kanal müsaitlik sonucunu kart olarak gösterebiliyor mu? */
  showsOfferCards?: boolean;
  emit: (event: ChatEvent) => void;
}

/**
 * Tek bir misafir mesajını işler: modeli çağırır, araçları yürütür, sonucu akıtır.
 * Tur ancak başarıyla biterse kaydedilir; hata olursa geçmiş değişmeden kalır.
 */
export async function runChatTurn(deps: ChatDeps, input: TurnInput): Promise<void> {
  const { hotel, session, language, emit } = input;
  const { limits, store } = deps;
  const hotelId = hotel.config.id;
  const notify = (code: NoticeCode) => emit({ type: "notice", code, message: noticeText(code, language) });

  if (session.turns >= limits.maxTurnsPerSession) return notify("session_full");

  const budget = hotel.config.monthlyTokenLimit;
  if (budget !== undefined) {
    const used = store.getMonthUsage(hotelId);
    const total = used.inputTokens + used.outputTokens + used.cacheReadTokens + used.cacheWriteTokens;
    if (total >= budget) {
      deps.alert?.("budget_exceeded", hotelId, `Aylık token sınırı (${budget}) aşıldı; asistan yeni mesaj almıyor.`);
      return notify("budget");
    }
  }

  const now = deps.now?.() ?? new Date();
  const today = todayInZone(hotel.config.timezone, now);
  const system = buildSystemPrompt(hotel, today, language);
  const history = store.getMessages(session.id);
  const turn: ChatMessage[] = [{ role: "user", content: input.text }];

  let pendingHandoff: string | null = null;
  let toolCalls = 0;
  let toolRounds = 0;
  const ctx: ToolContext = {
    hotel: hotel.config,
    pms: deps.pmsFor(hotelId),
    today,
    now,
    language,
    channel: session.channel,
    showsOfferCards: input.showsOfferCards ?? false,
    requestHandoff: (summary) => {
      pendingHandoff = summary;
      emit({ type: "handoff_form", summary });
    },
    showOffers: (payload) => emit({ type: "offers", payload }),
    record: (type, data) => store.recordEvent(hotelId, session.id, type, data),
    log: (msg, extra) => {
      deps.log(msg, extra);
      if (msg === "pms_error") deps.alert?.("pms_error", hotelId, String(extra?.message ?? ""));
    },
  };

  try {
    // Her tur en fazla maxToolRoundsPerTurn araç turu + son cevap için bir çağrı yapar.
    for (let step = 0; step <= limits.maxToolRoundsPerTurn + 1; step++) {
      const reply = await deps.llm.streamTurn(
        { system, messages: [...history, ...turn], tools: TOOL_DEFINITIONS },
        (delta) => emit({ type: "text", delta }),
      );
      // Tur sonradan başarısız olsa bile harcanan token sayılır.
      if (reply.usage) store.addUsage(hotelId, reply.usage);

      if (reply.stopReason === "refusal") return notify("refused");

      turn.push({ role: "assistant", content: reply.content });
      const toolUses = reply.content.filter((b): b is ToolUseBlock => b.type === "tool_use");
      if (reply.stopReason !== "tool_use" || toolUses.length === 0) {
        // max_tokens ile kesilmiş bir araç çağrısı yürütülmez; tur kaydedilmeden hata verilir.
        if (toolUses.length > 0) throw new Error(`tool_use turn ended with stop_reason=${reply.stopReason}`);
        break;
      }
      if (step > limits.maxToolRoundsPerTurn) throw new Error("model kept calling tools past the round limit");

      const roundAllowed = toolRounds < limits.maxToolRoundsPerTurn;
      toolRounds++;
      const results: ToolResultBlock[] = [];
      for (const use of toolUses) {
        const free = FREE_TOOLS.has(use.name);
        const overBudget = !free && session.toolCalls + toolCalls >= limits.maxToolCallsPerSession;
        if (!roundAllowed || overBudget) {
          if (overBudget) deps.log("tool_limit", { sessionId: session.id });
          results.push({
            type: "tool_result",
            tool_use_id: use.id,
            is_error: true,
            content: JSON.stringify({
              error:
                "Tool call limit reached for this conversation. Do not call more tools. " +
                "Answer with what you already have, or offer human handoff.",
            }),
          });
          continue;
        }
        if (!free) {
          toolCalls++;
          emit({ type: "tool", name: use.name });
        }
        const result = await executeTool(use.name, use.input, ctx);
        results.push({ type: "tool_result", tool_use_id: use.id, content: result.content, is_error: result.isError });
      }
      turn.push({ role: "user", content: results });
    }
    store.appendTurn(session.id, turn, toolCalls, pendingHandoff);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    deps.log("chat_turn_failed", { sessionId: session.id, error: detail });
    deps.alert?.("chat_turn_failed", hotelId, detail);
    notify("error");
  }
}
