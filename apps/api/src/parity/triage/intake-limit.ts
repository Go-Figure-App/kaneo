/** Bounded, per-process fixed-window quotas; no Redis dependency. */
export class IntakeLimiter {
  private buckets = new Map<string, { count: number; expires: number }>();
  constructor(private readonly now: () => number = Date.now) {}

  allow(token: string, ip: string | null) {
    const now = this.now();
    for (const [key, bucket] of this.buckets)
      if (bucket.expires <= now) this.buckets.delete(key);
    const limits = [
      { key: "global", limit: 300 },
      { key: `ip:${ip ?? "unknown"}`, limit: 20 },
      { key: `token:${token}`, limit: 30 },
    ];
    if (
      limits.some(
        ({ key, limit }) => (this.buckets.get(key)?.count ?? 0) >= limit,
      )
    )
      return false;
    // Saturation fails closed instead of evicting live buckets to reset quotas.
    if (
      this.buckets.size +
        limits.filter(({ key }) => !this.buckets.has(key)).length >
      2048
    )
      return false;
    for (const { key } of limits) {
      const bucket = this.buckets.get(key) ?? {
        count: 0,
        expires: now + 60_000,
      };
      bucket.count++;
      this.buckets.set(key, bucket);
    }
    return true;
  }
}
