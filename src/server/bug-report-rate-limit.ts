/**
 * Bug-report rate limiting.
 *
 * Unauthenticated endpoint → in-memory limiter. Vercel lambdas are
 * per-instance, so this is best-effort abuse resistance, not a hard
 * guarantee; the goal is "one scripted spam loop per IP/fingerprint
 * doesn't mail-bomb the owner," which it achieves everywhere but
 * under a distributed attacker.
 *
 * NB: `report.ts` (and only it) mutates the map. Tests reset it.
 */

interface RateWindow {
  count: number;
  expires: number;
}

const buckets = new Map<string, RateWindow>();

/** Keep the map tiny even under foreign-key pressure. */
const MAX_BUCKETS = 10_000;

export const BUG_REPORT_WINDOW_MS = 60 * 60 * 1000;
export const BUG_REPORT_LIMIT = 10;

/**
 * Increments the client's counter and reports whether it may submit.
 * `expiresIn`/`now` are injectable for tests.
 */
export function takeBugReportToken(
  key: string,
  expiresIn: number = BUG_REPORT_WINDOW_MS,
  now: number = Date.now()
): { allowed: boolean; retryAfterSec?: number } {
  const existing = buckets.get(key);
  if (existing && existing.expires > now) {
    if (existing.count >= BUG_REPORT_LIMIT) {
      return {
        allowed: false,
        retryAfterSec: Math.ceil(existing.expires - now) / 1000
      };
    }
    existing.count += 1;
    return { allowed: true };
  }

  if (buckets.size >= MAX_BUCKETS) {
    buckets.clear();
  }
  buckets.set(key, { count: 1, expires: now + expiresIn });
  return { allowed: true };
}

/** Test seam: wipes all buckets. */
export function resetBugReportLimiter(): void {
  buckets.clear();
}
