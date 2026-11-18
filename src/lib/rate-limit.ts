/**
 * Basit istek sınırlayıcı (KGLEX `rate-limit.ts` deseni): ad + istemci anahtarı başına pencere içinde en çok N istek.
 * Bellekte tutulur; iisnode birden çok süreç açarsa sınır süreç başınadır (kaba kuvvet ve spam için yeterli).
 */
const buckets = new Map<string, number[]>();

/** İzin verilirse null, aşıldıysa kaç saniye sonra yeniden denenebileceği. */
export function rateLimit(name: string, key: string, max: number, windowMs: number): number | null {
  const now = Date.now();
  const id = `${name}:${key}`;
  const hits = (buckets.get(id) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) return Math.ceil((windowMs - (now - hits[0])) / 1000);
  hits.push(now);
  buckets.set(id, hits);
  if (buckets.size > 10_000) for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  return null;
}
