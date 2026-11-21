import type { Hotel } from "../config/hotel.js";
import type { Mail, Mailer } from "../handoff/mailer.js";
import type { Store } from "../store/store.js";

const DAY_MS = 86_400_000;

/** Otelin saat diliminde haftanın günü (0 = pazar), saat ve ISO tarih. */
function localParts(timeZone: string, now: Date): { weekday: number; hour: number; date: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { weekday, hour: Number(get("hour")) % 24, date: `${get("year")}-${get("month")}-${get("day")}` };
}

export function buildWeeklyReport(hotel: Hotel, store: Store, now: Date): Mail {
  const c = hotel.config;
  const s = store.stats(c.id, 7);
  const since = now.getTime() - 7 * DAY_MS;
  const questions = store
    .listEvents(c.id, "unanswered", 200)
    .filter((e) => e.createdAt >= since)
    .map((e) => String(e.data.question ?? ""))
    .filter(Boolean);
  const unique = [...new Set(questions)].slice(0, 10);
  const clickRate = s.linksCreated ? `%${Math.round((s.linksClicked! / s.linksCreated!) * 100)}` : "—";
  const lines = [
    `${c.name} sohbet asistanının son 7 günü:`,
    "",
    `Sohbet sayısı:               ${s.sessions}`,
    `Misafir mesajı:              ${s.guestMessages}`,
    `  bunların WhatsApp sohbeti: ${s.whatsappSessions}`,
    `Müsaitlik sorgusu:           ${s.availabilityQueries}`,
    `Verilen rezervasyon linki:   ${s.linksCreated}`,
    `Tıklanan link (web):         ${s.linksClicked} (${clickRate})`,
    `Ekibe iletilen talep:        ${s.handoffs}`,
    `Cevaplanamayan soru:         ${s.unanswered}`,
    "",
  ];
  if (unique.length) {
    lines.push("Asistanın cevaplayamadığı sorular (bilgi bankasına eklerseniz bir dahaki sefere cevaplar):");
    for (const q of unique) lines.push(`  - ${q}`);
  } else {
    lines.push("Bu hafta asistanın cevaplayamadığı bir soru olmadı.");
  }
  lines.push("", "Tamamlanan rezervasyon sayısı bu raporda yer almaz; o bilgi rezervasyon sisteminizdedir.");
  return {
    to: c.report?.email ?? c.handoff.email,
    subject: `${c.name}: sohbet asistanı haftalık rapor`,
    text: lines.join("\n"),
  };
}

/**
 * Saatte bir çağrılır. Raporu açık olan her otel için, belirlenen gün ve saatten sonra
 * o gün yalnızca bir kez gönderir (yeniden başlatmalarda tekrar göndermez).
 */
export async function sendDueWeeklyReports(
  hotels: Map<string, Hotel>,
  store: Store,
  mailer: Mailer,
  log: (msg: string, extra?: Record<string, unknown>) => void,
  now: Date = new Date(),
): Promise<number> {
  let sent = 0;
  for (const hotel of hotels.values()) {
    const report = hotel.config.report;
    if (!report) continue;
    const local = localParts(hotel.config.timezone, now);
    if (local.weekday !== report.weekday || local.hour < report.hour) continue;
    const key = `weekly-report:${hotel.config.id}`;
    if (store.getMeta(key) === local.date) continue;
    try {
      await mailer.send(buildWeeklyReport(hotel, store, now));
      store.setMeta(key, local.date);
      sent++;
    } catch (err) {
      log("weekly_report_failed", { hotelId: hotel.config.id, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return sent;
}
