/**
 * E-posta gönderimi (yalnızca sunucu). KGLEX deseni:
 * - Ayarlar sunucudaki ortam değişkenlerinden gelir (.env.production): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
 *   isteğe bağlı SMTP_SECURE, SMTP_FROM_EMAIL, SMTP_FROM_NAME. Şifre tarayıcıya hiç gelmez.
 * - Dışa gönderim kilidi: gerçek gönderim yalnızca üretimde (NODE_ENV=production) ya da ALLOW_REAL_OUTBOUND=1 ile;
 *   geliştirmede e-posta "SIMULE" olarak kaydedilir, kimseye gitmez.
 * - Her gönderim data/mail-log.jsonl'a yazılır: zaman, alıcı, konu, durum (içerik yazılmaz).
 *
 * Kanal kuralı: bu modül YALNIZCA iç bildirimler içindir (bize/ekibimize). Müşteri adaylarına e-posta GÖNDERİLMEZ (UWG §7).
 */
import fs from 'node:fs';
import path from 'node:path';
import nodemailer, { type Transporter } from 'nodemailer';

const LOG = path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'mail-log.jsonl');

export interface MailStatus {
  configured: boolean;
  realSend: boolean;
  host: string | null;
  port: number | null;
  from: string | null;
}

function config() {
  const host = process.env.SMTP_HOST?.trim() || null;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim() || null;
  const pass = process.env.SMTP_PASS || null;
  const fromEmail = process.env.SMTP_FROM_EMAIL?.trim() || user;
  const fromName = process.env.SMTP_FROM_NAME?.trim() || 'YSNSOFT';
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
  return { host, port, user, pass, fromEmail, fromName, secure };
}

/** Gerçek gönderim açık mı (dışa gönderim kilidi). */
export const realOutbound = () => process.env.NODE_ENV === 'production' || process.env.ALLOW_REAL_OUTBOUND === '1';

export function mailStatus(): MailStatus {
  const c = config();
  return { configured: Boolean(c.host && c.user && c.pass), realSend: realOutbound(), host: c.host, port: c.host ? c.port : null, from: c.fromEmail };
}

let transport: Transporter | null = null;
function getTransport() {
  if (transport) return transport;
  const c = config();
  transport = nodemailer.createTransport({
    host: c.host!, port: c.port, secure: c.secure,
    auth: { user: c.user!, pass: c.pass! },
    connectionTimeout: 9_000, greetingTimeout: 9_000, socketTimeout: 12_000,
  });
  return transport;
}

function log(entry: Record<string, unknown>) {
  try {
    fs.mkdirSync(path.dirname(LOG), { recursive: true });
    fs.appendFileSync(LOG, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
  } catch { /* kayıt yazılamasa da gönderim sonucu döner */ }
}

export interface SendResult { ok: boolean; status: 'SENT' | 'SIMULATED' | 'FAILED' | 'NOT_CONFIGURED'; error?: string; messageId?: string }

/** Tek e-posta gönderir. Hata fırlatmaz; sonucu döner ve kaydeder. */
export async function sendMail({ to, subject, html, text, kind }: { to: string | string[]; subject: string; html: string; text?: string; kind: string }): Promise<SendResult> {
  const c = config();
  const rcpt = ([] as string[]).concat(to).filter(Boolean);
  const base = { kind, to: rcpt, subject };
  if (!rcpt.length) { log({ ...base, status: 'FAILED', error: 'alıcı yok' }); return { ok: false, status: 'FAILED', error: 'Alıcı yok' }; }
  if (!realOutbound()) { log({ ...base, status: 'SIMULATED' }); return { ok: true, status: 'SIMULATED' }; }
  if (!c.host || !c.user || !c.pass) { log({ ...base, status: 'NOT_CONFIGURED' }); return { ok: false, status: 'NOT_CONFIGURED', error: 'SMTP ayarları sunucuda eksik' }; }
  try {
    const info = await getTransport().sendMail({ from: { name: c.fromName, address: c.fromEmail! }, to: rcpt, subject, html, text: text ?? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() });
    log({ ...base, status: 'SENT', messageId: info.messageId });
    return { ok: true, status: 'SENT', messageId: info.messageId };
  } catch (e) {
    transport = null; // bozuk bağlantı bir sonrakinde yeniden kurulsun
    const error = e instanceof Error ? e.message.slice(0, 300) : 'gönderilemedi';
    log({ ...base, status: 'FAILED', error });
    return { ok: false, status: 'FAILED', error };
  }
}

/** Son gönderimler (panel için; en yeni üstte). */
export function recentMails(limit = 20): Record<string, unknown>[] {
  try {
    const lines = fs.readFileSync(LOG, 'utf8').trim().split('\n').slice(-limit);
    return lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean).reverse() as Record<string, unknown>[];
  } catch { return []; }
}

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

/** Basit, Outlook'ta da düzgün görünen şablon (satır içi stil, tablo yok). */
export function mailLayout(title: string, bodyHtml: string, footer = 'YSNSOFT Yönetim Paneli · otomatik bildirim') {
  return `<!doctype html><html lang="tr"><body style="margin:0;padding:24px;background:#f5f5f7;font-family:Segoe UI,Arial,sans-serif;color:#1d1d1f">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e5e5ea">
<h1 style="margin:0 0 12px;font-size:18px">${esc(title)}</h1>
${bodyHtml}
<p style="margin:24px 0 0;font-size:12px;color:#6e6e73">${esc(footer)}</p>
</div></body></html>`;
}
export { esc as escapeHtml };
