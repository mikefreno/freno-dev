import { CACHE_CONFIG } from "~/config";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  get<T>(key: string, ttlMs: number): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  getStale<T>(key: string): T | null {
    const entry = this.cache.get(key);
    return entry ? (entry.data as T) : null;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  deleteByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new SimpleCache();
export async function withCache<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = cache.get<T>(key, ttlMs);
  if (cached !== null) {
    return cached;
  }

  const result = await fn();
  cache.set(key, result);
  return result;
}

/**
 * Returns stale data if fetch fails, with optional stale time limit
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

  const cached = cache.get<T>(key, ttlMs);
  if (cached !== null) {
    return cached;
  }

  try {
    const result = await fn();
    cache.set(key, result);
    return result;
  } catch (error) {
    if (logErrors) {
      console.error(`Error fetching data for cache key "${key}":`, error);
    }

    const stale = cache.getStale<T>(key);
    if (stale !== null) {
      const entry = (cache as any).cache.get(key);
      const age = Date.now() - entry.timestamp;

      if (age <= maxStaleMs) {
        if (logErrors) {
          console.log(
            `Serving stale data for cache key "${key}" (age: ${Math.round(age / 1000 / 60)}m)`
          );
        }
        return stale;
      }
    }

    throw error;
  }
}
