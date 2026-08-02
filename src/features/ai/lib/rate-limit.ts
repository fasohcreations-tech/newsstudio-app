import "server-only";

/**
 * Lightweight in-memory rate limiter for AI server actions.
 * Per-process only — replace with Redis for multi-instance production.
 */

type Bucket = {
  timestamps: number[];
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterMs: number };

export function checkAIRateLimit(
  key: string,
  opts: { limit: number; windowMs: number } = {
    limit: 20,
    windowMs: 60_000,
  },
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter(
    (t) => now - t < opts.windowMs,
  );

  if (bucket.timestamps.length >= opts.limit) {
    const oldest = bucket.timestamps[0] ?? now;
    buckets.set(key, bucket);
    return {
      allowed: false,
      retryAfterMs: Math.max(0, opts.windowMs - (now - oldest)),
    };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return {
    allowed: true,
    remaining: Math.max(0, opts.limit - bucket.timestamps.length),
  };
}
