import Anthropic from "@anthropic-ai/sdk";
import type { Env } from "../config/env.js";
import type { Llm, LlmRequest, LlmTurn } from "./types.js";

type Effort = "low" | "medium" | "high" | "xhigh" | "max";
const EFFORTS: readonly string[] = ["low", "medium", "high", "xhigh", "max"];

export class AnthropicLlm implements Llm {
  // Kimlik bilgisi ortamdan çözülür (ANTHROPIC_API_KEY vb.); koda yazılmaz.
  private readonly client = new Anthropic();
  private readonly effort: Effort | undefined;
  private readonly useFallback: boolean;

  constructor(private readonly env: Env) {
    if (env.ANTHROPIC_EFFORT && !EFFORTS.includes(env.ANTHROPIC_EFFORT)) {
      throw new Error(`ANTHROPIC_EFFORT geçersiz: ${env.ANTHROPIC_EFFORT}`);
    }
    this.effort = env.ANTHROPIC_EFFORT as Effort | undefined;
    if (env.ANTHROPIC_REFUSAL_FALLBACK && env.ANTHROPIC_REFUSAL_FALLBACK !== "default") {
      throw new Error(`ANTHROPIC_REFUSAL_FALLBACK yalnızca "default" ya da boş olabilir`);
    }
    this.useFallback = env.ANTHROPIC_REFUSAL_FALLBACK === "default";
  }

  async streamTurn(request: LlmRequest, onText: (delta: string) => void): Promise<LlmTurn> {
    const stream = this.client.beta.messages.stream({
      model: this.env.ANTHROPIC_MODEL,
      max_tokens: this.env.ANTHROPIC_MAX_TOKENS,
      system: request.system,
      messages: request.messages,
      tools: request.tools,
      ...(this.effort ? { output_config: { effort: this.effort } } : {}),
      ...(this.useFallback
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
        : {}),
    });
    stream.on("text", onText);
    const message = await stream.finalMessage();
    return { content: message.content, stopReason: message.stop_reason };
  }
}
