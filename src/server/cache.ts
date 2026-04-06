/**
 * In-memory cache with TTL
 *
 * Redis was replaced because on a low-traffic site the cache TTL almost always
 * expires between visits, so every request paid Redis connection + round-trip
 * overhead with no benefit. A module-level Map has zero network latency:
 * cache hits are a single dictionary lookup, misses fall through immediately.
 */

import { CACHE_CONFIG } from "~/config";

interface CacheEntry<T> {
  data: T;
  /** Absolute timestamp (ms) after which this entry is considered stale */
  expiresAt: number;
  /** Absolute timestamp (ms) after which stale fallback is also discarded */
  staleExpiresAt: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Map<string, CacheEntry<any>>();

export const cache = {
  get<T>(key: string): T | null {
    const entry = store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) return null;
    return entry.data;
  },

  set<T>(key: string, data: T, ttlMs: number): void {
    const existing = store.get(key);
    store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      // Preserve an existing stale expiry if it's longer, otherwise default
      staleExpiresAt:
        existing?.staleExpiresAt ?? Date.now() + CACHE_CONFIG.MAX_STALE_DATA_MS
    });
  },

  delete(key: string): void {
    store.delete(key);
  },

  deleteByPrefix(prefix: string): void {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  },

  clear(): void {
    store.clear();
  },

  has(key: string): boolean {
    const entry = store.get(key);
    if (!entry) return false;
    return Date.now() <= entry.expiresAt;
  }
};

/**
 * Execute function with in-memory caching.
 */
export async function withCache<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) return cached;

  const result = await fn();
  cache.set(key, result, ttlMs);
  return result;
}

/**
 * Execute function with caching and stale-data fallback.
 *
 * Strategy:
 * 1. Return data if fresh (within TTL).
 * 2. Otherwise run fn().
 * 3. If fn() throws, return stale data if still within maxStaleMs.
 * 4. Store fresh result for future requests.
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
  const { maxStaleMs = CACHE_CONFIG.MAX_STALE_DATA_MS, logErrors = true } =
    options;

  const now = Date.now();
  const entry = store.get(key) as CacheEntry<T> | undefined;

  // Fresh hit
  if (entry && entry.expiresAt > now) return entry.data;

  try {
    const result = await fn();
    store.set(key, {
      data: result,
      expiresAt: now + ttlMs,
      staleExpiresAt: now + maxStaleMs
    });
    return result;
  } catch (error) {
    if (logErrors) {
      console.error(`Error fetching data for cache key "${key}":`, error);
    }

    // Stale fallback
    if (entry && entry.staleExpiresAt > now) {
      if (logErrors) console.log(`Serving stale data for cache key "${key}"`);
      return entry.data;
    }

    throw error;
  }
}
