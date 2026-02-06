/**
 * Simple in-memory per-user rate limiter for mutation endpoints.
 * Uses a sliding window approach.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const userLimits = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of userLimits) {
    if (now > entry.resetAt) {
      userLimits.delete(key);
    }
  }
}, 60_000);

/**
 * Check if a user has exceeded their rate limit.
 * @param userId - The user's ID
 * @param endpoint - The API endpoint name (for separate limits per endpoint group)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns null if allowed, or { retryAfter: number } if rate limited
 */
export function checkUserRateLimit(
  userId: string,
  endpoint: string,
  maxRequests: number = 30,
  windowMs: number = 60_000,
): { retryAfter: number } | null {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  const entry = userLimits.get(key);

  if (!entry || now > entry.resetAt) {
    userLimits.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (entry.count >= maxRequests) {
    return { retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return null;
}
