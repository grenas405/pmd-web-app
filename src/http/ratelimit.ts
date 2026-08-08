/**
 * ratelimit.ts — fixed-window counters held in memory.
 *
 * Deliberately not a distributed rate limiter: this is one process on one box
 * in front of one contact form. The bounded map matters more than the
 * algorithm — an unbounded key space is itself a denial-of-service vector, so
 * the table has a hard ceiling and sheds the oldest windows when it is full.
 */

export interface Decision {
  readonly allowed: boolean;
  /** Seconds until the window resets. Sent as `Retry-After` on a refusal. */
  readonly retryAfterSeconds: number;
}

export interface RateLimiterOptions {
  readonly limit: number;
  readonly windowMs: number;
  /** Injected so tests do not have to sleep. */
  readonly now?: () => number;
  readonly maxKeys?: number;
}

export interface RateLimiter {
  readonly check: (key: string) => Decision;
  readonly size: () => number;
}

interface Window {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const now = options.now ?? Date.now;
  const maxKeys = options.maxKeys ?? 10_000;
  const windows = new Map<string, Window>();

  function prune(currentTime: number): void {
    for (const [key, window] of windows) {
      if (window.resetAt <= currentTime) windows.delete(key);
    }
    // Insertion order is age order closely enough; drop the oldest entries
    // until the table is back under its ceiling.
    while (windows.size >= maxKeys) {
      const oldest = windows.keys().next();
      if (oldest.done === true) break;
      windows.delete(oldest.value);
    }
  }

  return Object.freeze({
    check(key: string): Decision {
      const currentTime = now();
      const existing = windows.get(key);

      if (existing === undefined || existing.resetAt <= currentTime) {
        if (windows.size >= maxKeys) prune(currentTime);
        windows.set(key, { count: 1, resetAt: currentTime + options.windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }

      existing.count += 1;
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - currentTime) / 1000));
      return { allowed: existing.count <= options.limit, retryAfterSeconds };
    },
    size: () => windows.size,
  });
}

/**
 * Identify the client for rate limiting.
 *
 * `X-Forwarded-For` is only consulted when the operator has declared that a
 * proxy sits in front (`TRUST_PROXY=true`); trusting it unconditionally would
 * let any client pick its own rate-limit bucket. Only the first hop is used.
 */
export function clientKey(
  request: Request,
  remoteAddress: string,
  trustProxy: boolean,
): string {
  if (!trustProxy) return remoteAddress;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded === null) return remoteAddress;
  const first = forwarded.split(",")[0]?.trim() ?? "";
  return first.length > 0 && first.length <= 45 ? first : remoteAddress;
}
