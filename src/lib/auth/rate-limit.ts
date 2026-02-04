import { prisma } from '@/lib/db/prisma';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000; // 1 minute

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Check if an IP address is within rate limits
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - WINDOW_MS);

  // Count recent attempts
  const recentAttempts = await prisma.loginAttempt.count({
    where: {
      ip,
      createdAt: {
        gte: windowStart,
      },
    },
  });

  const remaining = Math.max(0, MAX_ATTEMPTS - recentAttempts);
  const allowed = recentAttempts < MAX_ATTEMPTS;

  return { allowed, remaining };
}

/**
 * Record a login attempt
 */
export async function recordLoginAttempt(ip: string, success: boolean): Promise<void> {
  await prisma.loginAttempt.create({
    data: {
      ip,
      success,
    },
  });

  // Cleanup old attempts (older than 1 hour)
  const cleanupTime = new Date(Date.now() - 60 * 60 * 1000);
  await prisma.loginAttempt.deleteMany({
    where: {
      createdAt: {
        lt: cleanupTime,
      },
    },
  });
}
