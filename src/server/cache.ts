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

  /**
   * Get cached data even if expired (for stale-while-revalidate)
   */
  getStale<T>(key: string): T | null {
    const entry = this.cache.get(key);
    return entry ? (entry.data as T) : null;
  }

  /**
   * Check if cache entry exists (regardless of expiration)
   */
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

  /**
   * Delete all keys starting with a prefix
   */
  deleteByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new SimpleCache();

// Helper function to wrap async operations with caching
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
 * Cache wrapper with stale-while-revalidate support
 * Returns stale data if fetch fails, with optional stale time limit
 */
export async function withCacheAndStale<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
  options: {
    maxStaleMs?: number; // Maximum age of stale data to return (default: 7 days)
    logErrors?: boolean; // Whether to log errors (default: true)
  } = {}
): Promise<T> {
  const { maxStaleMs = 7 * 24 * 60 * 60 * 1000, logErrors = true } = options;

  // Try to get fresh cached data
  const cached = cache.get<T>(key, ttlMs);
  if (cached !== null) {
    return cached;
  }

  // Try to fetch new data
  try {
    const result = await fn();
    cache.set(key, result);
    return result;
  } catch (error) {
    if (logErrors) {
      console.error(`Error fetching data for cache key "${key}":`, error);
    }

    // If fetch fails, try to serve stale data
    const stale = cache.getStale<T>(key);
    if (stale !== null) {
      // Check if stale data is within acceptable age
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

    // No stale data available or too old, re-throw the error
    throw error;
  }
}
