import type { Hotel } from "../config/hotel.js";
import type { Session, Store } from "../store/store.js";
import { teamAvailable } from "../tools/index.js";
import { buildHandoffMail, type Mailer } from "./mailer.js";

export const MAX_HANDOFFS_PER_SESSION = 2;

export interface HandoffDeps {
  store: Store;
  mailer: Mailer;
  log: (msg: string, extra?: Record<string, unknown>) => void;
  fetchFn?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
}

export type HandoffOutcome = "sent" | "limit" | "mail_failed";

/**
 * Misafirin açık rızasından sonra çağrılır: resepsiyona e-posta atar, varsa anlık
 * bildirim webhook'unu tetikler ve devri kaydeder. Tüm kanallar bunu kullanır.
 */
export async function completeHandoff(
  deps: HandoffDeps,
  hotel: Hotel,
  session: Session,
  guest: { name: string; contact: string; note: string | null },
): Promise<HandoffOutcome> {
  const { store } = deps;
  if (store.countHandoffs(session.id) >= MAX_HANDOFFS_PER_SESSION) return "limit";

  const request = {
    ...guest,
    summary: session.pendingHandoff ?? "(Asistan özet oluşturmadı; misafir talebi doğrudan gönderdi.)",
    sessionId: session.id,
    channel: session.channel,
  };
  const now = deps.now?.() ?? new Date();
  try {
    await deps.mailer.send(buildHandoffMail(hotel.config, request, now));
  } catch (err) {
    deps.log("handoff_mail_failed", { sessionId: session.id, error: err instanceof Error ? err.message : String(err) });
    return "mail_failed";
  }
  store.saveHandoff({ ...request, hotelId: hotel.config.id });
  store.recordEvent(hotel.config.id, session.id, "handoff", { channel: session.channel, inHours: teamAvailable(hotel.config, now) });

  // Anlık bildirim yardımcıdır: başarısız olsa da e-posta gitmiştir, devir tamamdır.
  const envName = hotel.config.handoff.notifyWebhookEnv;
  const url = envName ? (deps.env ?? process.env)[envName]?.trim() : undefined;
  if (url) {
    const text = `${hotel.config.name}: yeni geri dönüş talebi (${session.channel}). ${request.summary} — Ayrıntılar e-postada.`;
    try {
      const res = await (deps.fetchFn ?? fetch)(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) deps.log("handoff_notify_failed", { status: res.status });
    } catch {
      deps.log("handoff_notify_failed", { status: "network" });
    }
  }
  return "sent";
}
