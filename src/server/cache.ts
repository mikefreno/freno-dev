/**
 * Redis-backed Cache for Serverless
 *
 * Uses Redis for persistent caching across serverless invocations.
 * Redis provides:
 * - Fast in-memory storage
 * - Built-in TTL expiration (automatic cleanup)
 * - Persistence across function invocations
 * - Native support in Vercel and other platforms
 */

import { createClient } from "redis";
import { env } from "~/env/server";

let redisClient: ReturnType<typeof createClient> | null = null;
let isConnecting = false;
let connectionError: Error | null = null;

/**
 * Get or create Redis client (singleton pattern)
 */
async function getRedisClient() {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  if (isConnecting) {
    // Wait for existing connection attempt
    await new Promise((resolve) => setTimeout(resolve, 100));
    return getRedisClient();
  }

  if (connectionError) {
    throw connectionError;
  }

  try {
    isConnecting = true;
    redisClient = createClient({ url: env.REDIS_URL });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
      connectionError = err;
    });

    await redisClient.connect();
    isConnecting = false;
    connectionError = null;
    return redisClient;
  } catch (error) {
    isConnecting = false;
    connectionError = error as Error;
    console.error("Failed to connect to Redis:", error);
    throw error;
  }
}

/**
 * Redis-backed cache interface
 */
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = await getRedisClient();
      const value = await client.get(key);

      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key "${key}":`, error);
      return null;
    }
  },

  async set<T>(key: string, data: T, ttlMs: number): Promise<void> {
    try {
      const client = await getRedisClient();
      const value = JSON.stringify(data);

      // Redis SET with EX (expiry in seconds)
      await client.set(key, value, {
        EX: Math.ceil(ttlMs / 1000)
      });
    } catch (error) {
      console.error(`Cache set error for key "${key}":`, error);
    }
  },

  async delete(key: string): Promise<void> {
    try {
      const client = await getRedisClient();
      await client.del(key);
    } catch (error) {
      console.error(`Cache delete error for key "${key}":`, error);
    }
  },

  async deleteByPrefix(prefix: string): Promise<void> {
    try {
      const client = await getRedisClient();
      const keys = await client.keys(`${prefix}*`);

      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      console.error(
        `Cache deleteByPrefix error for prefix "${prefix}":`,
        error
      );
    }
  },

  async clear(): Promise<void> {
    try {
      const client = await getRedisClient();
      await client.flushDb();
    } catch (error) {
      console.error("Cache clear error:", error);
    }
  },

  async has(key: string): Promise<boolean> {
    try {
      const client = await getRedisClient();
      const exists = await client.exists(key);
      return exists === 1;
    } catch (error) {
      console.error(`Cache has error for key "${key}":`, error);
      return false;
    }
  }
};

/**
 * Execute function with Redis caching
 */
export async function withCache<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const result = await fn();
  await cache.set(key, result, ttlMs);
  return result;
}

/**
 * Execute function with Redis caching and stale data fallback
 *
 * Strategy:
 * 1. Try to get fresh cached data (within TTL)
 * 2. If not found, execute function
 * 3. If function fails, try to get stale data (ignore TTL)
 * 4. Store result with TTL for future requests
 */
export async function withCacheAndStale<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
  options: {
    maxStaleMs?: number;
    logErrors?: boolean;
  } = {}
): Promise<T> {
  const { maxStaleMs = 7 * 24 * 60 * 60 * 1000, logErrors = true } = options;

  // Try fresh cache
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  try {
    // Execute function
    const result = await fn();
    await cache.set(key, result, ttlMs);
    // Also store with longer TTL for stale fallback
    const staleKey = `${key}:stale`;
    await cache.set(staleKey, result, maxStaleMs);
    return result;
  } catch (error) {
    if (logErrors) {
      console.error(`Error fetching data for cache key "${key}":`, error);
    }

    // Try stale cache with longer TTL key
    const staleKey = `${key}:stale`;
    const staleData = await cache.get<T>(staleKey);

    if (staleData !== null) {
      if (logErrors) {
        console.log(`Serving stale data for cache key "${key}"`);
      }
      return staleData;
    }

    throw error;
  }
}
