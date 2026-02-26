/**
 * Per-site rate limiter for job parsing.
 * Prevents overwhelming job sites with too many concurrent requests.
 * Uses in-memory tracking with sliding window approach.
 */

interface SiteRateLimit {
  maxPerHour: number;
  maxConcurrent: number;
}

interface RequestEntry {
  timestamp: number;
}

interface ConcurrencySlot {
  inUse: boolean;
  acquiredAt: number;
}

// Per-site rate limits for known Korean job sites
const SITE_RATE_LIMITS: Record<string, SiteRateLimit> = {
  'saramin.co.kr': { maxPerHour: 20, maxConcurrent: 2 },
  'www.saramin.co.kr': { maxPerHour: 20, maxConcurrent: 2 },
  'wanted.co.kr': { maxPerHour: 10, maxConcurrent: 1 },
  'www.wanted.co.kr': { maxPerHour: 10, maxConcurrent: 1 },
  'jobkorea.co.kr': { maxPerHour: 15, maxConcurrent: 1 },
  'www.jobkorea.co.kr': { maxPerHour: 15, maxConcurrent: 1 },
  'rocketpunch.com': { maxPerHour: 10, maxConcurrent: 1 },
  'www.rocketpunch.com': { maxPerHour: 10, maxConcurrent: 1 },
  'career.programmers.co.kr': { maxPerHour: 10, maxConcurrent: 1 },
  'jumpit.saramin.co.kr': { maxPerHour: 10, maxConcurrent: 1 },
  'rallit.com': { maxPerHour: 10, maxConcurrent: 1 },
  'job.incruit.com': { maxPerHour: 10, maxConcurrent: 1 },
};

// Default limits for unknown sites (conservative)
const DEFAULT_RATE_LIMIT: SiteRateLimit = {
  maxPerHour: 5,
  maxConcurrent: 1,
};

// In-memory storage
const siteRequests = new Map<string, RequestEntry[]>();
const siteConcurrency = new Map<string, ConcurrencySlot[]>();

// Clean up old request entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  for (const [hostname, entries] of Array.from(siteRequests.entries())) {
    const validEntries = entries.filter(e => e.timestamp > oneHourAgo);
    if (validEntries.length === 0) {
      siteRequests.delete(hostname);
    } else {
      siteRequests.set(hostname, validEntries);
    }
  }

  // Clean up stale concurrency slots (over 5 minutes old)
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  for (const [hostname, slots] of Array.from(siteConcurrency.entries())) {
    for (const slot of slots) {
      if (slot.inUse && slot.acquiredAt < fiveMinutesAgo) {
        console.warn(`[SiteRateLimiter] Force-releasing stale concurrency slot for ${hostname}`);
        slot.inUse = false;
      }
    }
  }
}, 5 * 60 * 1000);

/**
 * Extract root domain from hostname for rate limit matching.
 * Examples:
 * - www.saramin.co.kr → saramin.co.kr
 * - jumpit.saramin.co.kr → jumpit.saramin.co.kr (preserve subdomain for specific sites)
 */
function normalizeHostname(hostname: string): string {
  // If it matches a specific entry in SITE_RATE_LIMITS, return as-is
  if (SITE_RATE_LIMITS[hostname]) {
    return hostname;
  }

  // Try removing www. prefix
  const withoutWww = hostname.replace(/^www\./, '');
  if (SITE_RATE_LIMITS[withoutWww]) {
    return withoutWww;
  }

  // Return original hostname for unknown sites
  return hostname;
}

/**
 * Get rate limit configuration for a hostname.
 */
function getSiteLimit(hostname: string): SiteRateLimit {
  const normalized = normalizeHostname(hostname);
  return SITE_RATE_LIMITS[normalized] || DEFAULT_RATE_LIMIT;
}

/**
 * Check if a request to the given hostname is allowed under rate limits.
 * @returns { allowed: true } if request can proceed, or { allowed: false, retryAfterMs } if rate limited
 */
export function checkSiteRateLimit(hostname: string):
  | { allowed: true }
  | { allowed: false; retryAfterMs: number } {
  const normalized = normalizeHostname(hostname);
  const limit = getSiteLimit(normalized);
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  // Get or initialize request history
  let entries = siteRequests.get(normalized) || [];

  // Filter to requests within the last hour
  entries = entries.filter(e => e.timestamp > oneHourAgo);
  siteRequests.set(normalized, entries);

  // Check if we've exceeded the hourly limit
  if (entries.length >= limit.maxPerHour) {
    const oldestEntry = entries[0];
    const retryAfterMs = oldestEntry.timestamp + 60 * 60 * 1000 - now;
    return { allowed: false, retryAfterMs: Math.max(1000, retryAfterMs) };
  }

  return { allowed: true };
}

/**
 * Acquire a concurrency slot for the given hostname.
 * Blocks (with timeout) if max concurrent requests reached.
 * @returns A release function to call when the request completes, or null if timeout
 */
export async function acquireSiteConcurrency(
  hostname: string,
  timeoutMs: number = 30_000
): Promise<(() => void) | null> {
  const normalized = normalizeHostname(hostname);
  const limit = getSiteLimit(normalized);

  // Initialize slots if needed
  if (!siteConcurrency.has(normalized)) {
    const slots: ConcurrencySlot[] = Array.from({ length: limit.maxConcurrent }, () => ({
      inUse: false,
      acquiredAt: 0,
    }));
    siteConcurrency.set(normalized, slots);
  }

  const slots = siteConcurrency.get(normalized)!;
  const startTime = Date.now();

  // Poll for available slot
  while (Date.now() - startTime < timeoutMs) {
    const freeSlot = slots.find(s => !s.inUse);
    if (freeSlot) {
      freeSlot.inUse = true;
      freeSlot.acquiredAt = Date.now();

      // Return release function
      return () => {
        freeSlot.inUse = false;
      };
    }

    // Wait 100ms before retry
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Timeout - no slot available
  console.warn(`[SiteRateLimiter] Concurrency timeout for ${normalized} after ${timeoutMs}ms`);
  return null;
}

/**
 * Record that a request was made to the given hostname.
 * Call this after successfully making a request.
 */
export function recordSiteRequest(hostname: string): void {
  const normalized = normalizeHostname(hostname);
  const now = Date.now();

  const entries = siteRequests.get(normalized) || [];
  entries.push({ timestamp: now });
  siteRequests.set(normalized, entries);
}

/**
 * Get current rate limit status for a hostname (for debugging/monitoring).
 */
export function getSiteRateLimitStatus(hostname: string): {
  hostname: string;
  normalized: string;
  limit: SiteRateLimit;
  currentRequests: number;
  concurrentSlots: { total: number; inUse: number };
} {
  const normalized = normalizeHostname(hostname);
  const limit = getSiteLimit(normalized);
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  const entries = siteRequests.get(normalized) || [];
  const validEntries = entries.filter(e => e.timestamp > oneHourAgo);

  const slots = siteConcurrency.get(normalized) || [];
  const inUseSlots = slots.filter(s => s.inUse).length;

  return {
    hostname,
    normalized,
    limit,
    currentRequests: validEntries.length,
    concurrentSlots: {
      total: limit.maxConcurrent,
      inUse: inUseSlots,
    },
  };
}
