import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { runChatTurn, type ChatDeps } from "../../chat/engine.js";
import { localized, type Hotel } from "../../config/hotel.js";
import { DAY, MINUTE, type RateLimiter } from "../../guard/rate-limit.js";
import type { Mailer } from "../../handoff/mailer.js";
import { completeHandoff } from "../../handoff/service.js";

/**
 * WhatsApp Business Cloud API kanalı.
 *
 * Meta'nın dokümanına göre yazıldı; gerçek bir WhatsApp Business hesabıyla HENÜZ DENENMEDİ.
 *  - Doğrulama: GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=... → challenge aynen döner.
 *  - Bildirim: POST, gövde imzası X-Hub-Signature-256: sha256=<HMAC-SHA256(app secret, ham gövde)>.
 *  - Gönderim: POST https://graph.facebook.com/<sürüm>/<phone-number-id>/messages, Bearer erişim anahtarı.
 * Graph API sürümü tahmin edilmez; WHATSAPP_API_VERSION ile verilir.
 *
 * Asistan yalnızca misafirin yazdığı mesaja cevap verir (24 saatlik pencere içinde), şablon mesaj göndermez.
 */

const CHANNEL = "whatsapp";
const SESSION_IDLE_MS = 24 * 60 * 60 * 1000;
const MAX_TEXT = 4096;
const BTN_YES = "handoff_yes";
const BTN_NO = "handoff_no";

export interface WhatsAppConfig {
  verifyToken: string;
  appSecret: string;
  apiVersion: string;
}

export interface WhatsAppDeps extends ChatDeps {
  hotels: Map<string, Hotel>;
  limiter: RateLimiter;
  mailer: Mailer;
  whatsapp: WhatsAppConfig;
  /** Otelin erişim anahtarı; yoksa o otele mesaj gönderilemez. */
  tokenFor: (hotel: Hotel) => string | undefined;
  fetchFn?: typeof fetch;
}

const T: Record<string, Record<string, string>> = {
  onlyText: {
    tr: "Şu anda yalnızca yazılı mesajları yanıtlayabiliyorum. Sorunuzu yazar mısınız?",
    en: "I can only reply to text messages for now. Could you type your question?",
  },
  tooLong: { tr: "Mesajınız çok uzun. Lütfen daha kısa yazar mısınız?", en: "Your message is too long. Could you shorten it?" },
  rate: { tr: "Çok hızlı mesaj gönderiyorsunuz. Lütfen biraz bekleyin.", en: "You are sending messages too quickly. Please wait a moment." },
  yes: { tr: "Onaylıyorum", en: "I agree" },
  no: { tr: "Vazgeç", en: "Cancel" },
  sent: {
    tr: "Talebiniz otel ekibine iletildi. Size bu numaradan dönüş yapacaklar.",
    en: "Your request has been sent to the hotel team. They will contact you on this number.",
  },
  cancelled: { tr: "Tamam, bilgileriniz paylaşılmadı.", en: "Okay, your details were not shared." },
  failed: { tr: "Talebiniz iletilemedi. Lütfen daha sonra tekrar deneyin.", en: "Your request could not be sent. Please try again later." },
  nothingPending: { tr: "Bekleyen bir talebiniz yok.", en: "There is no pending request." },
};
const t = (key: string, lang: string) => T[key]![lang] ?? T[key]!.en!;

interface Incoming {
  phoneNumberId: string;
  from: string;
  id: string;
  profileName: string | null;
  text: string | null;
  button: string | null;
}

/** Webhook gövdesinden işlenecek mesajları çıkarır; durum bildirimleri (delivered/read) atlanır. */
export function parseIncoming(body: unknown): Incoming[] {
  const out: Incoming[] = [];
  const entries = (body as { entry?: unknown[] } | null)?.entry;
  if (!Array.isArray(entries)) return out;
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const value = (change as { value?: Record<string, unknown> })?.value;
      const phoneNumberId = (value?.metadata as { phone_number_id?: unknown } | undefined)?.phone_number_id;
      const messages = value?.messages;
      if (typeof phoneNumberId !== "string" || !Array.isArray(messages)) continue;
      const contacts = Array.isArray(value?.contacts) ? (value.contacts as Array<Record<string, unknown>>) : [];
      for (const m of messages as Array<Record<string, unknown>>) {
        if (typeof m.from !== "string" || typeof m.id !== "string") continue;
        const contact = contacts.find((c) => c.wa_id === m.from);
        const name = (contact?.profile as { name?: unknown } | undefined)?.name;
        const textBody = m.type === "text" ? (m.text as { body?: unknown } | undefined)?.body : undefined;
        const buttonId =
          m.type === "interactive"
            ? ((m.interactive as { button_reply?: { id?: unknown } } | undefined)?.button_reply?.id)
            : undefined;
        out.push({
          phoneNumberId,
          from: m.from,
          id: m.id,
          profileName: typeof name === "string" && name.trim() ? name.trim().slice(0, 100) : null,
          text: typeof textBody === "string" ? textBody : null,
          button: typeof buttonId === "string" ? buttonId : null,
        });
      }
    }
  }
  return out;
}

export function verifySignature(appSecret: string, rawBody: Buffer, header: string | undefined): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  const given = Buffer.from(header.slice(7), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function splitText(text: string): string[] {
  const parts: string[] = [];
  let rest = text.trim();
  while (rest.length > MAX_TEXT) {
    const cut = rest.lastIndexOf("\n", MAX_TEXT);
    const at = cut > MAX_TEXT / 2 ? cut : MAX_TEXT;
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

export function registerWhatsAppChannel(app: FastifyInstance, deps: WhatsAppDeps): void {
  const { hotels, store, limits, limiter, whatsapp } = deps;
  const fetchFn = deps.fetchFn ?? fetch;
  const byPhoneNumberId = new Map<string, Hotel>();
  for (const hotel of hotels.values()) {
    if (hotel.config.whatsapp) byPhoneNumberId.set(hotel.config.whatsapp.phoneNumberId, hotel);
  }

  const seen = new Set<string>(); // Meta aynı bildirimi yeniden gönderebilir.
  const queues = new Map<string, Promise<void>>(); // Aynı kişinin mesajları sırayla işlenir.

  const post = async (hotel: Hotel, payload: Record<string, unknown>): Promise<void> => {
    const token = deps.tokenFor(hotel);
    if (!token) {
      deps.log("whatsapp_token_missing", { hotelId: hotel.config.id });
      return;
    }
    try {
      const res = await fetchFn(
        `https://graph.facebook.com/${whatsapp.apiVersion}/${hotel.config.whatsapp!.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!res.ok) deps.log("whatsapp_send_failed", { hotelId: hotel.config.id, status: res.status });
    } catch {
      deps.log("whatsapp_send_failed", { hotelId: hotel.config.id, status: "network" });
    }
  };
  const sendText = async (hotel: Hotel, to: string, text: string) => {
    for (const body of splitText(text)) await post(hotel, { to, type: "text", text: { body } });
  };

  async function handle(hotel: Hotel, msg: Incoming): Promise<void> {
    const c = hotel.config;
    const lang = c.defaultLanguage;
    if (
      !limiter.take(`wa:m:${msg.from}`, limits.sessionPerMinute, MINUTE) ||
      !limiter.take(`wa:d:${msg.from}`, limits.ipPerDay, DAY)
    ) {
      // Sınır aşıldığında da en fazla dakikada bir uyarı gönderilir.
      if (limiter.take(`wa:warn:${msg.from}`, 1, MINUTE)) await sendText(hotel, msg.from, t("rate", lang));
      return;
    }

    let session = store.findLatestByExternalId(c.id, CHANNEL, msg.from);

    if (msg.button === BTN_YES || msg.button === BTN_NO) {
      if (!session?.pendingHandoff) return sendText(hotel, msg.from, t("nothingPending", lang));
      if (msg.button === BTN_NO) {
        store.clearPendingHandoff(session.id);
        return sendText(hotel, msg.from, t("cancelled", lang));
      }
      // Düğmeye basmak açık rızadır; numara ve profil adı ancak şimdi otelle paylaşılır.
      const outcome = await completeHandoff(deps, hotel, session, {
        name: msg.profileName ?? "WhatsApp misafiri",
        contact: `WhatsApp +${msg.from}`,
        note: null,
      });
      return sendText(hotel, msg.from, t(outcome === "sent" ? "sent" : "failed", lang));
    }

    if (msg.text === null) return sendText(hotel, msg.from, t("onlyText", lang));
    const text = msg.text.trim();
    if (!text) return;
    if (text.length > limits.maxMessageChars) return sendText(hotel, msg.from, t("tooLong", lang));

    const stale = !session || Date.now() - session.lastAt > SESSION_IDLE_MS || session.turns >= limits.maxTurnsPerSession;
    if (stale) {
      session = store.createSession(c.id, CHANNEL, msg.from);
      // KVKK: her yeni sohbetin başında aydınlatma metni.
      await sendText(hotel, msg.from, `${localized(c.privacy.notice, lang, c.defaultLanguage)}\n${c.privacy.noticeUrl}`);
    }

    let reply = "";
    let wantsHandoff = false;
    await runChatTurn(deps, {
      hotel,
      session: session!,
      text,
      language: lang,
      showsOfferCards: false,
      emit: (e) => {
        if (e.type === "text") reply += e.delta;
        else if (e.type === "tool") reply += reply && !reply.endsWith("\n") ? "\n\n" : "";
        else if (e.type === "notice") reply += (reply ? "\n\n" : "") + e.message;
        else if (e.type === "handoff_form") wantsHandoff = true;
      },
    });
    if (reply.trim()) await sendText(hotel, msg.from, reply);
    if (wantsHandoff) {
      await post(hotel, {
        to: msg.from,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: localized(c.privacy.consentLabel, lang, c.defaultLanguage).slice(0, 1024) },
          action: {
            buttons: [
              { type: "reply", reply: { id: BTN_YES, title: t("yes", lang).slice(0, 20) } },
              { type: "reply", reply: { id: BTN_NO, title: t("no", lang).slice(0, 20) } },
            ],
          },
        },
      });
    }
  }

  // Ayrı kapsam: imza doğrulaması için bu rotada gövde ham haliyle de saklanır.
  void app.register(async (scope) => {
    scope.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) => {
      (req as unknown as { rawBody: Buffer }).rawBody = body as Buffer;
      try {
        done(null, JSON.parse((body as Buffer).toString("utf8")));
      } catch {
        done(null, null);
      }
    });

    scope.get<{ Querystring: Record<string, string | undefined> }>("/webhooks/whatsapp", async (req, reply) => {
      const q = req.query;
      if (q["hub.mode"] === "subscribe" && q["hub.verify_token"] === whatsapp.verifyToken && q["hub.challenge"]) {
        return reply.type("text/plain").send(q["hub.challenge"]);
      }
      return reply.code(403).send();
    });

    scope.post("/webhooks/whatsapp", async (req, reply) => {
      const raw = (req as unknown as { rawBody?: Buffer }).rawBody;
      const signature = req.headers["x-hub-signature-256"];
      if (!raw || !verifySignature(whatsapp.appSecret, raw, typeof signature === "string" ? signature : undefined)) {
        return reply.code(401).send();
      }
      for (const msg of parseIncoming(req.body)) {
        const hotel = byPhoneNumberId.get(msg.phoneNumberId);
        if (!hotel || seen.has(msg.id)) continue;
        seen.add(msg.id);
        if (seen.size > 5000) seen.delete(seen.values().next().value!);
        const key = `${hotel.config.id}:${msg.from}`;
        const next = (queues.get(key) ?? Promise.resolve())
          .then(() => handle(hotel, msg))
          .catch((err: unknown) => deps.log("whatsapp_handle_failed", { error: err instanceof Error ? err.message : String(err) }))
          .finally(() => {
            if (queues.get(key) === next) queues.delete(key);
          });
        queues.set(key, next);
      }
      // Meta hızlı 200 bekler; işleme arka planda sürer.
      return reply.code(200).send();
    });
  });

  /** Testler için: kuyruktaki tüm işlerin bitmesini bekler. */
  app.decorate("whatsappIdle", async () => {
    while (queues.size > 0) await Promise.all([...queues.values()]);
  });
}
