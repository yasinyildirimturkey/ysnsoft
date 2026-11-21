import { createHash, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Hotel } from "../config/hotel.js";
import { MINUTE, type RateLimiter } from "../guard/rate-limit.js";
import type { ChatMessage } from "../llm/types.js";
import type { Store } from "../store/store.js";

export interface AdminDeps {
  hotels: Map<string, Hotel>;
  store: Store;
  limiter: RateLimiter;
  /** Panel parolası. Tanımsızsa panel uç noktaları hiç açılmaz. */
  adminToken: string | undefined;
  /** Bilgi bankası değişmeden önceki halinin yedeklendiği klasör. */
  backupDir: string;
  /** 1 milyon token başına USD; verilmişse tahmini maliyet hesaplanır. */
  priceInputPerMTok?: number;
  priceOutputPerMTok?: number;
  log: (msg: string, extra?: Record<string, unknown>) => void;
}

const MAX_KB_BYTES = 200 * 1024;
const sha = (s: string) => createHash("sha256").update(s).digest();

/** Kayıtlı mesajları panelde okunacak sade satırlara çevirir. */
export function toTranscript(messages: ChatMessage[]): Array<{ role: "guest" | "assistant" | "tool"; text: string }> {
  const lines: Array<{ role: "guest" | "assistant" | "tool"; text: string }> = [];
  for (const m of messages) {
    if (typeof m.content === "string") {
      lines.push({ role: m.role === "user" ? "guest" : "assistant", text: m.content });
      continue;
    }
    for (const b of m.content ?? []) {
      if (b.type === "text" && b.text.trim()) lines.push({ role: m.role === "user" ? "guest" : "assistant", text: b.text });
      else if (b.type === "tool_use") lines.push({ role: "tool", text: `${b.name} ${JSON.stringify(b.input)}` });
    }
  }
  return lines;
}

export function registerAdmin(app: FastifyInstance, deps: AdminDeps): void {
  const { hotels, store, limiter } = deps;
  if (!deps.adminToken) return;
  const expected = sha(deps.adminToken);

  const authed = (req: FastifyRequest, reply: FastifyReply): boolean => {
    const header = req.headers.authorization ?? "";
    const given = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (given && timingSafeEqual(sha(given), expected)) return true;
    // Parola denemelerini yavaşlat.
    if (!limiter.take(`admin:fail:${req.ip}`, 10, MINUTE)) void reply.code(429).send({ error: "rate_limited" });
    else void reply.code(401).send({ error: "unauthorized" });
    return false;
  };
  const hotelOf = (req: FastifyRequest, reply: FastifyReply): Hotel | null => {
    if (!authed(req, reply)) return null;
    const hotel = hotels.get((req.params as { hotelId: string }).hotelId);
    if (!hotel) void reply.code(404).send({ error: "unknown_hotel" });
    return hotel ?? null;
  };

  app.get("/admin/api/hotels", async (req, reply) => {
    if (!authed(req, reply)) return;
    return [...hotels.values()].map((h) => ({ id: h.config.id, name: h.config.name }));
  });

  app.get<{ Querystring: { days?: string } }>("/admin/api/hotels/:hotelId/stats", async (req, reply) => {
    const hotel = hotelOf(req, reply);
    if (!hotel) return;
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const usage = store.getMonthUsage(hotel.config.id);
    const totalTokens = usage.inputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
    // Önbellekten okunan ve önbelleğe yazılan token'lar farklı fiyatlanır; burada hepsi girdi fiyatından
    // sayılır, yani tahmin gerçek faturadan biraz farklı çıkabilir.
    const estimatedCostUsd =
      deps.priceInputPerMTok !== undefined && deps.priceOutputPerMTok !== undefined
        ? ((usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens) * deps.priceInputPerMTok +
            usage.outputTokens * deps.priceOutputPerMTok) /
          1_000_000
        : null;
    return {
      days,
      ...store.stats(hotel.config.id, days),
      usage: { ...usage, totalTokens, monthlyTokenLimit: hotel.config.monthlyTokenLimit ?? null, estimatedCostUsd },
    };
  });

  app.get("/admin/api/hotels/:hotelId/sessions", async (req, reply) => {
    const hotel = hotelOf(req, reply);
    if (!hotel) return;
    return store.listSessions(hotel.config.id, 100);
  });

  app.get<{ Params: { hotelId: string; sessionId: string } }>(
    "/admin/api/hotels/:hotelId/sessions/:sessionId",
    async (req, reply) => {
      const hotel = hotelOf(req, reply);
      if (!hotel) return;
      const session = store.getSession(req.params.sessionId, hotel.config.id);
      if (!session) return reply.code(404).send({ error: "unknown_session" });
      return { id: session.id, channel: session.channel, turns: session.turns, transcript: toTranscript(store.getMessages(session.id)) };
    },
  );

  app.get("/admin/api/hotels/:hotelId/handoffs", async (req, reply) => {
    const hotel = hotelOf(req, reply);
    if (!hotel) return;
    return store.listHandoffs(hotel.config.id);
  });

  app.get("/admin/api/hotels/:hotelId/unanswered", async (req, reply) => {
    const hotel = hotelOf(req, reply);
    if (!hotel) return;
    return store.listEvents(hotel.config.id, "unanswered", 200).map((e) => ({
      question: String(e.data.question ?? ""),
      sessionId: e.sessionId,
      createdAt: e.createdAt,
    }));
  });

  app.get("/admin/api/hotels/:hotelId/knowledge-base", async (req, reply) => {
    const hotel = hotelOf(req, reply);
    if (!hotel) return;
    return { content: hotel.knowledgeBase };
  });

  app.put("/admin/api/hotels/:hotelId/knowledge-base", { bodyLimit: MAX_KB_BYTES + 4096 }, async (req, reply) => {
    const hotel = hotelOf(req, reply);
    if (!hotel) return;
    const content = (req.body as { content?: unknown } | null)?.content;
    if (typeof content !== "string" || !content.trim()) return reply.code(400).send({ error: "empty" });
    if (Buffer.byteLength(content, "utf8") > MAX_KB_BYTES) return reply.code(413).send({ error: "too_large" });

    const file = path.join(hotel.dir, hotel.config.knowledgeBaseFile);
    // Önceki hal yedeklenir; yanlış bir düzenleme geri alınabilir.
    fs.mkdirSync(deps.backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.copyFileSync(file, path.join(deps.backupDir, `${hotel.config.id}-${stamp}.md`));
    fs.writeFileSync(file, content.trim() + "\n", "utf8");
    hotel.knowledgeBase = content.trim(); // Sonraki mesajdan itibaren geçerli; yeniden başlatma gerekmez.
    deps.log("knowledge_base_updated", { hotelId: hotel.config.id, bytes: Buffer.byteLength(content, "utf8") });
    return { ok: true };
  });
}
