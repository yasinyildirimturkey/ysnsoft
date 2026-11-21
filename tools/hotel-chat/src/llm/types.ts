import type Anthropic from "@anthropic-ai/sdk";
import type { ToolDefinition } from "../tools/index.js";

export type ChatMessage = Anthropic.Beta.BetaMessageParam;
export type ContentBlock = Anthropic.Beta.BetaContentBlock;
export type SystemBlock = Anthropic.Beta.BetaTextBlockParam;
export type ToolUseBlock = Anthropic.Beta.BetaToolUseBlock;
export type ToolResultBlock = Anthropic.Beta.BetaToolResultBlockParam;

export interface LlmRequest {
  system: SystemBlock[];
  messages: ChatMessage[];
  tools: ToolDefinition[];
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface LlmTurn {
  content: ContentBlock[];
  stopReason: string | null;
  /** Sağlayıcı bildirdiyse bu çağrının token kullanımı. */
  usage?: LlmUsage;
}

/** Sohbet çekirdeğinin modelden beklediği tek şey; testlerde sahte model takılabilir. */
export interface Llm {
  streamTurn(request: LlmRequest, onText: (delta: string) => void): Promise<LlmTurn>;
}
