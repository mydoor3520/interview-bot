import dns from 'dns/promises';

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fe80:/i,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
];

export function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_RANGES.some(r => r.test(ip));
}

/**
 * Synchronous URL pattern matching — no DNS, hostname-only validation.
 * Use in Playwright page.route() handlers where async DNS would block.
 */
export function isUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    if (isPrivateIP(hostname)) return false;
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (hostname === 'localhost' || hostname.endsWith('.local')) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Full URL safety validation with async DNS resolution.
 * Use only for initial user-input URL validation (not subrequests).
 */
export async function validateUrlSafety(url: string): Promise<void> {
  if (!isUrlSafe(url)) {
    throw new Error('SSRF_BLOCKED');
  }

  const parsed = new URL(url);
  const hostname = parsed.hostname;

  try {
    const addresses = await dns.resolve4(hostname);
    if (addresses.some(isPrivateIP)) {
      throw new Error('SSRF_BLOCKED');
    }
  } catch (err) {
    if ((err as Error).message === 'SSRF_BLOCKED') throw err;
    // DNS resolution failure — fail closed to prevent SSRF bypass
    throw new Error('SSRF_BLOCKED');
  }

  try {
    const addresses6 = await dns.resolve6(hostname);
    if (addresses6.some(isPrivateIP)) {
      throw new Error('SSRF_BLOCKED');
    }
  } catch (err) {
    if ((err as Error).message === 'SSRF_BLOCKED') throw err;
    // IPv6 resolution failure is acceptable (many hosts are IPv4-only)
  }
}
