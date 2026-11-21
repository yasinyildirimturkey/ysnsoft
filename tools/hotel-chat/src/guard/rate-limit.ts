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

export const MINUTE = 60_000;
export const DAY = 86_400_000;
