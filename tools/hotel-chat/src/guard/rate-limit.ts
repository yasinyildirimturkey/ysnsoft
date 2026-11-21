interface Window {
  count: number;
  resetAt: number;
}

/** Bellek içi sabit pencereli sayaç. Tek süreç için yeterli; çok süreçte Redis vb. ile değiştirilir. */
export class RateLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(private readonly now: () => number = Date.now) {}

  /** İzin verilirse sayacı artırır ve true döner. */
  take(key: string, limit: number, windowMs: number): boolean {
    const t = this.now();
    const w = this.windows.get(key);
    if (!w || w.resetAt <= t) {
      this.windows.set(key, { count: 1, resetAt: t + windowMs });
      return true;
    }
    if (w.count >= limit) return false;
    w.count++;
    return true;
  }

  /** Süresi dolan pencereleri temizler (periyodik çağrılır). */
  prune(): void {
    const t = this.now();
    for (const [key, w] of this.windows) {
      if (w.resetAt <= t) this.windows.delete(key);
    }
  }
}

/**
 * Hız sınırı anahtarı için istemci adresi. Bazı vekiller (iisnode) X-Forwarded-For'a
 * "1.2.3.4:56789" biçiminde port ekler; port her bağlantıda değiştiği için atılır.
 */
export function clientIp(ip: string): string {
  const v4 = ip.match(/^([0-9]{1,3}(?:[.][0-9]{1,3}){3}):[0-9]+$/);
  if (v4?.[1]) return v4[1];
  const v6 = ip.match(/^\[([0-9a-fA-F:]+)\]:[0-9]+$/);
  return v6?.[1] ?? ip;
}

export const MINUTE = 60_000;
export const DAY = 86_400_000;
