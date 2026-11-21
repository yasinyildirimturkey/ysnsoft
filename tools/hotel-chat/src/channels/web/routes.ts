import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { runChatTurn, type ChatDeps, type ChatEvent } from "../../chat/engine.js";
import { localized, type Hotel } from "../../config/hotel.js";
import { clientIp, DAY, MINUTE, type RateLimiter } from "../../guard/rate-limit.js";
import type { Mailer } from "../../handoff/mailer.js";
import { completeHandoff } from "../../handoff/service.js";

const CHANNEL = "web";

export interface WebDeps extends ChatDeps {
  hotels: Map<string, Hotel>;
  limiter: RateLimiter;
  mailer: Mailer;
}

const Lang = z.string().regex(/^[a-zA-Z]{2}(-[a-zA-Z0-9]{2,8})?$/).optional();
const ChatBody = z.object({
  hotelId: z.string().max(64),
  sessionId: z.string().uuid().optional(),
  message: z.string(),
  language: Lang,
});
const HandoffBody = z.object({
  hotelId: z.string().max(64),
  sessionId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  contact: z.string().trim().min(5).max(120),
  note: z.string().trim().max(500).optional(),
  consent: z.literal(true),
  language: Lang,
});
const ContactBody = z.object({
  hotelId: z.string().max(64),
  name: z.string().trim().min(2).max(100),
  contact: z.string().trim().min(5).max(120),
  message: z.string().trim().min(5).max(1500),
  consent: z.literal(true),
  /** Tuzak alan: insanlar görmez, botlar doldurur. */
  website: z.string().max(200).optional(),
});
const SessionBody = z.object({ hotelId: z.string().max(64), sessionId: z.string().uuid() });
const ClickBody = SessionBody.extend({ url: z.string().url().max(2000) });

function originAllowed(hotel: Hotel, origin: string | undefined): boolean {
  if (!origin) return true; // Tarayıcı dışı istemci; CORS koruması zaten geçerli değil, hız sınırı devrede.
  const allowed = hotel.config.widget.allowedOrigins;
  return allowed.includes("*") || allowed.includes(origin);
}

export function registerWebChannel(app: FastifyInstance, deps: WebDeps): void {
  const { hotels, limiter, store, limits } = deps;

  const corsHeaders = (origin: string | undefined): Record<string, string> =>
    origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {};

  // Ön kontrol isteğinde gövde yoktur; köken herhangi bir otelde tanımlıysa izin verilir,
  // asıl istekte otelin kendi listesine göre yeniden denetlenir.
  app.options("/api/*", async (req, reply) => {
    const origin = req.headers.origin;
    const known = [...hotels.values()].some((h) => originAllowed(h, origin));
    if (!known) return reply.code(403).send();
    return reply
      .headers({
        ...corsHeaders(origin),
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "600",
      })
      .code(204)
      .send();
  });

  /** Oteli bulur ve kökeni denetler; başarısızsa yanıtı gönderip null döner. */
  const resolveHotel = (req: FastifyRequest, reply: FastifyReply, hotelId: string): Hotel | null => {
    const hotel = hotels.get(hotelId);
    if (!hotel) {
      void reply.code(404).send({ error: "unknown_hotel" });
      return null;
    }
    if (!originAllowed(hotel, req.headers.origin)) {
      void reply.code(403).send({ error: "origin_not_allowed" });
      return null;
    }
    void reply.headers(corsHeaders(req.headers.origin));
    return hotel;
  };

  const ipAllowed = (rawIp: string): boolean => {
    const ip = clientIp(rawIp);
    return limiter.take(`ip:m:${ip}`, limits.ipPerMinute, MINUTE) && limiter.take(`ip:d:${ip}`, limits.ipPerDay, DAY);
  };

  // Widget'ın açılışta gösterdiği, gizli olmayan ayarlar.
  app.get<{ Params: { hotelId: string }; Querystring: { lang?: string } }>(
    "/api/hotels/:hotelId/widget-config",
    async (req, reply) => {
      const hotel = resolveHotel(req, reply, req.params.hotelId);
      if (!hotel) return;
      const c = hotel.config;
      const requested = (req.query.lang ?? "").slice(0, 2).toLowerCase();
      const lang = c.languages.includes(requested) ? requested : c.defaultLanguage;
      return {
        hotelName: c.name,
        language: lang,
        title: localized(c.widget.title, lang, c.defaultLanguage),
        welcome: localized(c.widget.welcome, lang, c.defaultLanguage),
        quickReplies: c.widget.quickReplies[lang] ?? c.widget.quickReplies[c.defaultLanguage] ?? [],
        primaryColor: c.widget.primaryColor,
        privacyNotice: localized(c.privacy.notice, lang, c.defaultLanguage),
        privacyUrl: c.privacy.noticeUrl,
        consentLabel: localized(c.privacy.consentLabel, lang, c.defaultLanguage),
        maxMessageChars: limits.maxMessageChars,
      };
    },
  );

  app.post("/api/chat", async (req, reply) => {
    const parsed = ChatBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "bad_request" });
    const body = parsed.data;
    const hotel = resolveHotel(req, reply, body.hotelId);
    if (!hotel) return;

    const message = body.message.trim();
    if (!message) return reply.code(400).send({ error: "empty_message" });
    if (message.length > limits.maxMessageChars) {
      return reply.code(413).send({ error: "message_too_long", max: limits.maxMessageChars });
    }
    if (!ipAllowed(req.ip)) return reply.code(429).send({ error: "rate_limited" });

    // Bilinmeyen, başka otele ya da başka kanala ait oturum kimliği yok sayılır; yeni oturum açılır.
    const existing = body.sessionId ? store.getSession(body.sessionId, hotel.config.id) : null;
    const session = existing?.channel === CHANNEL ? existing : store.createSession(hotel.config.id, CHANNEL);
    if (!limiter.take(`s:m:${session.id}`, limits.sessionPerMinute, MINUTE)) {
      return reply.code(429).send({ error: "rate_limited" });
    }

    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      ...corsHeaders(req.headers.origin),
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    let open = true;
    res.on("close", () => {
      open = false;
    });
    const send = (event: string, data: unknown) => {
      if (open) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    send("session", { sessionId: session.id });
    const language = body.language?.slice(0, 2).toLowerCase() ?? hotel.config.defaultLanguage;
    await runChatTurn(deps, {
      hotel,
      session,
      text: message,
      language,
      showsOfferCards: true,
      emit: (e: ChatEvent) => send(e.type, e),
    });
    send("done", {});
    res.end();
  });

  app.post("/api/handoff", async (req, reply) => {
    const parsed = HandoffBody.safeParse(req.body);
    if (!parsed.success) {
      // consent !== true da buraya düşer: açık rıza olmadan kişisel veri kabul edilmez.
      return reply.code(400).send({ error: "bad_request" });
    }
    const body = parsed.data;
    const hotel = resolveHotel(req, reply, body.hotelId);
    if (!hotel) return;
    if (!ipAllowed(req.ip)) return reply.code(429).send({ error: "rate_limited" });

    const session = store.getSession(body.sessionId, hotel.config.id);
    if (!session || session.turns === 0 || session.channel !== CHANNEL) {
      return reply.code(404).send({ error: "unknown_session" });
    }
    const outcome = await completeHandoff(deps, hotel, session, {
      name: body.name,
      contact: body.contact,
      note: body.note || null,
    });
    if (outcome === "limit") return reply.code(429).send({ error: "handoff_limit" });
    if (outcome === "mail_failed") return reply.code(502).send({ error: "mail_failed" });
    return { ok: true };
  });

  // Web sitesindeki iletişim formu. Sohbet olmadan gelen talep de aynı yoldan resepsiyona gider
  // ve panelde "Devir talepleri" altında görünür.
  app.post("/api/contact", async (req, reply) => {
    const parsed = ContactBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "bad_request" });
    const body = parsed.data;
    const hotel = resolveHotel(req, reply, body.hotelId);
    if (!hotel) return;
    // Gizli alan doluysa gönderen bir bottur; başarılı gibi yanıtlanır ama hiçbir şey yapılmaz.
    if (body.website) return { ok: true };
    const ip = clientIp(req.ip);
    if (!ipAllowed(req.ip) || !limiter.take(`contact:d:${ip}`, 5, DAY)) {
      return reply.code(429).send({ error: "rate_limited" });
    }
    const session = store.createSession(hotel.config.id, "form");
    const outcome = await completeHandoff(
      deps,
      hotel,
      { ...session, pendingHandoff: `İletişim formu: ${body.message}` },
      { name: body.name, contact: body.contact, note: null },
    );
    if (outcome !== "sent") return reply.code(502).send({ error: "mail_failed" });
    return { ok: true };
  });

  // Dönüşüm takibi: misafir rezervasyon linkine tıkladığında widget haber verir.
  // Yalnızca bu oturumda üretilmiş linkler sayılır.
  app.post("/api/link-click", async (req, reply) => {
    const parsed = ClickBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "bad_request" });
    const hotel = resolveHotel(req, reply, parsed.data.hotelId);
    if (!hotel) return;
    if (!ipAllowed(req.ip)) return reply.code(429).send({ error: "rate_limited" });
    const { sessionId, url } = parsed.data;
    const session = store.getSession(sessionId, hotel.config.id);
    if (!session || !store.linkBelongsToSession(sessionId, url)) return { counted: false };
    store.recordEvent(hotel.config.id, sessionId, "link_clicked", { url });
    return { counted: true };
  });

  // KVKK: misafir kendi sohbet kaydını silebilir.
  app.post("/api/session/delete", async (req, reply) => {
    const parsed = SessionBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "bad_request" });
    const hotel = resolveHotel(req, reply, parsed.data.hotelId);
    if (!hotel) return;
    if (!ipAllowed(req.ip)) return reply.code(429).send({ error: "rate_limited" });
    return { deleted: store.deleteSession(parsed.data.sessionId, hotel.config.id) };
  });
}
