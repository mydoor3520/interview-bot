/**
 * Simple in-memory rate limiter for AI API calls.
 * Limits requests per minute to prevent abuse.
 */
const AI_RATE_LIMIT = 20; // max requests per minute
const AI_RATE_WINDOW = 60_000; // 1 minute

const requestTimestamps: number[] = [];

export function checkAIRateLimit(): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();

  // Remove expired timestamps
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - AI_RATE_WINDOW) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length >= AI_RATE_LIMIT) {
    const oldestInWindow = requestTimestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + AI_RATE_WINDOW - now) / 1000);
    return { allowed: false, retryAfter };
  }

  requestTimestamps.push(now);
  return { allowed: true };
}
