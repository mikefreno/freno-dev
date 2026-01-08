import { ConnectionFactory } from "./database";
import type { Session } from "~/db/types";
import { formatDeviceDescription } from "./device-utils";

/**
 * Get all active sessions for a user
 * @param userId - User ID
 * @returns Array of active sessions with formatted device info
 */
export async function getUserActiveSessions(userId: string): Promise<
  Array<{
    sessionId: string;
    deviceDescription: string;
    deviceType?: string;
    browser?: string;
    os?: string;
    ipAddress?: string;
    lastActive: string;
    createdAt: string;
    current: boolean;
  }>
> {
  const conn = ConnectionFactory();

  const result = await conn.execute({
    sql: `SELECT 
            id, device_name, device_type, browser, os, 
            ip_address, last_active_at, created_at, token_family
          FROM Session 
          WHERE user_id = ? AND revoked = 0 AND expires_at > datetime('now')
          ORDER BY last_active_at DESC`,
    args: [userId]
  });

  return result.rows.map((row: any) => {
    const deviceInfo = {
      deviceName: row.device_name,
      deviceType: row.device_type,
      browser: row.browser,
      os: row.os
    };

    return {
      sessionId: row.id,
      deviceDescription: formatDeviceDescription(deviceInfo),
      deviceType: row.device_type,
      browser: row.browser,
      os: row.os,
      ipAddress: row.ip_address,
      lastActive: row.last_active_at,
      createdAt: row.created_at,
      current: false // Will be set by caller if needed
    };
  });
}

/**
 * Revoke a specific session (not entire token family)
 * Useful for "logout from this device" functionality
 * @param userId - User ID (for verification)
 * @param sessionId - Session ID to revoke
 * @throws Error if session not found or doesn't belong to user
 */
export async function revokeUserSession(
  userId: string,
  sessionId: string
): Promise<void> {
  const conn = ConnectionFactory();

  // Verify session belongs to user
  const verifyResult = await conn.execute({
    sql: "SELECT user_id FROM Session WHERE id = ?",
    args: [sessionId]
  });

  if (verifyResult.rows.length === 0) {
    throw new Error("Session not found");
  }

  const sessionUserId = (verifyResult.rows[0] as any).user_id;
  if (sessionUserId !== userId) {
    throw new Error("Session does not belong to this user");
  }

  // Revoke the session
  await conn.execute({
    sql: "UPDATE Session SET revoked = 1 WHERE id = ?",
    args: [sessionId]
  });
}

/**
 * Revoke all sessions for a user EXCEPT the current one
 * Useful for "logout from all other devices"
 * @param userId - User ID
 * @param currentSessionId - Current session ID to keep active
 * @returns Number of sessions revoked
 */
export async function revokeOtherUserSessions(
  userId: string,
  currentSessionId: string
): Promise<number> {
  const conn = ConnectionFactory();

  const result = await conn.execute({
    sql: "UPDATE Session SET revoked = 1 WHERE user_id = ? AND id != ? AND revoked = 0",
    args: [userId, currentSessionId]
  });

  return (result as any).rowsAffected || 0;
}

/**
 * Get session count by device type for a user
 * @param userId - User ID
 * @returns Object with counts by device type
 */
export async function getSessionCountByDevice(userId: string): Promise<{
  desktop: number;
  mobile: number;
  tablet: number;
  unknown: number;
  total: number;
}> {
  const conn = ConnectionFactory();

  const result = await conn.execute({
    sql: `SELECT 
            device_type,
            COUNT(*) as count
          FROM Session 
          WHERE user_id = ? AND revoked = 0 AND expires_at > datetime('now')
          GROUP BY device_type`,
    args: [userId]
  });

  const counts = {
    desktop: 0,
    mobile: 0,
    tablet: 0,
    unknown: 0,
    total: 0
  };

  for (const row of result.rows) {
    const deviceType = (row as any).device_type;
    const count = (row as any).count;

    if (deviceType === "desktop") {
      counts.desktop = count;
    } else if (deviceType === "mobile") {
      counts.mobile = count;
    } else if (deviceType === "tablet") {
      counts.tablet = count;
    } else {
      counts.unknown = count;
    }

    counts.total += count;
  }

  return counts;
}

/**
 * Check if a specific device fingerprint already has an active session
 * Can be used to show "You're already logged in on this device" messages
 * @param userId - User ID
 * @param deviceType - Device type
 * @param browser - Browser name
 * @param os - OS name
 * @returns true if device has active session
 */
export async function hasActiveSessionOnDevice(
  userId: string,
  deviceType?: string,
  browser?: string,
  os?: string
): Promise<boolean> {
  const conn = ConnectionFactory();

  const result = await conn.execute({
    sql: `SELECT id FROM Session 
          WHERE user_id = ? 
          AND device_type = ? 
          AND browser = ? 
          AND os = ?
          AND revoked = 0 
          AND expires_at > datetime('now')
          LIMIT 1`,
    args: [userId, deviceType || null, browser || null, os || null]
  });

  return result.rows.length > 0;
}
