import { TRPCError } from "@trpc/server";
import { getCookie, setCookie } from "vinxi/http";
import type { H3Event } from "vinxi/http";
import { t } from "~/server/api/utils";
import { logAuditEvent } from "~/server/audit";
import { env } from "~/env/server";
import {
  AUTH_CONFIG,
  RATE_LIMITS as CONFIG_RATE_LIMITS,
  RATE_LIMIT_CLEANUP_INTERVAL_MS,
  ACCOUNT_LOCKOUT as CONFIG_ACCOUNT_LOCKOUT,
  PASSWORD_RESET_CONFIG as CONFIG_PASSWORD_RESET
} from "~/config";

/**
 * Extract cookie value from H3Event (works in both production and tests)
 */
function getCookieValue(event: H3Event, name: string): string | undefined {
  try {
    // Try vinxi's getCookie first
    const value = getCookie(event, name);
    if (value) return value;
  } catch (e) {
    // vinxi's getCookie failed, will use fallback
  }

  // Fallback for tests: parse cookie header manually
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
    // In tests, setCookie might fail - store in mock object
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
    // Try various header access patterns
    if (event.request?.headers?.get) {
      const val = event.request.headers.get(name);
      if (val !== null && val !== undefined) return val;
    }
    if (event.headers) {
      // Check if it's a Headers object with .get method
      if (typeof (event.headers as any).get === "function") {
        const val = (event.headers as any).get(name);
        if (val !== null && val !== undefined) return val;
      }
      // Or a plain object
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
    httpOnly: false, // Must be readable by client JS
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

  // Constant-time comparison to prevent timing attacks
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
    // Log CSRF failure
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

// ========== Rate Limiting ==========

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limit store
 * In production, consider using Redis for distributed rate limiting
 */
const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Clear rate limit store (for testing only)
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}

/**
 * Cleanup expired rate limit entries every 5 minutes
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, RATE_LIMIT_CLEANUP_INTERVAL_MS);

/**
 * Get client IP address from request headers
 */
export function getClientIP(event: H3Event): string {
  const forwarded = getHeaderValue(event, "x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIP = getHeaderValue(event, "x-real-ip");
  if (realIP) {
    return realIP;
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
 * Convenience function for logging
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
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (e.g., "login:ip:192.168.1.1")
 * @param maxAttempts - Maximum number of attempts allowed
 * @param windowMs - Time window in milliseconds
 * @param event - H3Event for audit logging (optional)
 * @returns Remaining attempts before limit is hit
 * @throws TRPCError if rate limit exceeded
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number,
  windowMs: number,
  event?: H3Event
): number {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    // Create new record
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs
    });
    return maxAttempts - 1;
  }

  if (record.count >= maxAttempts) {
    const remainingMs = record.resetAt - now;
    const remainingSec = Math.ceil(remainingMs / 1000);

    // Log rate limit exceeded (fire-and-forget)
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
      }).catch(() => {
        // Ignore logging errors
      });
    }

    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many attempts. Try again in ${remainingSec} seconds`
    });
  }

  // Increment count
  record.count++;
  return maxAttempts - record.count;
}

/**
 * Rate limit configuration for different operations
 * Re-exported from config for backward compatibility
 */
export const RATE_LIMITS = CONFIG_RATE_LIMITS;

/**
 * Rate limiting middleware for login operations
 */
export function rateLimitLogin(
  email: string,
  clientIP: string,
  event?: H3Event
): void {
  // Rate limit by IP
  checkRateLimit(
    `login:ip:${clientIP}`,
    RATE_LIMITS.LOGIN_IP.maxAttempts,
    RATE_LIMITS.LOGIN_IP.windowMs,
    event
  );

  // Rate limit by email
  checkRateLimit(
    `login:email:${email}`,
    RATE_LIMITS.LOGIN_EMAIL.maxAttempts,
    RATE_LIMITS.LOGIN_EMAIL.windowMs,
    event
  );
}

/**
 * Rate limiting middleware for password reset
 */
export function rateLimitPasswordReset(
  clientIP: string,
  event?: H3Event
): void {
  checkRateLimit(
    `password-reset:ip:${clientIP}`,
    RATE_LIMITS.PASSWORD_RESET_IP.maxAttempts,
    RATE_LIMITS.PASSWORD_RESET_IP.windowMs,
    event
  );
}

/**
 * Rate limiting middleware for registration
 */
export function rateLimitRegistration(clientIP: string, event?: H3Event): void {
  checkRateLimit(
    `registration:ip:${clientIP}`,
    RATE_LIMITS.REGISTRATION_IP.maxAttempts,
    RATE_LIMITS.REGISTRATION_IP.windowMs,
    event
  );
}

/**
 * Rate limiting middleware for email verification
 */
export function rateLimitEmailVerification(
  clientIP: string,
  event?: H3Event
): void {
  checkRateLimit(
    `email-verification:ip:${clientIP}`,
    RATE_LIMITS.EMAIL_VERIFICATION_IP.maxAttempts,
    RATE_LIMITS.EMAIL_VERIFICATION_IP.windowMs,
    event
  );
}

// ========== Account Lockout ==========

/**
 * Account lockout configuration
 * Re-exported from config for backward compatibility
 */
export const ACCOUNT_LOCKOUT = CONFIG_ACCOUNT_LOCKOUT;

/**
 * Check if an account is locked
 * @param userId - User ID to check
 * @returns Object with isLocked status and remaining time if locked
 */
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

  // Lockout expired, clear it
  await conn.execute({
    sql: "UPDATE User SET locked_until = NULL, failed_attempts = 0 WHERE id = ?",
    args: [userId]
  });

  return { isLocked: false };
}

/**
 * Record a failed login attempt and lock account if threshold exceeded
 * @param userId - User ID
 * @returns Object with isLocked status and remaining time if locked
 */
export async function recordFailedLogin(userId: string): Promise<{
  isLocked: boolean;
  remainingMs?: number;
  failedAttempts: number;
}> {
  const { ConnectionFactory } = await import("./database");
  const conn = ConnectionFactory();

  // Increment failed attempts
  const result = await conn.execute({
    sql: `UPDATE User 
          SET failed_attempts = COALESCE(failed_attempts, 0) + 1 
          WHERE id = ? 
          RETURNING failed_attempts`,
    args: [userId]
  });

  const failedAttempts = (result.rows[0]?.failed_attempts as number) || 0;

  // Check if we should lock the account
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
 * @param userId - User ID
 */
export async function resetFailedAttempts(userId: string): Promise<void> {
  const { ConnectionFactory } = await import("./database");
  const conn = ConnectionFactory();

  await conn.execute({
    sql: "UPDATE User SET failed_attempts = 0, locked_until = NULL WHERE id = ?",
    args: [userId]
  });
}

// ========== Password Reset Token Management ==========

/**
 * Password reset token configuration
 * Re-exported from config for backward compatibility
 */
export const PASSWORD_RESET_CONFIG = CONFIG_PASSWORD_RESET;

/**
 * Create a password reset token
 * @param userId - User ID
 * @returns The reset token and token ID
 */
export async function createPasswordResetToken(userId: string): Promise<{
  token: string;
  tokenId: string;
  expiresAt: string;
}> {
  const { ConnectionFactory } = await import("./database");
  const { v4: uuid } = await import("uuid");
  const conn = ConnectionFactory();

  // Generate cryptographically secure token
  const token = crypto.randomUUID();
  const tokenId = uuid();
  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_CONFIG.TOKEN_EXPIRY_MS
  );

  // Invalidate any existing unused tokens for this user
  await conn.execute({
    sql: "UPDATE PasswordResetToken SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL",
    args: [userId]
  });

  // Create new token
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
 * @param token - Reset token
 * @returns User ID if valid, null otherwise
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

  // Check if already used
  if (tokenRecord.used_at) {
    return null;
  }

  // Check if expired
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
 * @param tokenId - Token ID
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
 * Should be run periodically (e.g., via cron job)
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
