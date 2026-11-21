import { z } from "zod";

const bool = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const EnvSchema = z.object({
  PORT: z.coerce.number().int().default(8787),
  TRUST_PROXY: bool,
  DATA_DIR: z.string().default("./data"),
  HOTELS_DIR: z.string().default("./hotels"),

  LLM_MODE: z.enum(["anthropic", "demo"]).default("anthropic"),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
  ANTHROPIC_EFFORT: z.string().optional(),
  ANTHROPIC_MAX_TOKENS: z.coerce.number().int().positive().default(4000),
  ANTHROPIC_REFUSAL_FALLBACK: z.string().optional(),

  MAX_MESSAGE_CHARS: z.coerce.number().int().positive().default(1000),
  RATE_IP_PER_MINUTE: z.coerce.number().int().positive().default(20),
  RATE_IP_PER_DAY: z.coerce.number().int().positive().default(300),
  RATE_SESSION_PER_MINUTE: z.coerce.number().int().positive().default(8),
  MAX_TURNS_PER_SESSION: z.coerce.number().int().positive().default(40),
  MAX_TOOL_CALLS_PER_SESSION: z.coerce.number().int().positive().default(20),
  MAX_TOOL_ROUNDS_PER_TURN: z.coerce.number().int().positive().default(4),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: bool,
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("Otel Asistanı <no-reply@example.com>"),
});

export type Env = z.infer<typeof EnvSchema>;

/** Boş string ortam değişkenlerini "tanımsız" sayar; .env.example'daki boş satırlar varsayılana düşer. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(source)) {
    if (v !== undefined && v.trim() !== "") cleaned[k] = v.trim();
  }
  return EnvSchema.parse(cleaned);
}

export interface Limits {
  maxMessageChars: number;
  ipPerMinute: number;
  ipPerDay: number;
  sessionPerMinute: number;
  maxTurnsPerSession: number;
  maxToolCallsPerSession: number;
  maxToolRoundsPerTurn: number;
}

export function limitsFromEnv(env: Env): Limits {
  return {
    maxMessageChars: env.MAX_MESSAGE_CHARS,
    ipPerMinute: env.RATE_IP_PER_MINUTE,
    ipPerDay: env.RATE_IP_PER_DAY,
    sessionPerMinute: env.RATE_SESSION_PER_MINUTE,
    maxTurnsPerSession: env.MAX_TURNS_PER_SESSION,
    maxToolCallsPerSession: env.MAX_TOOL_CALLS_PER_SESSION,
    maxToolRoundsPerTurn: env.MAX_TOOL_ROUNDS_PER_TURN,
  };
}
