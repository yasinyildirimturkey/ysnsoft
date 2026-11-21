import type { Limits } from "../config/env.js";
import type { Hotel } from "../config/hotel.js";
import type { ChatMessage, Llm, ToolResultBlock, ToolUseBlock } from "../llm/types.js";
import type { PmsClient } from "../pms/types.js";
import type { Session, Store } from "../store/store.js";
import { todayInZone } from "../tools/dates.js";
import { executeTool, TOOL_DEFINITIONS, type ToolContext } from "../tools/index.js";
import { buildSystemPrompt } from "./prompt.js";

/** Kanal adaptörüne (web SSE, ileride WhatsApp) giden olaylar. */
export type ChatEvent =
  | { type: "text"; delta: string }
  | { type: "tool"; name: string }
  | { type: "handoff_form"; summary: string }
  | { type: "notice"; code: NoticeCode; message: string };

export type NoticeCode = "error" | "refused" | "session_full" | "tool_limit";

const NOTICES: Record<NoticeCode, { tr: string; en: string }> = {
  error: {
    tr: "Şu anda yanıt veremiyorum. Lütfen biraz sonra tekrar deneyin ya da otel ekibimizle görüşmek için “yetkili” yazın.",
    en: "I can't respond right now. Please try again shortly, or type “human” to reach our hotel team.",
  },
  refused: {
    tr: "Bu konuda yardımcı olamıyorum. Otelimizle ilgili başka bir sorunuz varsa memnuniyetle yanıtlarım.",
    en: "I can't help with that. I'm happy to answer any other question about our hotel.",
  },
  session_full: {
    tr: "Bu sohbet azami uzunluğa ulaştı. Devam etmek için lütfen yeni bir sohbet başlatın.",
    en: "This chat has reached its maximum length. Please start a new chat to continue.",
  },
  tool_limit: {
    tr: "Bu sohbette daha fazla sorgu yapamıyorum. Otel ekibimiz size yardımcı olabilir.",
    en: "I can't run more lookups in this chat. Our hotel team can help you further.",
  },
};

export function noticeText(code: NoticeCode, language: string): string {
  return language.toLowerCase().startsWith("tr") ? NOTICES[code].tr : NOTICES[code].en;
}

export interface ChatDeps {
  llm: Llm;
  store: Store;
  limits: Limits;
  pmsFor: (hotelId: string) => PmsClient;
  log: (msg: string, extra?: Record<string, unknown>) => void;
  now?: () => Date;
}

export interface TurnInput {
  hotel: Hotel;
  session: Session;
  text: string;
  language: string;
  emit: (event: ChatEvent) => void;
}

/**
 * Tek bir misafir mesajını işler: modeli çağırır, araçları yürütür, sonucu akıtır.
 * Tur ancak başarıyla biterse kaydedilir; hata olursa geçmiş değişmeden kalır.
 */
export async function runChatTurn(deps: ChatDeps, input: TurnInput): Promise<void> {
  const { hotel, session, language, emit } = input;
  const { limits, store } = deps;
  const notify = (code: NoticeCode) => emit({ type: "notice", code, message: noticeText(code, language) });

  if (session.turns >= limits.maxTurnsPerSession) return notify("session_full");

  const today = todayInZone(hotel.config.timezone, deps.now?.());
  const system = buildSystemPrompt(hotel, today, language);
  const history = store.getMessages(session.id);
  const turn: ChatMessage[] = [{ role: "user", content: input.text }];

  let pendingHandoff: string | null = null;
  let toolCalls = 0;
  let toolRounds = 0;
  const ctx: ToolContext = {
    hotel: hotel.config,
    pms: deps.pmsFor(hotel.config.id),
    today,
    language,
    requestHandoff: (summary) => {
      pendingHandoff = summary;
      emit({ type: "handoff_form", summary });
    },
    log: deps.log,
  };

  try {
    // Her tur en fazla maxToolRoundsPerTurn araç turu + son cevap için bir çağrı yapar.
    for (let step = 0; step <= limits.maxToolRoundsPerTurn + 1; step++) {
      const reply = await deps.llm.streamTurn(
        { system, messages: [...history, ...turn], tools: TOOL_DEFINITIONS },
        (delta) => emit({ type: "text", delta }),
      );

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
        const overBudget = session.toolCalls + toolCalls >= limits.maxToolCallsPerSession;
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
        toolCalls++;
        emit({ type: "tool", name: use.name });
        const result = await executeTool(use.name, use.input, ctx);
        results.push({ type: "tool_result", tool_use_id: use.id, content: result.content, is_error: result.isError });
      }
      turn.push({ role: "user", content: results });
    }
    store.appendTurn(session.id, turn, toolCalls, pendingHandoff);
  } catch (err) {
    deps.log("chat_turn_failed", { sessionId: session.id, error: err instanceof Error ? err.message : String(err) });
    notify("error");
  }
}
