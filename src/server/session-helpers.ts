import { v4 as uuidV4 } from "uuid";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { H3Event } from "vinxi/http";
import { useSession, clearSession, getSession, getCookie } from "vinxi/http";
import { ConnectionFactory } from "./database";
import { env } from "~/env/server";
import { AUTH_CONFIG, expiryToSeconds, CACHE_CONFIG } from "~/config";
import { logAuditEvent } from "./audit";
import type { SessionData } from "./session-config";
import { sessionConfig } from "./session-config";
import { getDeviceInfo } from "./device-utils";
import { cache } from "./cache";

/**
 * In-memory throttle for session activity updates
 * Tracks last update time per session to avoid excessive DB writes
 * In serverless, this is per-instance, but that's fine - updates are best-effort
 */
const sessionUpdateTimestamps = new Map<string, number>();

/**
 * Update session activity (last_used, last_active_at) with throttling
 * Only updates DB if > SESSION_ACTIVITY_UPDATE_THRESHOLD_MS since last update
 * Reduces 6,210 writes/period to ~60-100 writes (95%+ reduction)
 *
 * Security: Still secure - session validation happens every request (DB read)
 * UX: Session activity timestamps within 5min accuracy is acceptable
 *
 * @param sessionId - Session ID to update
 */
async function updateSessionActivityThrottled(
  sessionId: string
): Promise<void> {
  const now = Date.now();
  const lastUpdate = sessionUpdateTimestamps.get(sessionId) || 0;
  const timeSinceLastUpdate = now - lastUpdate;

  // Skip DB update if we updated recently
  if (timeSinceLastUpdate < CACHE_CONFIG.SESSION_ACTIVITY_UPDATE_THRESHOLD_MS) {
    return;
  }

  // Update timestamp tracker
  sessionUpdateTimestamps.set(sessionId, now);

  // Cleanup old entries (prevent memory leak in long-running instances)
  if (sessionUpdateTimestamps.size > 1000) {
    const oldestAllowed =
      now - 2 * CACHE_CONFIG.SESSION_ACTIVITY_UPDATE_THRESHOLD_MS;
    for (const [sid, timestamp] of sessionUpdateTimestamps.entries()) {
      if (timestamp < oldestAllowed) {
        sessionUpdateTimestamps.delete(sid);
      }
    }
  }

  // Perform DB update
  const conn = ConnectionFactory();
  await conn.execute({
    sql: "UPDATE Session SET last_used = datetime('now'), last_active_at = datetime('now') WHERE id = ?",
    args: [sessionId]
  });
}

/**
 * Generate a cryptographically secure refresh token
 * @returns Base64URL-encoded random token (32 bytes = 256 bits)
 */
export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hash refresh token for storage (one-way hash)
 * Using SHA-256 since refresh tokens are high-entropy random values
 * @param token - Plaintext refresh token
 * @returns Hex-encoded hash
 */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Create a new session in database and Vinxi session
 * @param event - H3Event
 * @param userId - User ID
 * @param isAdmin - Whether user is admin
 * @param rememberMe - Whether to use extended session duration
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent string
 * @param parentSessionId - ID of parent session if this is a rotation (null for new sessions)
 * @param tokenFamily - Token family UUID for rotation chain (generated if null)
 * @returns Session data
 */
export async function createAuthSession(
  event: H3Event,
  userId: string,
  isAdmin: boolean,
  rememberMe: boolean,
  ipAddress: string,
  userAgent: string,
  parentSessionId: string | null = null,
  tokenFamily: string | null = null
): Promise<SessionData> {
  const conn = ConnectionFactory();
  const sessionId = uuidV4();
  const family = tokenFamily || uuidV4();
  const refreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);

  // Parse device information
  const deviceInfo = getDeviceInfo(event);

  // Calculate refresh token expiration
  const refreshExpiry = rememberMe
    ? AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_LONG
    : AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_SHORT;

  const expiresAt = new Date();
  if (refreshExpiry.endsWith("d")) {
    const days = parseInt(refreshExpiry);
    expiresAt.setDate(expiresAt.getDate() + days);
  } else if (refreshExpiry.endsWith("h")) {
    const hours = parseInt(refreshExpiry);
    expiresAt.setHours(expiresAt.getHours() + hours);
  }

  // Calculate access token expiry
  const accessExpiresAt = new Date();
  const accessExpiry =
    env.NODE_ENV === "production"
      ? AUTH_CONFIG.ACCESS_TOKEN_EXPIRY
      : AUTH_CONFIG.ACCESS_TOKEN_EXPIRY_DEV;

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

  // Insert session into database with device metadata
  await conn.execute({
    sql: `INSERT INTO Session 
          (id, user_id, token_family, refresh_token_hash, parent_session_id,
           rotation_count, expires_at, access_token_expires_at, ip_address, user_agent,
           device_name, device_type, browser, os, last_active_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
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
      userAgent,
      deviceInfo.deviceName || null,
      deviceInfo.deviceType || null,
      deviceInfo.browser || null,
      deviceInfo.os || null
    ]
  });

  // Create session data
  const sessionData: SessionData = {
    userId,
    sessionId,
    tokenFamily: family,
    isAdmin,
    refreshToken,
    rememberMe
  };

  // Update Vinxi session with dynamic maxAge based on rememberMe
  const configWithMaxAge = {
    ...sessionConfig,
    maxAge: rememberMe
      ? expiryToSeconds(AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_LONG)
      : undefined // Session cookie (expires on browser close)
  };

  console.log("[Session Create] Creating session with data:", {
    userId: sessionData.userId,
    sessionId: sessionData.sessionId,
    tokenFamily: sessionData.tokenFamily,
    rememberMe: sessionData.rememberMe,
    maxAge: configWithMaxAge.maxAge
  });

  // Use useSession API to update session
  const session = await useSession<SessionData>(event, configWithMaxAge);
  await session.update(sessionData);

  console.log("[Session Create] Session created via useSession API:", {
    id: session.id,
    hasData: !!session.data,
    dataKeys: session.data ? Object.keys(session.data) : []
  });

  // Verify session was actually set by reading it back
  try {
    const cookieName = sessionConfig.name || "session";
    const cookieValue = getCookie(event, cookieName);
    console.log("[Session Create] Immediate verification:", {
      cookieName,
      hasCookie: !!cookieValue,
      cookieLength: cookieValue?.length || 0
    });

    // Try reading back the session immediately
    const verifySession = await getSession<SessionData>(event, sessionConfig);
    console.log("[Session Create] Read-back verification:", {
      hasData: !!verifySession.data,
      dataMatches: verifySession.data?.userId === sessionData.userId,
      userId: verifySession.data?.userId,
      sessionId: verifySession.data?.sessionId
    });
  } catch (verifyError) {
    console.error("[Session Create] Failed to verify session:", verifyError);
  }

  // Log audit event
  await logAuditEvent({
    userId,
    eventType: "auth.session_created",
    eventData: {
      sessionId,
      tokenFamily: family,
      rememberMe,
      parentSessionId,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType
    },
    success: true
  });

  return sessionData;
}

/**
 * Get current session from Vinxi and validate against database
 * @param event - H3Event
 * @param skipUpdate - If true, don't update the session cookie (for SSR contexts)
 * @returns Session data or null if invalid/expired
 */
export async function getAuthSession(
  event: H3Event,
  skipUpdate = false
): Promise<SessionData | null> {
  try {
    // In SSR contexts where headers may already be sent, use unsealSession directly
    if (skipUpdate) {
      const { unsealSession } = await import("vinxi/http");
      const cookieName = sessionConfig.name || "session";
      const cookieValue = getCookie(event, cookieName);
      console.log(
        "[Session Get] skipUpdate mode, cookieName:",
        cookieName,
        "has cookie:",
        !!cookieValue
      );
      if (!cookieValue) {
        return null;
      }

      try {
        // unsealSession returns Partial<Session<T>>, not T directly
        const session = await unsealSession(event, sessionConfig, cookieValue);
        console.log("[Session Get] Unsealed session:", {
          hasData: !!session?.data,
          dataType: typeof session?.data,
          dataKeys: session?.data ? Object.keys(session.data) : []
        });

        if (!session?.data || typeof session.data !== "object") {
          console.log("[Session Get] Invalid session structure");
          return null;
        }

        const data = session.data as SessionData;
        console.log("[Session Get] Session data:", {
          hasUserId: !!data.userId,
          hasSessionId: !!data.sessionId,
          hasRefreshToken: !!data.refreshToken
        });

        if (!data.userId || !data.sessionId) {
          console.log("[Session Get] Missing userId or sessionId");
          return null;
        }

        // Validate session against database
        const isValid = await validateSessionInDB(
          data.sessionId,
          data.userId,
          data.refreshToken
        );

        console.log("[Session Get] DB validation result:", isValid);
        return isValid ? data : null;
      } catch (err) {
        console.error("[Session Get] Error in skipUpdate path:", err);
        return null;
      }
    }

    // Normal path - allow session updates
    console.log("[Session Get] Normal path, getting session");
    const session = await getSession<SessionData>(event, sessionConfig);
    console.log("[Session Get] Got session:", {
      hasData: !!session.data,
      dataType: typeof session.data,
      dataKeys: session.data ? Object.keys(session.data) : []
    });

    if (!session.data || !session.data.userId || !session.data.sessionId) {
      console.log(
        "[Session Get] Missing data or userId/sessionId in normal path"
      );
      return null;
    }

    // Validate session against database
    const isValid = await validateSessionInDB(
      session.data.sessionId,
      session.data.userId,
      session.data.refreshToken
    );

    if (!isValid) {
      // Clear invalid session - wrap in try/catch for headers-sent error
      try {
        await clearSession(event, sessionConfig);
      } catch (clearError: any) {
        // If headers already sent, we can't clear the cookie, but that's OK
        // The session is invalid in DB anyway
        if (clearError?.code !== "ERR_HTTP_HEADERS_SENT") {
          throw clearError;
        }
      }
      return null;
    }

    return session.data;
  } catch (error: any) {
    // If headers already sent, we can't read the session cookie properly
    // This can happen in SSR when response streaming has started
    if (error?.code === "ERR_HTTP_HEADERS_SENT") {
      console.warn(
        "Cannot access session - headers already sent, retrying with skipUpdate"
      );
      // Retry with skipUpdate
      return getAuthSession(event, true);
    }
    console.error("Error getting auth session:", error);
    return null;
  }
}

/**
 * Validate session against database
 * Checks if session exists, not revoked, not expired, and refresh token matches
 * @param sessionId - Session ID
 * @param userId - User ID
 * @param refreshToken - Plaintext refresh token
 * @returns true if valid, false otherwise
 */
async function validateSessionInDB(
  sessionId: string,
  userId: string,
  refreshToken: string
): Promise<boolean> {
  try {
    const conn = ConnectionFactory();
    const tokenHash = hashRefreshToken(refreshToken);

    const result = await conn.execute({
      sql: `SELECT revoked, expires_at, refresh_token_hash 
            FROM Session 
            WHERE id = ? AND user_id = ?`,
      args: [sessionId, userId]
    });

    if (result.rows.length === 0) {
      return false;
    }

    const session = result.rows[0];

    // Check if revoked
    if (session.revoked === 1) {
      return false;
    }

    // Check if expired
    const expiresAt = new Date(session.expires_at as string);
    if (expiresAt < new Date()) {
      return false;
    }

    // Validate refresh token hash (timing-safe comparison)
    const storedHash = session.refresh_token_hash as string;
    if (
      !timingSafeEqual(
        Buffer.from(tokenHash, "hex"),
        Buffer.from(storedHash, "hex")
      )
    ) {
      return false;
    }

    // Update last_used and last_active_at timestamps (throttled)
    // Only update DB if last update was > 5 minutes ago (reduces writes by 95%+)
    updateSessionActivityThrottled(sessionId).catch((err) =>
      console.error("Failed to update session timestamps:", err)
    );

    return true;
  } catch (error) {
    console.error("Session validation error:", error);
    return false;
  }
}

/**
 * Invalidate a specific session in database and clear Vinxi session
 * @param event - H3Event
 * @param sessionId - Session ID to invalidate
 */
export async function invalidateAuthSession(
  event: H3Event,
  sessionId: string
): Promise<void> {
  const conn = ConnectionFactory();
  console.log(`[Session] Invalidating session ${sessionId}`);

  await conn.execute({
    sql: "UPDATE Session SET revoked = 1 WHERE id = ?",
    args: [sessionId]
  });

  await clearSession(event, sessionConfig);
}

/**
 * Revoke all sessions in a token family
 * Used when breach is detected (token reuse)
 * @param tokenFamily - Token family ID to revoke
 * @param reason - Reason for revocation (for audit)
 */
export async function revokeTokenFamily(
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
  console.log(
    `[Token Family] Revoking entire family ${tokenFamily} (reason: ${reason}). Sessions affected: ${sessions.rows.length}`
  );
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
export async function detectTokenReuse(sessionId: string): Promise<boolean> {
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

  // Grace period for race conditions
  if (timeSinceRotation < AUTH_CONFIG.REFRESH_TOKEN_REUSE_WINDOW_MS) {
    console.warn(
      `[Token Reuse] Within grace period (${timeSinceRotation}ms < ${AUTH_CONFIG.REFRESH_TOKEN_REUSE_WINDOW_MS}ms), allowing for session ${sessionId}`
    );
    return false;
  }

  // Reuse detected outside grace period - this is a breach!
  console.error(
    `[Token Reuse] BREACH DETECTED! Session ${sessionId} rotated ${timeSinceRotation}ms ago. Child session: ${childSession.id}`
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
 * @param event - H3Event
 * @param oldSessionData - Current session data
 * @param ipAddress - Client IP address for new session
 * @param userAgent - Client user agent for new session
 * @returns New session data or null if rotation fails
 */
export async function rotateAuthSession(
  event: H3Event,
  oldSessionData: SessionData,
  ipAddress: string,
  userAgent: string
): Promise<SessionData | null> {
  console.log(
    `[Token Rotation] Starting rotation for session ${oldSessionData.sessionId}`
  );

  // Validate old session exists in DB
  const isValid = await validateSessionInDB(
    oldSessionData.sessionId,
    oldSessionData.userId,
    oldSessionData.refreshToken
  );

  if (!isValid) {
    console.warn(
      `[Token Rotation] Invalid session during rotation for ${oldSessionData.sessionId}`
    );
    return null;
  }

  // Detect token reuse (breach detection)
  const reuseDetected = await detectTokenReuse(oldSessionData.sessionId);
  if (reuseDetected) {
    console.error(
      `[Token Rotation] Token reuse detected for session ${oldSessionData.sessionId}`
    );
    return null;
  }

  // Check rotation limit
  const conn = ConnectionFactory();
  const sessionCheck = await conn.execute({
    sql: "SELECT rotation_count FROM Session WHERE id = ?",
    args: [oldSessionData.sessionId]
  });

  if (sessionCheck.rows.length === 0) {
    return null;
  }

  const rotationCount = sessionCheck.rows[0].rotation_count as number;
  if (rotationCount >= AUTH_CONFIG.MAX_ROTATION_COUNT) {
    console.warn(
      `[Token Rotation] Max rotation count reached for session ${oldSessionData.sessionId}`
    );
    await invalidateAuthSession(event, oldSessionData.sessionId);
    return null;
  }

  // Create new session (linked to old via parent_session_id)
  const newSessionData = await createAuthSession(
    event,
    oldSessionData.userId,
    oldSessionData.isAdmin,
    oldSessionData.rememberMe,
    ipAddress,
    userAgent,
    oldSessionData.sessionId, // parent session
    oldSessionData.tokenFamily // reuse family
  );

  // Invalidate old session
  await conn.execute({
    sql: "UPDATE Session SET revoked = 1 WHERE id = ?",
    args: [oldSessionData.sessionId]
  });

  // Log rotation event
  await logAuditEvent({
    userId: oldSessionData.userId,
    eventType: "auth.token_rotated",
    eventData: {
      oldSessionId: oldSessionData.sessionId,
      newSessionId: newSessionData.sessionId,
      tokenFamily: oldSessionData.tokenFamily,
      rotationCount: rotationCount + 1
    },
    success: true
  });

  console.log(
    `[Token Rotation] Successfully rotated session ${oldSessionData.sessionId} -> ${newSessionData.sessionId}`
  );

  return newSessionData;
}
