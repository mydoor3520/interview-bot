interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const ipLimits = new Map<string, RateLimitEntry>();

const DEMO_RATE_LIMIT = 10;
const DEMO_RATE_WINDOW = 600_000; // 10 minutes
const CLEANUP_INTERVAL = 120_000; // 2 minutes

// Periodic cleanup of expired entries
if (typeof globalThis !== 'undefined') {
  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of ipLimits) {
      if (now > entry.resetAt) ipLimits.delete(key);
    }
  };
  setInterval(cleanup, CLEANUP_INTERVAL).unref?.();
}

export function checkDemoRateLimit(ip: string): { allowed: false; retryAfter: number } | { allowed: true } {
  const key = `demo:${ip}`;
  const now = Date.now();
  const entry = ipLimits.get(key);

  if (!entry || now > entry.resetAt) {
    ipLimits.set(key, { count: 1, resetAt: now + DEMO_RATE_WINDOW });
    return { allowed: true };
  }

  if (entry.count >= DEMO_RATE_LIMIT) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}
