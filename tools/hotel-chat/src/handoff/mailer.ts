import nodemailer from "nodemailer";
import type { Env } from "../config/env.js";
import type { HotelConfig } from "../config/hotel.js";

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

export class SmtpMailer implements Mailer {
  private readonly transport;

  constructor(private readonly env: Env) {
    this.transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }

  async send(mail: Mail): Promise<void> {
    await this.transport.sendMail({ from: this.env.MAIL_FROM, ...mail });
  }
}

/** SMTP ayarlanmamışsa (geliştirme) e-postayı göndermek yerine loga yazar. */
export class LogMailer implements Mailer {
  constructor(private readonly log: (msg: string, extra?: Record<string, unknown>) => void) {}

  async send(mail: Mail): Promise<void> {
    this.log("handoff_mail_not_sent_smtp_unconfigured", { to: mail.to, subject: mail.subject, text: mail.text });
  }
}

export function createMailer(env: Env, log: (msg: string, extra?: Record<string, unknown>) => void): Mailer {
  return env.SMTP_HOST ? new SmtpMailer(env) : new LogMailer(log);
}

export interface HandoffRequest {
  name: string;
  contact: string;
  summary: string;
  note: string | null;
  sessionId: string;
  channel: string;
}

export function buildHandoffMail(hotel: HotelConfig, h: HandoffRequest, now: Date = new Date()): Mail {
  const when = new Intl.DateTimeFormat("tr-TR", {
    timeZone: hotel.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(now);
  // Başlığa misafir girdisi konmaz (satır sonu enjeksiyonu ve gereksiz kişisel veri).
  return {
    to: hotel.handoff.email,
    subject: `${hotel.handoff.subjectPrefix} Misafir geri dönüş bekliyor`,
    text: [
      `${hotel.name} web sitesindeki sohbet asistanından bir misafir sizinle görüşmek istiyor.`,
      "",
      `Ad: ${h.name}`,
      `İletişim: ${h.contact}`,
      `Zaman: ${when}`,
      `Kanal: ${h.channel}`,
      "",
      "Talep özeti (asistan tarafından yazıldı):",
      h.summary,
      ...(h.note ? ["", "Misafirin notu:", h.note] : []),
      "",
      `Oturum: ${h.sessionId}`,
      "Misafir, iletişim bilgilerinin bu talep için otelle paylaşılmasına açık rıza vermiştir.",
    ].join("\n"),
  };
}
