import Redis from 'ioredis';

let redis: Redis | null = null;
let lastConnectAttempt = 0;
const RECONNECT_INTERVAL = 30_000;
const MAX_MEMORY_STORE_SIZE = 10_000;
const memoryStore = new Map<string, { value: string; expireAt?: number }>();

function getRedisClient(): Redis | null {
  if (redis) return redis;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  const now = Date.now();
  if (now - lastConnectAttempt < RECONNECT_INTERVAL) return null;
  lastConnectAttempt = now;

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    redis.connect().catch(() => {
      console.warn('[Redis] Failed to connect, using in-memory fallback');
      redis = null;
    });

    return redis;
  } catch {
    return null;
  }
}

function cleanExpired() {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.expireAt && entry.expireAt <= now) {
      memoryStore.delete(key);
    }
  }
}

export const cache = {
  async get(key: string): Promise<string | null> {
    const client = getRedisClient();
    if (client) {
      try {
        return await client.get(key);
      } catch {
        // Fall through to memory
      }
    }

    cleanExpired();
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (entry.expireAt && entry.expireAt <= Date.now()) {
      memoryStore.delete(key);
      return null;
    }
    return entry.value;
  },

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const client = getRedisClient();
    if (client) {
      try {
        if (ttlSeconds) {
          await client.setex(key, ttlSeconds, value);
        } else {
          await client.set(key, value);
        }
        return;
      } catch {
        // Fall through to memory
      }
    }

    if (memoryStore.size >= MAX_MEMORY_STORE_SIZE) {
      const oldestKey = memoryStore.keys().next().value;
      if (oldestKey !== undefined) memoryStore.delete(oldestKey);
    }
    memoryStore.set(key, {
      value,
      expireAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  },

  async del(key: string): Promise<void> {
    const client = getRedisClient();
    if (client) {
      try {
        await client.del(key);
        return;
      } catch {
        // Fall through
      }
    }
    memoryStore.delete(key);
  },

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const client = getRedisClient();
    if (client) {
      try {
        const val = await client.incr(key);
        if (ttlSeconds) {
          await client.expire(key, ttlSeconds);
        }
        return val;
      } catch {
        // Fall through
      }
    }

    cleanExpired();
    const entry = memoryStore.get(key);
    const current = entry ? parseInt(entry.value, 10) || 0 : 0;
    const next = current + 1;
    memoryStore.set(key, {
      value: String(next),
      expireAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : entry?.expireAt,
    });
    return next;
  },

  isRedisAvailable(): boolean {
    return getRedisClient() !== null;
  },
};
