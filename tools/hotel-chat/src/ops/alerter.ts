import type { Mailer } from "../handoff/mailer.js";

const TITLES: Record<string, string> = {
  pms_error: "Rezervasyon sistemine ulaşılamıyor",
  chat_turn_failed: "Asistan bir mesaja yanıt veremedi",
  budget_exceeded: "Aylık token sınırı aşıldı",
};

/**
 * İşletme uyarılarını e-postayla iletir. Aynı otel ve aynı tür için pencere başına
 * tek e-posta gönderir; arıza sürerken gelen kutusu dolmaz.
 */
export class Alerter {
  private readonly lastSent = new Map<string, number>();

  constructor(
    private readonly mailer: Mailer,
    private readonly to: string | undefined,
    private readonly log: (msg: string, extra?: Record<string, unknown>) => void,
    private readonly windowMs = 15 * 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  alert = (kind: string, hotelId: string, detail: string): void => {
    if (!this.to) return;
    const key = `${hotelId}:${kind}`;
    const t = this.now();
    if (t - (this.lastSent.get(key) ?? -Infinity) < this.windowMs) return;
    this.lastSent.set(key, t);
    void this.mailer
      .send({
        to: this.to,
        subject: `[hotel-chat uyarı] ${hotelId}: ${TITLES[kind] ?? kind}`,
        text: [
          `Otel: ${hotelId}`,
          `Sorun: ${TITLES[kind] ?? kind}`,
          `Ayrıntı: ${detail.slice(0, 500)}`,
          `Zaman: ${new Date(t).toISOString()}`,
          "",
          `Aynı sorun için ${Math.round(this.windowMs / 60_000)} dakika boyunca yeni e-posta gönderilmez.`,
        ].join("\n"),
      })
      .catch((err: unknown) => this.log("alert_mail_failed", { error: err instanceof Error ? err.message : String(err) }));
  };
}
