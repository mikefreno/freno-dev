import { createTRPCRouter, publicProcedure } from "../utils";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { v4 as uuidV4 } from "uuid";
import { env } from "~/env/server";
import {
  ConnectionFactory,
  hashPassword,
  checkPassword,
  checkPasswordSafe
} from "~/server/utils";
import { SignJWT, jwtVerify } from "jose";
import { setCookie, getCookie } from "vinxi/http";
import type { User } from "~/db/types";
import {
  fetchWithTimeout,
  checkResponse,
  fetchWithRetry,
  NetworkError,
  TimeoutError,
  APIError
} from "~/server/fetch-utils";
import {
  registerUserSchema,
  loginUserSchema,
  resetPasswordSchema,
  requestPasswordResetSchema
} from "../schemas/user";
import {
  setCSRFToken,
  csrfProtection,
  getClientIP,
  getUserAgent,
  getAuditContext,
  rateLimitLogin,
  rateLimitPasswordReset,
  rateLimitRegistration,
  rateLimitEmailVerification,
  checkAccountLockout,
  recordFailedLogin,
  resetFailedAttempts,
  createPasswordResetToken,
  validatePasswordResetToken,
  markPasswordResetTokenUsed
} from "~/server/security";
import { logAuditEvent } from "~/server/audit";
import type { H3Event } from "vinxi/http";
import type { Context } from "../utils";
import {
  AUTH_CONFIG,
  NETWORK_CONFIG,
  COOLDOWN_TIMERS,
  getAccessTokenExpiry,
  getAccessCookieMaxAge
} from "~/config";
import { randomBytes, createHash, timingSafeEqual } from "crypto";

/**
 * Safely extract H3Event from Context
 * In production: ctx.event is APIEvent, H3Event is at ctx.event.nativeEvent
 * In development: ctx.event might be H3Event directly
 */
function getH3Event(ctx: Context): H3Event {
  // Check if nativeEvent exists (production)
  if (ctx.event && "nativeEvent" in ctx.event && ctx.event.nativeEvent) {
    return ctx.event.nativeEvent as H3Event;
  }
  // Otherwise, assume ctx.event is H3Event (development)
  return ctx.event as unknown as H3Event;
}

// Cookie name constants
const REFRESH_TOKEN_COOKIE_NAME = "refreshToken" as const;
const ACCESS_TOKEN_COOKIE_NAME = "userIDToken" as const;

// Zod schemas
const refreshTokenSchema = z.object({
  rememberMe: z.boolean().optional().default(false)
});

/**
 * Generate a cryptographically secure refresh token
 * @returns Base64URL-encoded random token (32 bytes = 256 bits)
 */
function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hash refresh token for storage (one-way hash)
 * Using SHA-256 since refresh tokens are high-entropy random values
 * @param token - Plaintext refresh token
 * @returns Hex-encoded hash
 */
function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Validate refresh token against database
 * Uses timing-safe comparison to prevent timing attacks
 * @param token - Plaintext refresh token from client
 * @param sessionId - Session ID to validate against
 * @returns Session record if valid, null otherwise
 */
async function validateRefreshToken(
  token: string,
  sessionId: string
): Promise<{
  id: string;
  user_id: string;
  token_family: string;
  parent_session_id: string | null;
  rotation_count: number;
  expires_at: string;
  revoked: number;
} | null> {
  const conn = ConnectionFactory();
  const tokenHash = hashRefreshToken(token);

  try {
    const result = await conn.execute({
      sql: `SELECT id, user_id, token_family, parent_session_id, 
                   rotation_count, expires_at, revoked, refresh_token_hash
            FROM Session 
            WHERE id = ?`,
      args: [sessionId]
    });

    if (result.rows.length === 0) {
      return null;
    }

    const session = result.rows[0];
    const storedHash = session.refresh_token_hash as string;

    // Timing-safe comparison to prevent timing attacks
    if (
      !timingSafeEqual(
        Buffer.from(tokenHash, "hex"),
        Buffer.from(storedHash, "hex")
      )
    ) {
      return null;
    }

    // Check if revoked
    if (session.revoked === 1) {
      return null;
    }

    // Check if expired
    const expiresAt = new Date(session.expires_at as string);
    if (expiresAt < new Date()) {
      return null;
    }

    return {
      id: session.id as string,
      user_id: session.user_id as string,
      token_family: session.token_family as string,
      parent_session_id: session.parent_session_id as string | null,
      rotation_count: session.rotation_count as number,
      expires_at: session.expires_at as string,
      revoked: session.revoked as number
    };
  } catch (error) {
    console.error("Refresh token validation error:", error);
    return null;
  }
}

/**
 * Invalidate a specific session
 * Sets revoked flag without deleting (for audit trail)
 * @param sessionId - Session ID to invalidate
 */
async function invalidateSession(sessionId: string): Promise<void> {
  const conn = ConnectionFactory();
  await conn.execute({
    sql: "UPDATE Session SET revoked = 1 WHERE id = ?",
    args: [sessionId]
  });
}

/**
 * Revoke all sessions in a token family
 * Used when breach is detected (token reuse)
 * @param tokenFamily - Token family ID to revoke
 * @param reason - Reason for revocation (for audit)
 */
async function revokeTokenFamily(
  tokenFamily: string,
  reason: string = "breach_detected"
): Promise<void> {
  const conn = ConnectionFactory();

  // Get all sessions in family for audit log
  const sessions = await conn.execute({
    sql: "SELECT id, user_id FROM Session WHERE token_family = ? AND revoked = 0",
    args: [tokenFamily]
  });

  // Revoke all sessions in family
  await conn.execute({
    sql: "UPDATE Session SET revoked = 1 WHERE token_family = ?",
    args: [tokenFamily]
  });

  // Log audit events for each affected session
  for (const session of sessions.rows) {
    await logAuditEvent({
      userId: session.user_id as string,
      eventType: "auth.token_family_revoked",
      eventData: {
        tokenFamily,
        sessionId: session.id as string,
        reason
      },
      success: true
    });
  }

  console.warn(`Token family ${tokenFamily} revoked: ${reason}`);
}

/**
 * Detect if a token is being reused after rotation
 * Implements grace period for race conditions
 * @param sessionId - Session ID being validated
 * @returns true if reuse detected (and revocation occurred), false otherwise
 */
async function detectTokenReuse(sessionId: string): Promise<boolean> {
  const conn = ConnectionFactory();

  // Check if this session has already been rotated (has child session)
  const childCheck = await conn.execute({
    sql: `SELECT id, created_at FROM Session 
          WHERE parent_session_id = ? 
          ORDER BY created_at DESC 
          LIMIT 1`,
    args: [sessionId]
  });

  if (childCheck.rows.length === 0) {
    // No child session, this is legitimate first use
    return false;
  }

  const childSession = childCheck.rows[0];
  const childCreatedAt = new Date(childSession.created_at as string);
  const now = new Date();
  const timeSinceRotation = now.getTime() - childCreatedAt.getTime();

  // Grace period for race conditions (e.g., slow network, retries)
  if (timeSinceRotation < AUTH_CONFIG.REFRESH_TOKEN_REUSE_WINDOW_MS) {
    console.warn(
      `Token reuse within grace period (${timeSinceRotation}ms), allowing`
    );
    return false;
  }

  // Reuse detected outside grace period - this is a breach!
  console.error(
    `Token reuse detected! Session ${sessionId} rotated ${timeSinceRotation}ms ago`
  );

  // Get token family and revoke entire family
  const sessionInfo = await conn.execute({
    sql: "SELECT token_family, user_id FROM Session WHERE id = ?",
    args: [sessionId]
  });

  if (sessionInfo.rows.length > 0) {
    const tokenFamily = sessionInfo.rows[0].token_family as string;
    const userId = sessionInfo.rows[0].user_id as string;

    await revokeTokenFamily(tokenFamily, "token_reuse_detected");

    // Log critical security event
    await logAuditEvent({
      userId,
      eventType: "auth.token_reuse_detected",
      eventData: {
        sessionId,
        tokenFamily,
        timeSinceRotation
      },
      success: false
    });

    return true;
  }

  return false;
}

/**
 * Rotate refresh token: invalidate old, issue new tokens
 * Implements automatic breach detection
 * @param oldRefreshToken - Current refresh token from client
 * @param oldSessionId - Current session ID from JWT
 * @param rememberMe - Whether to extend session lifetime
 * @param ipAddress - Client IP address for new session
 * @param userAgent - Client user agent for new session
 * @returns New tokens or null if rotation fails
 */
async function rotateRefreshToken(
  oldRefreshToken: string,
  oldSessionId: string,
  rememberMe: boolean,
  ipAddress: string,
  userAgent: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  sessionId: string;
} | null> {
  // Step 1: Validate old refresh token
  const oldSession = await validateRefreshToken(oldRefreshToken, oldSessionId);

  if (!oldSession) {
    console.warn("Invalid refresh token during rotation");
    return null;
  }

  // Step 2: Detect token reuse (breach detection)
  const reuseDetected = await detectTokenReuse(oldSessionId);
  if (reuseDetected) {
    // Token family already revoked by detectTokenReuse
    return null;
  }

  // Step 3: Check rotation limit
  if (oldSession.rotation_count >= AUTH_CONFIG.MAX_ROTATION_COUNT) {
    console.warn(`Max rotation count reached for session ${oldSessionId}`);
    await invalidateSession(oldSessionId);
    return null;
  }

  // Step 4: Generate new tokens
  const newRefreshToken = generateRefreshToken();
  const refreshExpiry = rememberMe
    ? AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_LONG
    : AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_SHORT;

  // Step 5: Create new session (linked to old via parent_session_id)
  const { sessionId: newSessionId, tokenFamily } = await createSession(
    oldSession.user_id,
    refreshExpiry,
    ipAddress,
    userAgent,
    newRefreshToken,
    oldSessionId, // parent session for audit trail
    oldSession.token_family // reuse family
  );

  // Step 6: Create new access token
  const newAccessToken = await createJWT(
    oldSession.user_id,
    newSessionId,
    getAccessTokenExpiry()
  );

  // Step 7: Invalidate old session (after new one is created successfully)
  await invalidateSession(oldSessionId);

  // Step 8: Log rotation event
  await logAuditEvent({
    userId: oldSession.user_id,
    eventType: "auth.token_rotated",
    eventData: {
      oldSessionId,
      newSessionId,
      tokenFamily,
      rotationCount: oldSession.rotation_count + 1
    },
    success: true
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    sessionId: newSessionId
  };
}

/**
 * Extract session ID from access token (JWT)
 * @param accessToken - JWT access token
 * @returns Session ID or null if invalid
 */
async function getSessionIdFromToken(
  accessToken: string
): Promise<string | null> {
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
    const { payload } = await jwtVerify(accessToken, secret);
    return (payload.sid as string) || null;
  } catch (error) {
    return null;
  }
}

/**
 * Create JWT with session tracking
 * @param userId - User ID
 * @param sessionId - Session ID for revocation tracking
 * @param expiresIn - Token expiration time (e.g., "14d", "12h")
 */
async function createJWT(
  userId: string,
  sessionId: string,
  expiresIn: string = AUTH_CONFIG.JWT_EXPIRY
): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
  const token = await new SignJWT({
    id: userId,
    sid: sessionId, // Session ID for revocation
    iat: Math.floor(Date.now() / 1000)
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .sign(secret);
  return token;
}

/**
 * Create a new session in the database with refresh token support
 * @param userId - User ID
 * @param expiresIn - Refresh token expiration (e.g., "7d", "90d")
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent string
 * @param refreshToken - Plaintext refresh token to hash and store
 * @param parentSessionId - ID of parent session if this is a rotation (null for new sessions)
 * @param tokenFamily - Token family UUID for rotation chain (generated if null)
 * @returns Object with sessionId and tokenFamily
 */
async function createSession(
  userId: string,
  expiresIn: string,
  ipAddress: string,
  userAgent: string,
  refreshToken: string,
  parentSessionId: string | null = null,
  tokenFamily: string | null = null
): Promise<{ sessionId: string; tokenFamily: string }> {
  const conn = ConnectionFactory();
  const sessionId = uuidV4();
  const family = tokenFamily || uuidV4();
  const tokenHash = hashRefreshToken(refreshToken);

  // Calculate refresh token expiration
  const expiresAt = new Date();
  if (expiresIn.endsWith("d")) {
    const days = parseInt(expiresIn);
    expiresAt.setDate(expiresAt.getDate() + days);
  } else if (expiresIn.endsWith("h")) {
    const hours = parseInt(expiresIn);
    expiresAt.setHours(expiresAt.getHours() + hours);
  } else if (expiresIn.endsWith("m")) {
    const minutes = parseInt(expiresIn);
    expiresAt.setMinutes(expiresAt.getMinutes() + minutes);
  }

  // Calculate access token expiry (always shorter than refresh token)
  const accessExpiresAt = new Date();
  const accessExpiry = getAccessTokenExpiry();
  if (accessExpiry.endsWith("m")) {
    const minutes = parseInt(accessExpiry);
    accessExpiresAt.setMinutes(accessExpiresAt.getMinutes() + minutes);
  } else if (accessExpiry.endsWith("h")) {
    const hours = parseInt(accessExpiry);
    accessExpiresAt.setHours(accessExpiresAt.getHours() + hours);
  }

  // Get rotation count from parent if exists
  let rotationCount = 0;
  if (parentSessionId) {
    const parentResult = await conn.execute({
      sql: "SELECT rotation_count FROM Session WHERE id = ?",
      args: [parentSessionId]
    });
    if (parentResult.rows.length > 0) {
      rotationCount = (parentResult.rows[0].rotation_count as number) + 1;
    }
  }

  await conn.execute({
    sql: `INSERT INTO Session 
          (id, user_id, token_family, refresh_token_hash, parent_session_id,
           rotation_count, expires_at, access_token_expires_at, ip_address, user_agent)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      sessionId,
      userId,
      family,
      tokenHash,
      parentSessionId,
      rotationCount,
      expiresAt.toISOString(),
      accessExpiresAt.toISOString(),
      ipAddress,
      userAgent
    ]
  });

  return { sessionId, tokenFamily: family };
}

/**
 * TEMPORARY WRAPPER: Backward compatibility for old session creation
 * TODO: Remove this after migrating all callers to use refresh tokens (Tasks 05-06)
 * @deprecated Use createSession with refresh tokens instead
 */
async function createSessionLegacy(
  userId: string,
  expiresIn: string,
  ipAddress: string,
  userAgent: string
): Promise<string> {
  // Generate a temporary refresh token for legacy sessions
  const refreshToken = generateRefreshToken();
  const { sessionId } = await createSession(
    userId,
    expiresIn,
    ipAddress,
    userAgent,
    refreshToken
  );
  return sessionId;
}

/**
 * Helper to set authentication cookies including CSRF token
 */
/**
 * Helper to set authentication cookies including CSRF token
 * Sets both access token (short-lived) and refresh token (long-lived)
 * @param event - H3Event
 * @param accessToken - JWT access token
 * @param refreshToken - Refresh token
 * @param rememberMe - Whether to use extended refresh token expiry
 */
function setAuthCookies(
  event: any,
  accessToken: string,
  refreshToken: string,
  rememberMe: boolean = false
) {
  // Access token cookie (short-lived, always same duration)
  const accessMaxAge = getAccessCookieMaxAge();

  setCookie(event, ACCESS_TOKEN_COOKIE_NAME, accessToken, {
    maxAge: accessMaxAge,
    path: "/",
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict"
  });

  // Refresh token cookie (long-lived, varies based on rememberMe)
  const refreshMaxAge = rememberMe
    ? AUTH_CONFIG.REFRESH_COOKIE_MAX_AGE_LONG
    : AUTH_CONFIG.REFRESH_COOKIE_MAX_AGE_SHORT;

  setCookie(event, REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    maxAge: refreshMaxAge,
    path: "/",
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict"
  });

  // CSRF token for authenticated session
  setCSRFToken(event);
}

async function sendEmail(to: string, subject: string, htmlContent: string) {
  const apiKey = env.SENDINBLUE_KEY;
  const apiUrl = "https://api.sendinblue.com/v3/smtp/email";

  const sendinblueData = {
    sender: {
      name: "freno.me",
      email: "no_reply@freno.me"
    },
    to: [{ email: to }],
    htmlContent,
    subject
  };

  return fetchWithRetry(
    async () => {
      const response = await fetchWithTimeout(apiUrl, {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": apiKey,
          "content-type": "application/json"
        },
        body: JSON.stringify(sendinblueData),
        timeout: NETWORK_CONFIG.EMAIL_API_TIMEOUT_MS
      });

      await checkResponse(response);
      return response;
    },
    {
      maxRetries: NETWORK_CONFIG.MAX_RETRIES,
      retryDelay: NETWORK_CONFIG.RETRY_DELAY_MS
    }
  );
}

export const authRouter = createTRPCRouter({
  githubCallback: publicProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { code } = input;

      try {
        const tokenResponse = await fetchWithTimeout(
          "https://github.com/login/oauth/access_token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify({
              client_id: env.VITE_GITHUB_CLIENT_ID,
              client_secret: env.GITHUB_CLIENT_SECRET,
              code
            }),
            timeout: NETWORK_CONFIG.GITHUB_API_TIMEOUT_MS
          }
        );

        await checkResponse(tokenResponse);
        const { access_token } = await tokenResponse.json();

        if (!access_token) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Failed to get access token from GitHub"
          });
        }

        const userResponse = await fetchWithTimeout(
          "https://api.github.com/user",
          {
            headers: {
              Authorization: `token ${access_token}`
            },
            timeout: NETWORK_CONFIG.GITHUB_API_TIMEOUT_MS
          }
        );

        await checkResponse(userResponse);
        const user = await userResponse.json();
        const login = user.login;
        const icon = user.avatar_url;

        const emailsResponse = await fetchWithTimeout(
          "https://api.github.com/user/emails",
          {
            headers: {
              Authorization: `token ${access_token}`
            },
            timeout: NETWORK_CONFIG.GITHUB_API_TIMEOUT_MS
          }
        );

        await checkResponse(emailsResponse);
        const emails = await emailsResponse.json();

        const primaryEmail = emails.find(
          (e: { primary: boolean; verified: boolean; email: string }) =>
            e.primary && e.verified
        );
        const email = primaryEmail?.email || null;
        const emailVerified = primaryEmail?.verified || false;

        const conn = ConnectionFactory();

        const query = `SELECT * FROM User WHERE provider = ? AND display_name = ?`;
        const params = ["github", login];
        const res = await conn.execute({ sql: query, args: params });

        let userId: string;

        if (res.rows[0]) {
          userId = (res.rows[0] as unknown as User).id;

          try {
            await conn.execute({
              sql: `UPDATE User SET email = ?, email_verified = ?, image = ? WHERE id = ?`,
              args: [email, emailVerified ? 1 : 0, icon, userId]
            });
          } catch (updateError: any) {
            if (
              updateError.code === "SQLITE_CONSTRAINT" &&
              updateError.message?.includes("User.email")
            ) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "This email is already associated with another account. Please sign in with that account or use a different email address."
              });
            }
            throw updateError;
          }
        } else {
          userId = uuidV4();

          const insertQuery = `INSERT INTO User (id, email, email_verified, display_name, provider, image) VALUES (?, ?, ?, ?, ?, ?)`;
          const insertParams = [
            userId,
            email,
            emailVerified ? 1 : 0,
            login,
            "github",
            icon
          ];

          try {
            await conn.execute({ sql: insertQuery, args: insertParams });
          } catch (insertError: any) {
            if (
              insertError.code === "SQLITE_CONSTRAINT" &&
              insertError.message?.includes("User.email")
            ) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "This email is already associated with another account. Please sign in with that account or use a different email address."
              });
            }
            throw insertError;
          }
        }

        // Determine token expiry (OAuth defaults to long expiry for better UX)
        const accessExpiry = getAccessTokenExpiry();
        const refreshExpiry = AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_LONG;

        // Generate refresh token
        const refreshToken = generateRefreshToken();

        // Create session with client info
        const clientIP = getClientIP(getH3Event(ctx));
        const userAgent = getUserAgent(getH3Event(ctx));
        const { sessionId } = await createSession(
          userId,
          refreshExpiry,
          clientIP,
          userAgent,
          refreshToken
        );

        // Create access token
        const accessToken = await createJWT(userId, sessionId, accessExpiry);

        // Set cookies
        setAuthCookies(
          getH3Event(ctx),
          accessToken,
          refreshToken,
          true // OAuth defaults to remember
        );

        // Log successful OAuth login
        await logAuditEvent({
          userId,
          eventType: "auth.login.success",
          eventData: { method: "github", isNewUser: !res.rows[0] },
          ipAddress: clientIP,
          userAgent,
          success: true
        });

        return {
          success: true,
          redirectTo: "/account"
        };
      } catch (error) {
        // Log failed OAuth login
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          eventType: "auth.login.failed",
          eventData: {
            method: "github",
            reason: error instanceof TRPCError ? error.message : "unknown"
          },
          ipAddress,
          userAgent,
          success: false
        });

        if (error instanceof TRPCError) {
          throw error;
        }

        if (error instanceof TimeoutError) {
          console.error("GitHub API timeout:", error.message);
          throw new TRPCError({
            code: "TIMEOUT",
            message: "GitHub authentication timed out. Please try again."
          });
        } else if (error instanceof NetworkError) {
          console.error("GitHub API network error:", error.message);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to connect to GitHub. Please try again later."
          });
        } else if (error instanceof APIError) {
          console.error("GitHub API error:", error.status, error.statusText);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "GitHub authentication failed. Please try again."
          });
        }

        console.error("GitHub authentication failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "GitHub authentication failed"
        });
      }
    }),

  googleCallback: publicProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { code } = input;

      try {
        const tokenResponse = await fetchWithTimeout(
          "https://oauth2.googleapis.com/token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
              code: code,
              client_id: env.VITE_GOOGLE_CLIENT_ID || "",
              client_secret: env.GOOGLE_CLIENT_SECRET,
              redirect_uri: `${env.VITE_DOMAIN || "https://freno.me"}/api/auth/callback/google`,
              grant_type: "authorization_code"
            }),
            timeout: NETWORK_CONFIG.GOOGLE_API_TIMEOUT_MS
          }
        );

        await checkResponse(tokenResponse);
        const { access_token } = await tokenResponse.json();

        if (!access_token) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Failed to get access token from Google"
          });
        }

        const userResponse = await fetchWithTimeout(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${access_token}`
            },
            timeout: NETWORK_CONFIG.GOOGLE_API_TIMEOUT_MS
          }
        );

        await checkResponse(userResponse);
        const userData = await userResponse.json();
        const name = userData.name;
        const image = userData.picture;
        const email = userData.email;
        const email_verified = userData.email_verified;

        const conn = ConnectionFactory();

        const query = `SELECT * FROM User WHERE provider = ? AND email = ?`;
        const params = ["google", email];
        const res = await conn.execute({ sql: query, args: params });

        let userId: string;

        if (res.rows[0]) {
          userId = (res.rows[0] as unknown as User).id;

          await conn.execute({
            sql: `UPDATE User SET email = ?, email_verified = ?, display_name = ?, image = ? WHERE id = ?`,
            args: [email, email_verified ? 1 : 0, name, image, userId]
          });
        } else {
          userId = uuidV4();

          const insertQuery = `INSERT INTO User (id, email, email_verified, display_name, provider, image) VALUES (?, ?, ?, ?, ?, ?)`;
          const insertParams = [
            userId,
            email,
            email_verified ? 1 : 0,
            name,
            "google",
            image
          ];

          try {
            await conn.execute({
              sql: insertQuery,
              args: insertParams
            });
          } catch (insertError: any) {
            if (
              insertError.code === "SQLITE_CONSTRAINT" &&
              insertError.message?.includes("User.email")
            ) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "This email is already associated with another account. Please sign in with that account instead."
              });
            }
            throw insertError;
          }
        }

        // Determine token expiry (OAuth defaults to long expiry for better UX)
        const accessExpiry = getAccessTokenExpiry();
        const refreshExpiry = AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_LONG;

        // Generate refresh token
        const refreshToken = generateRefreshToken();

        // Create session with client info
        const clientIP = getClientIP(getH3Event(ctx));
        const userAgent = getUserAgent(getH3Event(ctx));
        const { sessionId } = await createSession(
          userId,
          refreshExpiry,
          clientIP,
          userAgent,
          refreshToken
        );

        // Create access token
        const accessToken = await createJWT(userId, sessionId, accessExpiry);

        // Set cookies
        setAuthCookies(
          getH3Event(ctx),
          accessToken,
          refreshToken,
          true // OAuth defaults to remember
        );

        // Log successful OAuth login
        await logAuditEvent({
          userId,
          eventType: "auth.login.success",
          eventData: { method: "google", isNewUser: !res.rows[0] },
          ipAddress: clientIP,
          userAgent,
          success: true
        });

        return {
          success: true,
          redirectTo: "/account"
        };
      } catch (error) {
        // Log failed OAuth login
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          eventType: "auth.login.failed",
          eventData: {
            method: "google",
            reason: error instanceof TRPCError ? error.message : "unknown"
          },
          ipAddress,
          userAgent,
          success: false
        });

        if (error instanceof TRPCError) {
          throw error;
        }

        if (error instanceof TimeoutError) {
          console.error("Google API timeout:", error.message);
          throw new TRPCError({
            code: "TIMEOUT",
            message: "Google authentication timed out. Please try again."
          });
        } else if (error instanceof NetworkError) {
          console.error("Google API network error:", error.message);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to connect to Google. Please try again later."
          });
        } else if (error instanceof APIError) {
          console.error("Google API error:", error.status, error.statusText);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Google authentication failed. Please try again."
          });
        }

        console.error("Google authentication failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Google authentication failed"
        });
      }
    }),

  emailLogin: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        token: z.string(),
        rememberMe: z.boolean().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { email, token, rememberMe } = input;

      try {
        const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
        const { payload } = await jwtVerify(token, secret);

        if (payload.email !== email) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email mismatch"
          });
        }

        const conn = ConnectionFactory();
        const query = `SELECT * FROM User WHERE email = ?`;
        const params = [email];
        const res = await conn.execute({ sql: query, args: params });

        if (!res.rows[0]) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found"
          });
        }

        const userId = (res.rows[0] as unknown as User).id;

        // Determine token expiry based on rememberMe
        const accessExpiry = getAccessTokenExpiry();
        const refreshExpiry = rememberMe
          ? AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_LONG
          : AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_SHORT;

        // Generate refresh token
        const refreshToken = generateRefreshToken();

        // Create session with client info
        const clientIP = getClientIP(getH3Event(ctx));
        const userAgent = getUserAgent(getH3Event(ctx));
        const { sessionId } = await createSession(
          userId,
          refreshExpiry,
          clientIP,
          userAgent,
          refreshToken
        );

        // Create access token
        const accessToken = await createJWT(userId, sessionId, accessExpiry);

        // Set cookies
        setAuthCookies(
          getH3Event(ctx),
          accessToken,
          refreshToken,
          rememberMe || false
        );

        // Log successful email link login
        await logAuditEvent({
          userId,
          eventType: "auth.login.success",
          eventData: { method: "email_link", rememberMe: rememberMe || false },
          ipAddress: clientIP,
          userAgent,
          success: true
        });

        return {
          success: true,
          redirectTo: "/account"
        };
      } catch (error) {
        // Log failed email link login
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          eventType: "auth.login.failed",
          eventData: {
            method: "email_link",
            email: input.email,
            reason: error instanceof TRPCError ? error.message : "unknown"
          },
          ipAddress,
          userAgent,
          success: false
        });

        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Email login failed:", error);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication failed"
        });
      }
    }),

  emailVerification: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        token: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { email, token } = input;

      try {
        const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
        const { payload } = await jwtVerify(token, secret);

        if (payload.email !== email) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email mismatch"
          });
        }

        const conn = ConnectionFactory();

        // Get user ID for audit log
        const userRes = await conn.execute({
          sql: "SELECT id FROM User WHERE email = ?",
          args: [email]
        });
        const userId = userRes.rows[0] ? (userRes.rows[0] as any).id : null;

        const query = `UPDATE User SET email_verified = ? WHERE email = ?`;
        const params = [true, email];
        await conn.execute({ sql: query, args: params });

        // Log successful email verification
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          userId,
          eventType: "auth.email.verify.complete",
          eventData: { email },
          ipAddress,
          userAgent,
          success: true
        });

        return {
          success: true,
          message: "Email verification success, you may close this window"
        };
      } catch (error) {
        // Log failed email verification
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          eventType: "auth.email.verify.complete",
          eventData: {
            email,
            reason: error instanceof TRPCError ? error.message : "unknown"
          },
          ipAddress,
          userAgent,
          success: false
        });

        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Email verification failed:", error);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid token"
        });
      }
    }),

  emailRegistration: publicProcedure
    .input(registerUserSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, password, passwordConfirmation } = input;

      // Apply rate limiting
      const clientIP = getClientIP(getH3Event(ctx));
      rateLimitRegistration(clientIP, getH3Event(ctx));

      // Schema already validates password match, but double check
      if (password !== passwordConfirmation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "passwordMismatch"
        });
      }

      const passwordHash = await hashPassword(password);
      const conn = ConnectionFactory();
      const userId = uuidV4();

      try {
        await conn.execute({
          sql: "INSERT INTO User (id, email, password_hash, provider) VALUES (?, ?, ?, ?)",
          args: [userId, email, passwordHash, "email"]
        });

        // Determine token expiry (registration defaults to short expiry)
        const accessExpiry = getAccessTokenExpiry();
        const refreshExpiry = AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_SHORT; // Default to 7 days

        // Generate refresh token
        const refreshToken = generateRefreshToken();

        // Create session with client info
        const clientIP = getClientIP(getH3Event(ctx));
        const userAgent = getUserAgent(getH3Event(ctx));
        const { sessionId } = await createSession(
          userId,
          refreshExpiry,
          clientIP,
          userAgent,
          refreshToken
        );

        // Create access token
        const accessToken = await createJWT(userId, sessionId, accessExpiry);

        // Set cookies
        setAuthCookies(
          getH3Event(ctx),
          accessToken,
          refreshToken,
          false // Registration defaults to non-remember
        );

        // Log successful registration
        await logAuditEvent({
          userId,
          eventType: "auth.register.success",
          eventData: { email, method: "email" },
          ipAddress: clientIP,
          userAgent,
          success: true
        });

        return { success: true, message: "success" };
      } catch (e) {
        // Log failed registration
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          eventType: "auth.register.failed",
          eventData: {
            email,
            method: "email",
            reason: e instanceof Error ? e.message : "unknown"
          },
          ipAddress,
          userAgent,
          success: false
        });

        console.error("Registration error:", e);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "duplicate"
        });
      }
    }),

  emailPasswordLogin: publicProcedure
    .input(loginUserSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { email, password, rememberMe } = input;

        // Apply rate limiting
        const clientIP = getClientIP(getH3Event(ctx));
        rateLimitLogin(email, clientIP, getH3Event(ctx));

        const conn = ConnectionFactory();
        const res = await conn.execute({
          sql: "SELECT * FROM User WHERE email = ?",
          args: [email]
        });

        // Always run password check to prevent timing attacks
        const user =
          res.rows.length > 0 ? (res.rows[0] as unknown as User) : null;
        const passwordHash = user?.password_hash || null;
        const passwordMatch = await checkPasswordSafe(password, passwordHash);

        // Check all conditions after password verification
        if (!user || !passwordHash || !passwordMatch) {
          // Record failed login attempt if user exists
          if (user?.id) {
            const lockoutStatus = await recordFailedLogin(user.id);

            if (lockoutStatus.isLocked) {
              const remainingSec = Math.ceil(
                (lockoutStatus.remainingMs || 0) / 1000
              );

              // Log account lockout
              try {
                const { ipAddress, userAgent } = getAuditContext(
                  getH3Event(ctx)
                );
                await logAuditEvent({
                  userId: user.id,
                  eventType: "auth.login.failed",
                  eventData: {
                    email,
                    method: "password",
                    reason: "account_locked",
                    failedAttempts: lockoutStatus.failedAttempts
                  },
                  ipAddress,
                  userAgent,
                  success: false
                });
              } catch (auditError) {
                console.error("Audit logging failed:", auditError);
              }

              throw new TRPCError({
                code: "FORBIDDEN",
                message: `Account locked due to too many failed login attempts. Try again in ${Math.ceil(remainingSec / 60)} minutes.`
              });
            }
          }

          // Log failed login attempt
          try {
            const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
            await logAuditEvent({
              userId: user?.id,
              eventType: "auth.login.failed",
              eventData: {
                email,
                method: "password",
                reason: "invalid_credentials",
                failedAttempts: user?.id
                  ? (res.rows[0]?.failed_attempts as number)
                  : undefined
              },
              ipAddress,
              userAgent,
              success: false
            });
          } catch (auditError) {
            console.error("Audit logging failed:", auditError);
          }

          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "no-match"
          });
        }

        // Check if account is locked before allowing login
        const lockoutCheck = await checkAccountLockout(user.id);
        if (lockoutCheck.isLocked) {
          const remainingSec = Math.ceil(
            (lockoutCheck.remainingMs || 0) / 1000
          );

          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Account is locked due to too many failed login attempts. Try again in ${Math.ceil(remainingSec / 60)} minutes.`
          });
        }

        if (
          !user.provider ||
          !["email", "google", "github", "apple"].includes(user.provider)
        ) {
          await conn.execute({
            sql: "UPDATE User SET provider = ? WHERE id = ?",
            args: ["email", user.id]
          });
        }

        // Reset failed attempts on successful login
        await resetFailedAttempts(user.id);

        // Determine token expiry based on rememberMe
        const accessExpiry = getAccessTokenExpiry(); // Always 15m
        const refreshExpiry = rememberMe
          ? AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_LONG
          : AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_SHORT;

        // Create refresh token
        const refreshToken = generateRefreshToken();

        // Create session with client info (reuse clientIP from rate limiting)
        const userAgent = getUserAgent(getH3Event(ctx));
        const { sessionId } = await createSession(
          user.id,
          refreshExpiry,
          clientIP,
          userAgent,
          refreshToken
        );

        // Create access token (short-lived)
        const accessToken = await createJWT(user.id, sessionId, accessExpiry);

        // Set both tokens in cookies with proper maxAge
        setAuthCookies(
          getH3Event(ctx),
          accessToken,
          refreshToken,
          rememberMe || false
        );

        // Log successful login (wrap in try-catch to ensure it never blocks auth flow)
        try {
          await logAuditEvent({
            userId: user.id,
            eventType: "auth.login.success",
            eventData: { method: "password", rememberMe: rememberMe || false },
            ipAddress: clientIP,
            userAgent,
            success: true
          });
        } catch (auditError) {
          console.error("Audit logging failed:", auditError);
        }

        return { success: true, message: "success" };
      } catch (error) {
        // Log the actual error for debugging
        console.error("emailPasswordLogin error:", error);
        console.error(
          "Error stack:",
          error instanceof Error ? error.stack : "no stack"
        );

        // Re-throw TRPCErrors as-is
        if (error instanceof TRPCError) {
          throw error;
        }

        // Wrap other errors
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred during login",
          cause: error
        });
      }
    }),

  requestEmailLinkLogin: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        rememberMe: z.boolean().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { email, rememberMe } = input;

      try {
        const requested = getCookie(getH3Event(ctx), "emailLoginLinkRequested");
        if (requested) {
          const expires = new Date(requested);
          const remaining = expires.getTime() - Date.now();
          if (remaining > 0) {
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: "countdown not expired"
            });
          }
        }

        const conn = ConnectionFactory();
        const res = await conn.execute({
          sql: "SELECT * FROM User WHERE email = ?",
          args: [email]
        });

        if (res.rows.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found"
          });
        }

        const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
        const token = await new SignJWT({
          email,
          rememberMe: rememberMe ?? false
        })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime(AUTH_CONFIG.EMAIL_LOGIN_LINK_EXPIRY)
          .sign(secret);

        const domain = env.VITE_DOMAIN || "https://freno.me";
        const htmlContent = `<html>
<head>
    <style>
        .center {
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            text-align: center;
            text-decoration: none;
            color: #ffffff;
            background-color: #007BFF;
            border-radius: 6px;
            transition: background-color 0.3s;
        }
        .button:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="center">
        <p>Click the button below to log in</p>
    </div>
    <br/>
    <div class="center">
        <a href="${domain}/api/auth/email-login-callback?email=${email}&token=${token}&rememberMe=${rememberMe}" class="button">Log In</a>
    </div>
    <div class="center">
        <p>You can ignore this if you did not request this email, someone may have requested it in error</p>
    </div>
</body>
</html>`;

        await sendEmail(email, "freno.me login link", htmlContent);

        const exp = new Date(Date.now() + COOLDOWN_TIMERS.EMAIL_LOGIN_LINK_MS);
        setCookie(
          getH3Event(ctx),
          "emailLoginLinkRequested",
          exp.toUTCString(),
          {
            maxAge: COOLDOWN_TIMERS.EMAIL_LOGIN_LINK_COOKIE_MAX_AGE,
            path: "/"
          }
        );

        return { success: true, message: "email sent" };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        if (
          error instanceof TimeoutError ||
          error instanceof NetworkError ||
          error instanceof APIError
        ) {
          console.error("Failed to send login email:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to send email. Please try again later."
          });
        }

        console.error("Email login link request failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred. Please try again."
        });
      }
    }),

  requestPasswordReset: publicProcedure
    .input(requestPasswordResetSchema)
    .mutation(async ({ input, ctx }) => {
      const { email } = input;

      // Apply rate limiting
      const clientIP = getClientIP(getH3Event(ctx));
      rateLimitPasswordReset(clientIP, getH3Event(ctx));

      try {
        const requested = getCookie(getH3Event(ctx), "passwordResetRequested");
        if (requested) {
          const expires = new Date(requested);
          const remaining = expires.getTime() - Date.now();
          if (remaining > 0) {
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: "countdown not expired"
            });
          }
        }

        const conn = ConnectionFactory();
        const res = await conn.execute({
          sql: "SELECT * FROM User WHERE email = ?",
          args: [email]
        });

        if (res.rows.length === 0) {
          return { success: true, message: "email sent" };
        }

        const user = res.rows[0] as unknown as User;

        // Create password reset token (1 hour expiry, single-use)
        const { token } = await createPasswordResetToken(user.id);

        const domain = env.VITE_DOMAIN || "https://freno.me";
        const htmlContent = `<html>
<head>
    <style>
        .center {
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            text-align: center;
            text-decoration: none;
            color: #ffffff;
            background-color: #007BFF;
            border-radius: 6px;
            transition: background-color 0.3s;
        }
        .button:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="center">
        <p>Click the button below to reset password</p>
    </div>
    <br/>
    <div class="center">
        <a href="${domain}/login/password-reset?token=${token}" class="button">Reset Password</a>
    </div>
    <div class="center">
        <p>This link will expire in 1 hour and can only be used once.</p>
    </div>
    <div class="center">
        <p>You can ignore this if you did not request this email, someone may have requested it in error</p>
    </div>
</body>
</html>`;

        await sendEmail(email, "password reset", htmlContent);

        const exp = new Date(
          Date.now() + COOLDOWN_TIMERS.PASSWORD_RESET_REQUEST_MS
        );
        setCookie(
          getH3Event(ctx),
          "passwordResetRequested",
          exp.toUTCString(),
          {
            maxAge: COOLDOWN_TIMERS.PASSWORD_RESET_REQUEST_COOKIE_MAX_AGE,
            path: "/"
          }
        );

        // Log password reset request
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          userId: user.id,
          eventType: "auth.password.reset.request",
          eventData: { email },
          ipAddress,
          userAgent,
          success: true
        });

        return { success: true, message: "email sent" };
      } catch (error) {
        // Log failed password reset request (only if not rate limited)
        if (
          !(error instanceof TRPCError && error.code === "TOO_MANY_REQUESTS")
        ) {
          const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
          await logAuditEvent({
            eventType: "auth.password.reset.request",
            eventData: {
              email: input.email,
              reason: error instanceof TRPCError ? error.message : "unknown"
            },
            ipAddress,
            userAgent,
            success: false
          });
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        if (
          error instanceof TimeoutError ||
          error instanceof NetworkError ||
          error instanceof APIError
        ) {
          console.error("Failed to send password reset email:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to send email. Please try again later."
          });
        }

        console.error("Password reset request failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred. Please try again."
        });
      }
    }),

  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ input, ctx }) => {
      const { token, newPassword, newPasswordConfirmation } = input;

      // Schema already validates password match, but double check
      if (newPassword !== newPasswordConfirmation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password Mismatch"
        });
      }

      try {
        // Validate and consume the password reset token
        const tokenValidation = await validatePasswordResetToken(token);

        if (!tokenValidation) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid or expired reset token"
          });
        }

        const { userId, tokenId } = tokenValidation;

        const conn = ConnectionFactory();
        const passwordHash = await hashPassword(newPassword);

        const userRes = await conn.execute({
          sql: "SELECT provider FROM User WHERE id = ?",
          args: [userId]
        });

        if (userRes.rows.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found"
          });
        }

        const currentProvider = (userRes.rows[0] as any).provider;

        if (
          !currentProvider ||
          !["google", "github", "apple"].includes(currentProvider)
        ) {
          await conn.execute({
            sql: "UPDATE User SET password_hash = ?, provider = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?",
            args: [passwordHash, "email", userId]
          });
        } else {
          await conn.execute({
            sql: "UPDATE User SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?",
            args: [passwordHash, userId]
          });
        }

        // Mark token as used
        await markPasswordResetTokenUsed(tokenId);

        // Clear authentication cookies
        setCookie(getH3Event(ctx), "emailToken", "", {
          maxAge: 0,
          path: "/"
        });
        setCookie(getH3Event(ctx), "userIDToken", "", {
          maxAge: 0,
          path: "/"
        });

        // Log successful password reset
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          userId: userId,
          eventType: "auth.password.reset.complete",
          eventData: {},
          ipAddress,
          userAgent,
          success: true
        });

        return { success: true, message: "success" };
      } catch (error) {
        // Log failed password reset
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          eventType: "auth.password.reset.complete",
          eventData: {
            reason: error instanceof TRPCError ? error.message : "unknown"
          },
          ipAddress,
          userAgent,
          success: false
        });

        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Password reset error:", error);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired reset token"
        });
      }
    }),

  resendEmailVerification: publicProcedure
    .input(requestPasswordResetSchema)
    .mutation(async ({ input, ctx }) => {
      const { email } = input;

      // Apply rate limiting
      const clientIP = getClientIP(getH3Event(ctx));
      rateLimitEmailVerification(clientIP, getH3Event(ctx));

      try {
        const requested = getCookie(
          getH3Event(ctx),
          "emailVerificationRequested"
        );
        if (requested) {
          const time = parseInt(requested);
          const currentTime = Date.now();
          const difference = (currentTime - time) / 1000;

          if (difference * 1000 < COOLDOWN_TIMERS.EMAIL_VERIFICATION_MS) {
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message:
                "Please wait before requesting another verification email"
            });
          }
        }

        const conn = ConnectionFactory();
        const res = await conn.execute({
          sql: "SELECT * FROM User WHERE email = ?",
          args: [email]
        });

        if (res.rows.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found"
          });
        }

        const user = res.rows[0] as unknown as User;

        const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
        const token = await new SignJWT({ email })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime(AUTH_CONFIG.EMAIL_VERIFICATION_LINK_EXPIRY)
          .sign(secret);

        const domain = env.VITE_DOMAIN || "https://freno.me";
        const htmlContent = `<html>
<head>
    <style>
        .center {
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            text-align: center;
            text-decoration: none;
            color: #ffffff;
            background-color: #007BFF;
            border-radius: 6px;
            transition: background-color 0.3s;
        }
        .button:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="center">
        <p>Click the button below to verify email</p>
    </div>
    <br/>
    <div class="center">
        <a href="${domain}/api/auth/email-verification-callback?email=${email}&token=${token}" class="button">Verify Email</a>
    </div>
</body>
</html>`;

        await sendEmail(email, "freno.me email verification", htmlContent);

        setCookie(
          getH3Event(ctx),
          "emailVerificationRequested",
          Date.now().toString(),
          {
            maxAge: COOLDOWN_TIMERS.EMAIL_VERIFICATION_COOKIE_MAX_AGE,
            path: "/"
          }
        );

        // Log email verification request
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          userId: user.id,
          eventType: "auth.email.verify.request",
          eventData: { email },
          ipAddress,
          userAgent,
          success: true
        });

        return { success: true, message: "Verification email sent" };
      } catch (error) {
        // Log failed email verification request (only if not rate limited)
        if (
          !(error instanceof TRPCError && error.code === "TOO_MANY_REQUESTS")
        ) {
          const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
          await logAuditEvent({
            eventType: "auth.email.verify.request",
            eventData: {
              email: input.email,
              reason: error instanceof TRPCError ? error.message : "unknown"
            },
            ipAddress,
            userAgent,
            success: false
          });
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        if (
          error instanceof TimeoutError ||
          error instanceof NetworkError ||
          error instanceof APIError
        ) {
          console.error("Failed to send verification email:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to send email. Please try again later."
          });
        }

        console.error("Email verification request failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred. Please try again."
        });
      }
    }),

  refreshToken: publicProcedure
    .input(refreshTokenSchema)
    .mutation(async ({ ctx, input }) => {
      const { rememberMe } = input;

      try {
        // Step 1: Get current access token from cookie
        const currentAccessToken = getCookie(
          getH3Event(ctx),
          ACCESS_TOKEN_COOKIE_NAME
        );
        if (!currentAccessToken) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "No access token found"
          });
        }

        // Step 2: Extract session ID from access token (even if expired)
        let sessionId: string | null = null;
        try {
          const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
          // Don't verify expiration, we expect it might be expired
          const { payload } = await jwtVerify(currentAccessToken, secret, {
            clockTolerance: 60 * 60 * 24 // 24h tolerance for expired tokens
          });
          sessionId = payload.sid as string;
        } catch (error) {
          // If we can't even decode, try manual parsing
          const parts = currentAccessToken.split(".");
          if (parts.length === 3) {
            try {
              const payloadBase64 = parts[1];
              const payload = JSON.parse(
                Buffer.from(payloadBase64, "base64url").toString()
              );
              sessionId = payload.sid;
            } catch (e) {
              throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "Invalid access token format"
              });
            }
          }
        }

        if (!sessionId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Could not extract session ID from token"
          });
        }

        // Step 3: Get refresh token from cookie
        const refreshToken = getCookie(
          getH3Event(ctx),
          REFRESH_TOKEN_COOKIE_NAME
        );
        if (!refreshToken) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "No refresh token found"
          });
        }

        // Step 4: Get client info for new session
        const clientIP = getClientIP(getH3Event(ctx));
        const userAgent = getUserAgent(getH3Event(ctx));

        // Step 5: Rotate tokens (includes all validation and breach detection)
        const rotated = await rotateRefreshToken(
          refreshToken,
          sessionId,
          rememberMe,
          clientIP,
          userAgent
        );

        if (!rotated) {
          // Rotation failed - could be invalid token, reuse detected, etc.
          // Clear cookies to force re-login
          setCookie(getH3Event(ctx), ACCESS_TOKEN_COOKIE_NAME, "", {
            maxAge: 0,
            path: "/"
          });
          setCookie(getH3Event(ctx), REFRESH_TOKEN_COOKIE_NAME, "", {
            maxAge: 0,
            path: "/"
          });

          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Token refresh failed - please login again"
          });
        }

        // Step 6: Set new access token cookie
        const accessCookieMaxAge = getAccessCookieMaxAge();

        setCookie(
          getH3Event(ctx),
          ACCESS_TOKEN_COOKIE_NAME,
          rotated.accessToken,
          {
            maxAge: accessCookieMaxAge,
            path: "/",
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "strict"
          }
        );

        // Step 7: Set new refresh token cookie
        const refreshCookieMaxAge = rememberMe
          ? AUTH_CONFIG.REFRESH_COOKIE_MAX_AGE_LONG
          : AUTH_CONFIG.REFRESH_COOKIE_MAX_AGE_SHORT;

        setCookie(
          getH3Event(ctx),
          REFRESH_TOKEN_COOKIE_NAME,
          rotated.refreshToken,
          {
            maxAge: refreshCookieMaxAge,
            path: "/",
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "strict"
          }
        );

        // Step 8: Refresh CSRF token
        setCSRFToken(getH3Event(ctx));

        // Step 9: Opportunistic cleanup (serverless-friendly)
        // Run asynchronously without blocking the response
        import("~/server/token-cleanup")
          .then((module) => module.opportunisticCleanup())
          .catch((err) => console.error("Opportunistic cleanup failed:", err));

        return {
          success: true,
          message: "Token refreshed successfully"
        };
      } catch (error) {
        // Log error but don't expose details to client
        console.error("Token refresh error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Token refresh failed"
        });
      }
    }),

  signOut: publicProcedure.mutation(async ({ ctx }) => {
    let userId: string | null = null;
    let tokenFamily: string | null = null;
    let sessionId: string | null = null;

    try {
      // Step 1: Get user ID and token family from access token
      const token = getCookie(getH3Event(ctx), "userIDToken");
      if (token) {
        try {
          const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
          const { payload } = await jwtVerify(token, secret, {
            clockTolerance: 60 * 60 * 24 // Allow expired tokens
          });
          userId = payload.id as string;
          sessionId = payload.sid as string;

          // Get token family from session
          if (sessionId) {
            const conn = ConnectionFactory();
            const sessionResult = await conn.execute({
              sql: "SELECT token_family FROM Session WHERE id = ?",
              args: [sessionId]
            });

            if (sessionResult.rows.length > 0) {
              tokenFamily = sessionResult.rows[0].token_family as string;
            }
          }
        } catch (e) {
          // Token verification failed, try to decode without verification
          try {
            const parts = token.split(".");
            if (parts.length === 3) {
              const payload = JSON.parse(
                Buffer.from(parts[1], "base64url").toString()
              );
              userId = payload.id;
              sessionId = payload.sid;

              // Still try to get token family
              if (sessionId) {
                const conn = ConnectionFactory();
                const sessionResult = await conn.execute({
                  sql: "SELECT token_family FROM Session WHERE id = ?",
                  args: [sessionId]
                });

                if (sessionResult.rows.length > 0) {
                  tokenFamily = sessionResult.rows[0].token_family as string;
                }
              }
            }
          } catch (decodeError) {
            console.error("Could not decode token for signout:", decodeError);
          }
        }
      }

      // Step 2: Revoke entire token family if found
      if (tokenFamily) {
        await revokeTokenFamily(tokenFamily, "user_logout");
        console.log(`Token family ${tokenFamily} revoked on signout`);
      } else if (sessionId) {
        // Fallback: revoke just this session if family not found
        await invalidateSession(sessionId);
        console.log(`Session ${sessionId} invalidated on signout`);
      }
    } catch (e) {
      console.error("Error during signout token revocation:", e);
      // Continue with cookie clearing even if revocation fails
    }

    // Step 3: Clear all auth cookies
    setCookie(getH3Event(ctx), "userIDToken", "", {
      maxAge: 0,
      path: "/"
    });
    setCookie(getH3Event(ctx), "refreshToken", "", {
      maxAge: 0,
      path: "/"
    });
    setCookie(getH3Event(ctx), "emailToken", "", {
      maxAge: 0,
      path: "/"
    });

    // Step 4: Log signout event
    if (userId) {
      const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
      await logAuditEvent({
        userId,
        eventType: "auth.signout",
        eventData: {
          sessionId: sessionId || "unknown",
          tokenFamily: tokenFamily || "unknown",
          method: "manual"
        },
        ipAddress,
        userAgent,
        success: true
      });
    }

    return { success: true };
  }),

  // Admin endpoints for session management
  cleanupSessions: publicProcedure.mutation(async ({ ctx }) => {
    // Get user ID to check admin status
    const userId = await getUserID(getH3Event(ctx));
    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required"
      });
    }

    // Import cleanup functions
    const { cleanupExpiredSessions, cleanupOrphanedReferences } =
      await import("~/server/token-cleanup");

    try {
      // Run cleanup
      const stats = await cleanupExpiredSessions();
      const orphansFixed = await cleanupOrphanedReferences();

      // Log admin action
      const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
      await logAuditEvent({
        userId,
        eventType: "admin.session_cleanup",
        eventData: {
          sessionsDeleted: stats.totalDeleted,
          orphansFixed
        },
        ipAddress,
        userAgent,
        success: true
      });

      return {
        success: true,
        sessionsDeleted: stats.totalDeleted,
        expiredDeleted: stats.expiredDeleted,
        revokedDeleted: stats.revokedDeleted,
        orphansFixed
      };
    } catch (error) {
      console.error("Manual cleanup failed:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Cleanup failed"
      });
    }
  }),

  getSessionStats: publicProcedure.query(async ({ ctx }) => {
    // Get user ID to check admin status
    const userId = await getUserID(getH3Event(ctx));
    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required"
      });
    }

    // Import stats function
    const { getSessionStats } = await import("~/server/token-cleanup");

    try {
      const stats = await getSessionStats();
      return stats;
    } catch (error) {
      console.error("Failed to get session stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve stats"
      });
    }
  })
});
