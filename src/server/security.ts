import { TRPCError } from "@trpc/server";
import { getCookie, setCookie } from "vinxi/http";
import type { H3Event } from "vinxi/http";
import { t } from "~/server/api/utils";
import { logAuditEvent } from "~/server/audit";
import { env } from "~/env/server";
import {
  AUTH_CONFIG,
  RATE_LIMITS as CONFIG_RATE_LIMITS,
  ACCOUNT_LOCKOUT as CONFIG_ACCOUNT_LOCKOUT,
  PASSWORD_RESET_CONFIG as CONFIG_PASSWORD_RESET,
  CACHE_CONFIG
} from "~/config";

/**
 * Short-TTL local rate-limit cache (p8-010).
 *
 * The authoritative rate-limit state lives in the shared DB store
 * (`RateLimit` table) so limits hold across ALL instances and survive
 * restarts / redeploys. This per-instance `Map` is ONLY a short-TTL local
 * cache used to fast-fail already-blocked identifiers without hitting the DB
 * during brute-force storms. It can NEVER let a request bypass the limit: every
 * non-cached (or TTL-expired) check performs an atomic DB upsert which is the
 * single source of truth for the counter.
 *
 * Key: identifier, Value: { count, resetAt, lastChecked }
 */
interface RateLimitCacheEntry {
  count: number;
  resetAt: number;
  lastChecked: number;
}

const rateLimitCache = new Map<string, RateLimitCacheEntry>();

/**
 * Invalidate the local cache entry for a given identifier.
 * Used by callers that reset DB-backed rate-limit state so a same-instance
 * follow-up check does not serve a stale "blocked" decision.
 */
function invalidateRateLimitCache(identifier: string): void {
  rateLimitCache.delete(identifier);
}

/**
 * Clear the entire local cache (testing / simulated instance restart).
 * Does NOT touch the shared DB store — used by tests to simulate a fresh
 * instance reading state purely from the shared store.
 */
export function clearRateLimitLocalCache(): void {
  rateLimitCache.clear();
}

/**
 * Cleanup stale cache entries (prevent memory leak)
 */
function cleanupRateLimitCache(): void {
  const now = Date.now();
  const staleThreshold = now - 2 * CACHE_CONFIG.RATE_LIMIT_CACHE_TTL_MS;

  for (const [key, entry] of rateLimitCache.entries()) {
    if (entry.lastChecked < staleThreshold || entry.resetAt < now) {
      rateLimitCache.delete(key);
    }
  }
}

// Periodic cache cleanup (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimitCache, 5 * 60 * 1000);
}

/**
 * Ensure the shared `RateLimit` table + unique identifier index exist.
 *
 * `ON CONFLICT(identifier)` upserts require a UNIQUE constraint on
 * `identifier`; the deployed table predates this, so we create the table
 * (idempotently) and add the unique index. Memoized so it runs at most once
 * per process. Never blocks requests on schema errors — a failure resets the
 * memo so the next check can retry.
 */
let ensureSchemaPromise: Promise<void> | null = null;
export async function ensureRateLimitSchema(): Promise<void> {
  if (ensureSchemaPromise) return ensureSchemaPromise;
  ensureSchemaPromise = (async () => {
    try {
      const { ConnectionFactory } = await import("./database");
      const conn = ConnectionFactory();
      await conn.execute({
        sql: `CREATE TABLE IF NOT EXISTS RateLimit (
          id TEXT PRIMARY KEY,
          identifier TEXT NOT NULL,
          count INTEGER NOT NULL DEFAULT 1,
          reset_at TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
        args: []
      });
      // Unique index so ON CONFLICT(identifier) upserts are well-defined.
      // The app already assumes one row per identifier; if duplicate rows
      // existed this would throw (and the upsert path would surface it).
      await conn.execute({
        sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_ratelimit_identifier_unique
              ON RateLimit(identifier)`,
        args: []
      });
    } catch (error) {
      ensureSchemaPromise = null; // allow a later call to retry
      console.error("[security] ensureRateLimitSchema failed:", error);
    }
  })();
  return ensureSchemaPromise;
}

/**
 * Extract cookie value from H3Event (works in both production and tests)
 */
function getCookieValue(event: H3Event, name: string): string | undefined {
  try {
    const value = getCookie(event, name);
    if (value) return value;
  } catch (e) {
    console.warn(
      "[security] getCookie failed, falling back to header parse:",
      e
    );
  }

  try {
    const cookieHeader =
      event.headers?.get?.("cookie") ||
      (event.headers as any)?.cookie ||
      event.node?.req?.headers?.cookie ||
      "";
    const cookies = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .reduce(
        (acc, cookie) => {
          const [key, value] = cookie.split("=");
          if (key && value) acc[key] = value;
          return acc;
        },
        {} as Record<string, string>
      );
    return cookies[name];
  } catch {
    return undefined;
  }
}

/**
 * Set cookie (works in both production and tests)
 */
function setCookieValue(
  event: H3Event,
  name: string,
  value: string,
  options: any
): void {
  try {
    setCookie(event, name, value, options);
  } catch (e) {
    if (!event.node) event.node = { req: { headers: {} } } as any;
    if (!event.node.res) event.node.res = {} as any;
    if (!event.node.res.cookies) event.node.res.cookies = {} as any;
    event.node.res.cookies[name] = value;
  }
}

/**
 * Extract header value from H3Event (works in both production and tests)
 */
function getHeaderValue(event: H3Event, name: string): string | null {
  try {
    if (event.request?.headers?.get) {
      const val = event.request.headers.get(name);
      if (val !== null && val !== undefined) return val;
    }
    if (event.headers) {
      if (typeof (event.headers as any).get === "function") {
        const val = (event.headers as any).get(name);
        if (val !== null && val !== undefined) return val;
      }
      if (typeof event.headers === "object") {
        const val = (event.headers as any)[name];
        if (val !== undefined) return val;
      }
    }
    if (event.node?.req?.headers) {
      const val = event.node.req.headers[name];
      if (val !== undefined) return val;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomUUID();
}

/**
 * Set CSRF token cookie
 */
export function setCSRFToken(event: H3Event): string {
  const token = generateCSRFToken();
  setCookieValue(event, "csrf-token", token, {
    maxAge: AUTH_CONFIG.CSRF_TOKEN_MAX_AGE,
    path: "/",
    httpOnly: false,
    secure: env.NODE_ENV === "production",
    sameSite: "lax"
  });
  return token;
}

/**
 * Validate CSRF token from request header against cookie
 */
export function validateCSRFToken(event: H3Event): boolean {
  const headerToken = getHeaderValue(event, "x-csrf-token");
  const cookieToken = getCookieValue(event, "csrf-token");

  if (!headerToken || !cookieToken) {
    return false;
  }

  return timingSafeEqual(headerToken, cookieToken);
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * CSRF protection middleware for tRPC
 * Use this on all mutation procedures that modify state
 */
export const csrfProtection = t.middleware(async ({ ctx, next }) => {
  const isValid = validateCSRFToken(ctx.event.nativeEvent);

  if (!isValid) {
    const { ipAddress, userAgent } = getAuditContext(ctx.event.nativeEvent);
    await logAuditEvent({
      eventType: "security.csrf.failed",
      eventData: {
        headerToken: getHeaderValue(ctx.event.nativeEvent, "x-csrf-token")
          ? "present"
          : "missing",
        cookieToken: getCookieValue(ctx.event.nativeEvent, "csrf-token")
          ? "present"
          : "missing"
      },
      ipAddress,
      userAgent,
      success: false
    });

    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Invalid CSRF token"
    });
  }

  return next();
});

/**
 * Protected procedure with CSRF validation
 */
export const csrfProtectedProcedure = t.procedure.use(csrfProtection);

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * Clear rate limit store (for testing only)
 * Clears all rate limit records from the database and the local cache.
 */
export async function clearRateLimitStore(): Promise<void> {
  await ensureRateLimitSchema();
  clearRateLimitLocalCache();
  const { ConnectionFactory } = await import("./database");
  const conn = ConnectionFactory();
  await conn.execute({
    sql: "DELETE FROM RateLimit",
    args: []
  });
}

/**
 * Opportunistic cleanup of expired rate limit entries
 * Called probabilistically during rate limit checks (serverless-friendly)
 * Note: setInterval is not reliable in serverless environments
 */
async function cleanupExpiredRateLimits(): Promise<void> {
  try {
    const { ConnectionFactory } = await import("./database");
    const conn = ConnectionFactory();
    const now = new Date().toISOString();
    await conn.execute({
      sql: "DELETE FROM RateLimit WHERE reset_at < ?",
      args: [now]
    });
  } catch (error) {
    // Silent fail - cleanup is opportunistic
    console.error("Failed to cleanup expired rate limits:", error);
  }
}

/**
 * Get client IP address from request headers.
 * Only trusts X-Forwarded-For outside of local development (set by the Vercel
 * edge network in production; trusted in tests so the header-parsing path is
 * exercised). In local development, uses the socket address to prevent header
 * spoofing.
 */
export function getClientIP(event: H3Event): string {
  // In production on Vercel, X-Forwarded-For is set by the edge network
  // and cannot be spoofed by clients. In dev, ignore it.
  if (env.NODE_ENV !== "development") {
    const forwarded = getHeaderValue(event, "x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    const realIP = getHeaderValue(event, "x-real-ip");
    if (realIP) {
      return realIP;
    }
  }

  // Fallback: try socket remote address
  try {
    const nodeReq = event.node.req;
    if (nodeReq?.socket?.remoteAddress) {
      const addr = nodeReq.socket.remoteAddress;
      // Clean up IPv6-mapped IPv4 addresses
      return addr.replace(/^::ffff:/, "");
    }
  } catch {
    // socket access failed
  }

  return "unknown";
}

/**
 * Get user agent from request headers
 */
export function getUserAgent(event: H3Event): string {
  return getHeaderValue(event, "user-agent") || "unknown";
}

/**
 * Extract audit context from H3Event
 */
export function getAuditContext(event: H3Event): {
  ipAddress: string;
  userAgent: string;
} {
  return {
    ipAddress: getClientIP(event),
    userAgent: getUserAgent(event)
  };
}

/**
 * Check rate limit for a given identifier against the SHARED distributed store.
 *
 * The counter lives in the `RateLimit` DB table and is incremented with a
 * single atomic `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` round-trip,
 * so limits hold across all instances/redeploys and cannot be bypassed by
 * distributing requests across instances. A short-TTL local cache is used ONLY
 * to fast-fail already-blocked identifiers (cuts DB load during brute-force
 * storms); it can never let a request through.
 *
 * @param identifier - Unique identifier (e.g., "login:ip:192.168.1.1")
 * @param maxAttempts - Maximum number of attempts allowed
 * @param windowMs - Time window in milliseconds
 * @param event - H3Event for audit logging (optional)
 * @returns Remaining attempts before limit is hit
 * @throws TRPCError if rate limit exceeded
 */
export async function checkRateLimit(
  identifier: string,
  maxAttempts: number,
  windowMs: number,
  event?: H3Event
): Promise<number> {
  await ensureRateLimitSchema();

  const now = Date.now();
  const resetAtMs = now + windowMs;
  const resetAtIso = new Date(resetAtMs).toISOString();
  const nowIso = new Date(now).toISOString();

  // Short-TTL local cache: fast-fail already-blocked identifiers without a
  // DB round-trip. Only applies when the cached state still says "over limit"
  // AND the window has not expired AND the cache entry is fresh. This can
  // never let a request bypass the limit — at worst it briefly over-blocks
  // (corrected on the next DB-backed check after the TTL / window expires).
  const cached = rateLimitCache.get(identifier);
  if (
    cached &&
    now - cached.lastChecked < CACHE_CONFIG.RATE_LIMIT_CACHE_TTL_MS &&
    cached.resetAt > now &&
    cached.count >= maxAttempts
  ) {
    const remainingMs = cached.resetAt - now;
    const remainingSec = Math.max(1, Math.ceil(remainingMs / 1000));

    if (event) {
      const { ipAddress, userAgent } = getAuditContext(event);
      logAuditEvent({
        eventType: "security.rate_limit.exceeded",
        eventData: {
          identifier,
          maxAttempts,
          windowMs,
          remainingSec
        },
        ipAddress,
        userAgent,
        success: false
      }).catch(() => {});
    }

    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many attempts. Try again in ${remainingSec} seconds`
    });
  }

  // Opportunistic cleanup (10% chance) - serverless-friendly
  if (Math.random() < 0.1) {
    cleanupExpiredRateLimits().catch(() => {}); // Fire and forget
  }

  const { ConnectionFactory } = await import("./database");
  const { v4: uuid } = await import("uuid");
  const conn = ConnectionFactory();

  // Single atomic round-trip: create the bucket or increment it, resetting the
  // window if it has elapsed. Requires a UNIQUE constraint on `identifier`
  // (see ensureRateLimitSchema). `excluded.reset_at` is the proposed insert
  // value (now + windowMs), reused when the window is reset.
  const result = await conn.execute({
    sql: `INSERT INTO RateLimit (id, identifier, count, reset_at)
          VALUES (?, ?, 1, ?)
          ON CONFLICT(identifier) DO UPDATE SET
            count = CASE
              WHEN RateLimit.reset_at < ? THEN 1
              ELSE RateLimit.count + 1
            END,
            reset_at = CASE
              WHEN RateLimit.reset_at < ? THEN excluded.reset_at
              ELSE RateLimit.reset_at
            END,
            updated_at = datetime('now')
          RETURNING count, reset_at`,
    args: [uuid(), identifier, resetAtIso, nowIso, nowIso]
  });

  const row = result.rows[0];
  const newCount = (row.count as number) || 0;
  const resetAtTime = new Date(row.reset_at as string).getTime();

  // Cache the (possibly over-limit) state so the next check can fast-fail.
  rateLimitCache.set(identifier, {
    count: newCount,
    resetAt: resetAtTime,
    lastChecked: now
  });

  if (newCount > maxAttempts) {
    const remainingMs = Math.max(0, resetAtTime - now);
    const remainingSec = Math.max(1, Math.ceil(remainingMs / 1000));

    if (event) {
      const { ipAddress, userAgent } = getAuditContext(event);
      logAuditEvent({
        eventType: "security.rate_limit.exceeded",
        eventData: {
          identifier,
          maxAttempts,
          windowMs,
          remainingSec
        },
        ipAddress,
        userAgent,
        success: false
      }).catch(() => {});
    }

    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many attempts. Try again in ${remainingSec} seconds`
    });
  }

  return maxAttempts - newCount;
}

/**
 * Rate limit configuration for different operations
 */
export const RATE_LIMITS = CONFIG_RATE_LIMITS;

/**
 * Rate limiting middleware for login operations
 * In development/test, skips IP rate limiting to avoid self-DoS
 * For unknown IPs in production, uses stricter shared limits
 */
export async function rateLimitLogin(
  email: string,
  clientIP: string,
  event?: H3Event
): Promise<void> {
  // In development/test, skip IP rate limiting to avoid self-DoS
  if (env.NODE_ENV === "production") {
    const isUnknownIP = clientIP === "unknown";
    const ipIdentifier = isUnknownIP
      ? `login:unknown-ip`
      : `login:ip:${clientIP}`;
    const ipLimit = isUnknownIP
      ? { maxAttempts: 3, windowMs: RATE_LIMITS.LOGIN_IP.windowMs } // Stricter for unknown IPs
      : RATE_LIMITS.LOGIN_IP;

    await checkRateLimit(
      ipIdentifier,
      ipLimit.maxAttempts,
      ipLimit.windowMs,
      event
    );
  }

  // Always rate limit by email in all environments
  await checkRateLimit(
    `login:email:${email}`,
    RATE_LIMITS.LOGIN_EMAIL.maxAttempts,
    RATE_LIMITS.LOGIN_EMAIL.windowMs,
    event
  );
}

/**
 * Rate limiting middleware for password reset
 * In development/test, skips IP rate limiting to avoid self-DoS
 * For unknown IPs in production, uses stricter shared limits
 */
export async function rateLimitPasswordReset(
  clientIP: string,
  event?: H3Event
): Promise<void> {
  // In development/test, skip IP rate limiting to avoid self-DoS
  if (env.NODE_ENV === "production") {
    const isUnknownIP = clientIP === "unknown";
    const ipIdentifier = isUnknownIP
      ? `password-reset:unknown-ip`
      : `password-reset:ip:${clientIP}`;
    const ipLimit = isUnknownIP
      ? { maxAttempts: 2, windowMs: RATE_LIMITS.PASSWORD_RESET_IP.windowMs } // Stricter for unknown IPs
      : RATE_LIMITS.PASSWORD_RESET_IP;

    await checkRateLimit(
      ipIdentifier,
      ipLimit.maxAttempts,
      ipLimit.windowMs,
      event
    );
  }
}

/**
 * Rate limiting middleware for registration
 * In development/test, skips IP rate limiting to avoid self-DoS
 * For unknown IPs in production, uses stricter shared limits
 */
export async function rateLimitRegistration(
  clientIP: string,
  event?: H3Event
): Promise<void> {
  // In development/test, skip IP rate limiting to avoid self-DoS
  if (env.NODE_ENV === "production") {
    const isUnknownIP = clientIP === "unknown";
    const ipIdentifier = isUnknownIP
      ? `registration:unknown-ip`
      : `registration:ip:${clientIP}`;
    const ipLimit = isUnknownIP
      ? { maxAttempts: 2, windowMs: RATE_LIMITS.REGISTRATION_IP.windowMs } // Stricter for unknown IPs
      : RATE_LIMITS.REGISTRATION_IP;

    await checkRateLimit(
      ipIdentifier,
      ipLimit.maxAttempts,
      ipLimit.windowMs,
      event
    );
  }
}

/**
 * Rate limiting middleware for email verification
 * In development/test, skips IP rate limiting to avoid self-DoS
 * For unknown IPs in production, uses stricter shared limits
 */
export async function rateLimitEmailVerification(
  clientIP: string,
  event?: H3Event
): Promise<void> {
  // In development/test, skip IP rate limiting to avoid self-DoS
  if (env.NODE_ENV === "production") {
    const isUnknownIP = clientIP === "unknown";
    const ipIdentifier = isUnknownIP
      ? `email-verification:unknown-ip`
      : `email-verification:ip:${clientIP}`;
    const ipLimit = isUnknownIP
      ? { maxAttempts: 3, windowMs: RATE_LIMITS.EMAIL_VERIFICATION_IP.windowMs } // Stricter for unknown IPs
      : RATE_LIMITS.EMAIL_VERIFICATION_IP;

    await checkRateLimit(
      ipIdentifier,
      ipLimit.maxAttempts,
      ipLimit.windowMs,
      event
    );
  }
}

export const ACCOUNT_LOCKOUT = CONFIG_ACCOUNT_LOCKOUT;
export async function checkAccountLockout(userId: string): Promise<{
  isLocked: boolean;
  remainingMs?: number;
  lockedUntil?: string;
}> {
  const { ConnectionFactory } = await import("./database");
  const conn = ConnectionFactory();

  const result = await conn.execute({
    sql: "SELECT locked_until, failed_attempts FROM User WHERE id = ?",
    args: [userId]
  });

  if (result.rows.length === 0) {
    return { isLocked: false };
  }

  const user = result.rows[0];
  const lockedUntil = user.locked_until as string | null;

  if (!lockedUntil) {
    return { isLocked: false };
  }

  const lockExpiry = new Date(lockedUntil);
  const now = new Date();

  if (lockExpiry > now) {
    const remainingMs = lockExpiry.getTime() - now.getTime();
    return {
      isLocked: true,
      remainingMs,
      lockedUntil
    };
  }

  await conn.execute({
    sql: "UPDATE User SET locked_until = NULL, failed_attempts = 0 WHERE id = ?",
    args: [userId]
  });

  return { isLocked: false };
}

export async function recordFailedLogin(userId: string): Promise<{
  isLocked: boolean;
  remainingMs?: number;
  failedAttempts: number;
}> {
  const { ConnectionFactory } = await import("./database");
  const conn = ConnectionFactory();

  const result = await conn.execute({
    sql: `UPDATE User 
          SET failed_attempts = COALESCE(failed_attempts, 0) + 1 
          WHERE id = ? 
          RETURNING failed_attempts`,
    args: [userId]
  });

  const failedAttempts = (result.rows[0]?.failed_attempts as number) || 0;

  if (failedAttempts >= ACCOUNT_LOCKOUT.MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(
      Date.now() + ACCOUNT_LOCKOUT.LOCKOUT_DURATION_MS
    );

    await conn.execute({
      sql: "UPDATE User SET locked_until = ? WHERE id = ?",
      args: [lockedUntil.toISOString(), userId]
    });

    return {
      isLocked: true,
      remainingMs: ACCOUNT_LOCKOUT.LOCKOUT_DURATION_MS,
      failedAttempts
    };
  }

  return {
    isLocked: false,
    failedAttempts
  };
}

/**
 * Reset failed login attempts on successful login
 */
export async function resetFailedAttempts(userId: string): Promise<void> {
  const { ConnectionFactory } = await import("./database");
  const conn = ConnectionFactory();

  await conn.execute({
    sql: "UPDATE User SET failed_attempts = 0, locked_until = NULL WHERE id = ?",
    args: [userId]
  });
}

/**
 * Reset login rate limits on successful login
 */
export async function resetLoginRateLimits(
  email: string,
  clientIP: string
): Promise<void> {
  // Drop the local blocked-state cache for these keys so a same-instance
  // follow-up check reads fresh state from the shared store.
  invalidateRateLimitCache(`login:ip:${clientIP}`);
  invalidateRateLimitCache(`login:email:${email}`);

  const { ConnectionFactory } = await import("./database");
  const conn = ConnectionFactory();

  await conn.execute({
    sql: "DELETE FROM RateLimit WHERE identifier IN (?, ?)",
    args: [`login:ip:${clientIP}`, `login:email:${email}`]
  });
}

export const PASSWORD_RESET_CONFIG = CONFIG_PASSWORD_RESET;

/**
 * Create a password reset token
 */
export async function createPasswordResetToken(userId: string): Promise<{
  token: string;
  tokenId: string;
  expiresAt: string;
}> {
  const { ConnectionFactory } = await import("./database");
  const { v4: uuid } = await import("uuid");
  const conn = ConnectionFactory();

  const token = crypto.randomUUID();
  const tokenId = uuid();
  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_CONFIG.TOKEN_EXPIRY_MS
  );

  await conn.execute({
    sql: "UPDATE PasswordResetToken SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL",
    args: [userId]
  });

  await conn.execute({
    sql: `INSERT INTO PasswordResetToken (id, token, user_id, expires_at)
          VALUES (?, ?, ?, ?)`,
    args: [tokenId, token, userId, expiresAt.toISOString()]
  });

  return {
    token,
    tokenId,
    expiresAt: expiresAt.toISOString()
  };
}

/**
 * Validate and consume a password reset token
 */
export async function validatePasswordResetToken(
  token: string
): Promise<{ userId: string; tokenId: string } | null> {
  const { ConnectionFactory } = await import("./database");
  const conn = ConnectionFactory();

  const result = await conn.execute({
    sql: `SELECT id, user_id, expires_at, used_at 
          FROM PasswordResetToken 
          WHERE token = ?`,
    args: [token]
  });

  if (result.rows.length === 0) {
    return null;
  }

  const tokenRecord = result.rows[0];

  if (tokenRecord.used_at) {
    return null;
  }

  const expiresAt = new Date(tokenRecord.expires_at as string);
  if (expiresAt < new Date()) {
    return null;
  }

  return {
    userId: tokenRecord.user_id as string,
    tokenId: tokenRecord.id as string
  };
}

/**
 * Mark a password reset token as used
 */
export async function markPasswordResetTokenUsed(
  tokenId: string
): Promise<void> {
  const { ConnectionFactory } = await import("./database");
  const conn = ConnectionFactory();

  await conn.execute({
    sql: "UPDATE PasswordResetToken SET used_at = datetime('now') WHERE id = ?",
    args: [tokenId]
  });
}

/**
 * Clean up expired password reset tokens
 */
export async function cleanupExpiredPasswordResetTokens(): Promise<number> {
  const { ConnectionFactory } = await import("./database");
  const conn = ConnectionFactory();

  const result = await conn.execute({
    sql: `DELETE FROM PasswordResetToken 
          WHERE expires_at < datetime('now')
          OR used_at IS NOT NULL
          RETURNING id`,
    args: []
  });

  return result.rows.length;
}
