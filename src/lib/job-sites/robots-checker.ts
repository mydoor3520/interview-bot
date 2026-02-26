import { cache } from '@/lib/redis/client';

export interface RobotsCheckResult {
  allowed: boolean;
  reason?: string;
}

interface RobotsRule {
  userAgent: string;
  disallowPaths: string[];
  allowPaths: string[];
}

const USER_AGENT = 'InterviewBot/1.0';
const ROBOTS_CACHE_TTL = 24 * 60 * 60; // 24 hours
const FETCH_TIMEOUT = 5000; // 5 seconds

/**
 * Parse robots.txt content into structured rules
 */
function parseRobotsTxt(content: string): RobotsRule[] {
  const rules: RobotsRule[] = [];
  let currentRule: RobotsRule | null = null;

  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const directive = trimmed.slice(0, colonIndex).trim().toLowerCase();
    const value = trimmed.slice(colonIndex + 1).trim();

    if (directive === 'user-agent') {
      // Start a new rule block
      if (currentRule) {
        rules.push(currentRule);
      }
      currentRule = {
        userAgent: value.toLowerCase(),
        disallowPaths: [],
        allowPaths: [],
      };
    } else if (currentRule) {
      if (directive === 'disallow') {
        if (value) {
          currentRule.disallowPaths.push(value);
        }
      } else if (directive === 'allow') {
        if (value) {
          currentRule.allowPaths.push(value);
        }
      }
    }
  }

  // Push the last rule
  if (currentRule) {
    rules.push(currentRule);
  }

  return rules;
}

/**
 * Check if a path matches a robots.txt pattern
 */
function matchesPattern(path: string, pattern: string): boolean {
  // Handle exact match
  if (pattern === path) return true;

  // Handle prefix match (most common case)
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return path.startsWith(prefix);
  }

  // Default: prefix match for patterns ending with /
  if (pattern.endsWith('/')) {
    return path.startsWith(pattern);
  }

  // Exact prefix match
  return path.startsWith(pattern);
}

/**
 * Check if a path is allowed based on parsed rules
 */
function isPathAllowed(path: string, rules: RobotsRule[]): boolean {
  // Find applicable rules for our user agent and wildcard
  const ourRules = rules.filter(
    (r) => r.userAgent === 'interviewbot' || r.userAgent === '*'
  );

  if (ourRules.length === 0) {
    // No rules = everything allowed
    return true;
  }

  // Check specific InterviewBot rules first, then wildcard
  const sortedRules = ourRules.sort((a, b) => {
    if (a.userAgent === 'interviewbot' && b.userAgent === '*') return -1;
    if (a.userAgent === '*' && b.userAgent === 'interviewbot') return 1;
    return 0;
  });

  for (const rule of sortedRules) {
    // Allow rules take precedence over Disallow for more specific paths
    // Check most specific (longest) paths first
    const allPaths = [
      ...rule.allowPaths.map((p) => ({ path: p, allow: true })),
      ...rule.disallowPaths.map((p) => ({ path: p, allow: false })),
    ].sort((a, b) => b.path.length - a.path.length);

    for (const { path: pattern, allow } of allPaths) {
      if (matchesPattern(path, pattern)) {
        return allow;
      }
    }
  }

  // No matching rules = allowed
  return true;
}

/**
 * Fetch robots.txt with timeout
 */
async function fetchRobotsTxt(domain: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(`https://${domain}/robots.txt`, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return await response.text();
    }

    // 404 or other errors = no robots.txt = everything allowed
    return null;
  } catch (error) {
    clearTimeout(timeoutId);

    // Network errors, timeout, etc. = conservative default (allow)
    console.warn(`[RobotsChecker] Failed to fetch robots.txt for ${domain}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Check if a URL path is allowed by the site's robots.txt
 * Uses User-Agent: InterviewBot/1.0
 * Caches robots.txt per domain for 24 hours
 */
export async function checkRobotsTxt(url: string): Promise<RobotsCheckResult> {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return {
      allowed: false,
      reason: 'invalid_url',
    };
  }

  const domain = parsedUrl.hostname;
  const path = parsedUrl.pathname + parsedUrl.search; // Include query string
  const cacheKey = `robots:${domain}`;

  // Check cache first
  const cached = await cache.get(cacheKey);
  let robotsContent: string | null;

  if (cached) {
    robotsContent = cached === '__EMPTY__' ? null : cached;
  } else {
    // Fetch robots.txt
    robotsContent = await fetchRobotsTxt(domain);

    // Cache the result (use sentinel value for missing robots.txt)
    await cache.set(cacheKey, robotsContent || '__EMPTY__', ROBOTS_CACHE_TTL);
  }

  // No robots.txt = everything allowed
  if (!robotsContent) {
    return { allowed: true };
  }

  // Parse and check
  const rules = parseRobotsTxt(robotsContent);
  const allowed = isPathAllowed(path, rules);

  if (!allowed) {
    console.warn(`[RobotsChecker] Blocked by robots.txt: ${url}`);
    return {
      allowed: false,
      reason: 'disallowed_by_robots',
    };
  }

  return { allowed: true };
}
