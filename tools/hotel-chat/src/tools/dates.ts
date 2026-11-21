const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Otelin saat dilimine göre bugünün tarihi (YYYY-MM-DD). */
export function todayInZone(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000);
}

export const MAX_NIGHTS = 30;
export const MAX_DAYS_AHEAD = 550;

/** Konaklama tarihlerini doğrular; sorun varsa modele dönecek açıklamayı verir. */
export function validateStay(checkIn: string, checkOut: string, today: string): string | null {
  if (!isValidIsoDate(checkIn) || !isValidIsoDate(checkOut)) {
    return "Dates must be real calendar dates in YYYY-MM-DD format.";
  }
  if (checkIn < today) return `Check-in date is in the past (today is ${today}). Ask the guest to confirm the dates.`;
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) return "Check-out must be after check-in.";
  if (nights > MAX_NIGHTS) return `Stays longer than ${MAX_NIGHTS} nights cannot be queried here; offer human handoff.`;
  if (nightsBetween(today, checkIn) > MAX_DAYS_AHEAD) {
    return "Check-in is too far in the future to query; offer human handoff.";
  }
  return null;
}

export function formatDate(iso: string, format: "YYYY-MM-DD" | "DD.MM.YYYY" | "DD-MM-YYYY" | "DD/MM/YYYY"): string {
  const [y, m, d] = iso.split("-") as [string, string, string];
  switch (format) {
    case "YYYY-MM-DD":
      return iso;
    case "DD.MM.YYYY":
      return `${d}.${m}.${y}`;
    case "DD-MM-YYYY":
      return `${d}-${m}-${y}`;
    case "DD/MM/YYYY":
      return `${d}/${m}/${y}`;
  }
}
