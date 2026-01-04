/**
 * Audit Logging System
 * Tracks security-relevant events for incident response and forensics
 */

import { ConnectionFactory } from "./database";
import { v4 as uuid } from "uuid";

/**
 * Audit event types for security tracking
 */
export type AuditEventType =
  | "auth.login.success"
  | "auth.login.failed"
  | "auth.logout"
  | "auth.register.success"
  | "auth.register.failed"
  | "auth.password.change"
  | "auth.password.reset.request"
  | "auth.password.reset.complete"
  | "auth.email.verify.request"
  | "auth.email.verify.complete"
  | "auth.oauth.github.success"
  | "auth.oauth.github.failed"
  | "auth.oauth.google.success"
  | "auth.oauth.google.failed"
  | "auth.session.revoke"
  | "auth.session.revokeAll"
  | "security.rate_limit.exceeded"
  | "security.csrf.failed"
  | "security.suspicious.activity"
  | "admin.action";

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  userId?: string;
  eventType: AuditEventType;
  eventData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
}

/**
 * Log security/audit event to database
 * Fire-and-forget - failures are logged to console but don't block operations
 *
 * @param entry - Audit log entry to record
 * @returns Promise that resolves when log is written (or fails silently)
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const conn = ConnectionFactory();
    await conn.execute({
      sql: `INSERT INTO AuditLog (id, user_id, event_type, event_data, ip_address, user_agent, success)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        uuid(),
        entry.userId || null,
        entry.eventType,
        entry.eventData ? JSON.stringify(entry.eventData) : null,
        entry.ipAddress || null,
        entry.userAgent || null,
        entry.success ? 1 : 0
      ]
    });
  } catch (error) {
    console.error("Failed to write audit log:", error, entry);
  }
}

/**
 * Query parameters for audit log searches
 */
export interface AuditLogQuery {
  userId?: string;
  eventType?: AuditEventType;
  success?: boolean;
  ipAddress?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Query audit logs for security analysis
 *
 * @param query - Search parameters
 * @returns Array of audit log entries
 */
export async function queryAuditLogs(
  query: AuditLogQuery
): Promise<Array<Record<string, any>>> {
  const conn = ConnectionFactory();

  let sql = "SELECT * FROM AuditLog WHERE 1=1";
  const args: any[] = [];

  if (query.userId) {
    sql += " AND user_id = ?";
    args.push(query.userId);
  }

  if (query.eventType) {
    sql += " AND event_type = ?";
    args.push(query.eventType);
  }

  if (query.success !== undefined) {
    sql += " AND success = ?";
    args.push(query.success ? 1 : 0);
  }

  if (query.ipAddress) {
    sql += " AND ip_address = ?";
    args.push(query.ipAddress);
  }

  if (query.startDate) {
    sql += " AND created_at >= ?";
    args.push(
      typeof query.startDate === "string"
        ? query.startDate
        : query.startDate.toISOString()
    );
  }

  if (query.endDate) {
    sql += " AND created_at <= ?";
    args.push(
      typeof query.endDate === "string"
        ? query.endDate
        : query.endDate.toISOString()
    );
  }

  sql += " ORDER BY created_at DESC";

  if (query.limit) {
    sql += " LIMIT ?";
    args.push(query.limit);
  }

  if (query.offset) {
    sql += " OFFSET ?";
    args.push(query.offset);
  }

  const result = await conn.execute({ sql, args });
  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type,
    eventData: row.event_data ? JSON.parse(row.event_data as string) : null,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    success: row.success === 1,
    createdAt: row.created_at
  }));
}

/**
 * Get recent failed login attempts for a user or IP address
 * Can also be used to query all recent failed login attempts
 *
 * @param identifierOrHours - User ID, IP address, or number of hours to look back
 * @param identifierTypeOrLimit - Type of identifier ('user_id' or 'ip_address'), or limit for aggregate query
 * @param withinMinutes - Time window to check (default: 15 minutes) - only used for specific identifier queries
 * @returns Count of failed login attempts, or array of attempts for aggregate queries
 */
export async function getFailedLoginAttempts(
  identifierOrHours: string | number,
  identifierTypeOrLimit?: "user_id" | "ip_address" | number,
  withinMinutes: number = 15
): Promise<number | Array<Record<string, any>>> {
  const conn = ConnectionFactory();

  if (
    typeof identifierOrHours === "number" &&
    typeof identifierTypeOrLimit === "number"
  ) {
    const hours = identifierOrHours;
    const limit = identifierTypeOrLimit;

    const result = await conn.execute({
      sql: `SELECT * FROM AuditLog 
            WHERE event_type = 'auth.login.failed'
            AND success = 0
            AND created_at >= datetime('now', '-${hours} hours')
            ORDER BY created_at DESC
            LIMIT ?`,
      args: [limit]
    });

    return result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      event_type: row.event_type,
      event_data: row.event_data ? JSON.parse(row.event_data as string) : null,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      success: row.success,
      created_at: row.created_at
    }));
  }

  const identifier = identifierOrHours as string;
  const identifierType = identifierTypeOrLimit as "user_id" | "ip_address";
  const column = identifierType === "user_id" ? "user_id" : "ip_address";

  const result = await conn.execute({
    sql: `SELECT COUNT(*) as count FROM AuditLog 
          WHERE ${column} = ?
          AND event_type = 'auth.login.failed'
          AND success = 0
          AND created_at >= datetime('now', '-${withinMinutes} minutes')`,
    args: [identifier]
  });

  return (result.rows[0]?.count as number) || 0;
}

/**
 * Get security summary for a user
 *
 * @param userId - User ID to get summary for
 * @param days - Number of days to look back (default: 30)
 * @returns Security metrics for the user
 */
export async function getUserSecuritySummary(
  userId: string,
  days: number = 30
): Promise<{
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  eventTypes: string[];
  uniqueIPs: string[];
  totalLogins: number;
  failedLogins: number;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  uniqueIpCount: number;
  recentSessions: number;
}> {
  const conn = ConnectionFactory();

  const totalEventsResult = await conn.execute({
    sql: `SELECT COUNT(*) as count FROM AuditLog 
          WHERE user_id = ? 
          AND created_at >= datetime('now', '-${days} days')`,
    args: [userId]
  });
  const totalEvents = (totalEventsResult.rows[0]?.count as number) || 0;

  const successfulEventsResult = await conn.execute({
    sql: `SELECT COUNT(*) as count FROM AuditLog 
          WHERE user_id = ? 
          AND success = 1
          AND created_at >= datetime('now', '-${days} days')`,
    args: [userId]
  });
  const successfulEvents =
    (successfulEventsResult.rows[0]?.count as number) || 0;

  const failedEventsResult = await conn.execute({
    sql: `SELECT COUNT(*) as count FROM AuditLog 
          WHERE user_id = ? 
          AND success = 0
          AND created_at >= datetime('now', '-${days} days')`,
    args: [userId]
  });
  const failedEvents = (failedEventsResult.rows[0]?.count as number) || 0;

  const eventTypesResult = await conn.execute({
    sql: `SELECT DISTINCT event_type FROM AuditLog 
          WHERE user_id = ? 
          AND created_at >= datetime('now', '-${days} days')`,
    args: [userId]
  });
  const eventTypes = eventTypesResult.rows.map(
    (row) => row.event_type as string
  );

  const uniqueIPsResult = await conn.execute({
    sql: `SELECT DISTINCT ip_address FROM AuditLog 
          WHERE user_id = ? 
          AND ip_address IS NOT NULL
          AND created_at >= datetime('now', '-${days} days')`,
    args: [userId]
  });
  const uniqueIPs = uniqueIPsResult.rows.map((row) => row.ip_address as string);

  const loginResult = await conn.execute({
    sql: `SELECT COUNT(*) as count FROM AuditLog 
          WHERE user_id = ? 
          AND event_type = 'auth.login.success'
          AND success = 1`,
    args: [userId]
  });
  const totalLogins = (loginResult.rows[0]?.count as number) || 0;

  const failedResult = await conn.execute({
    sql: `SELECT COUNT(*) as count FROM AuditLog 
          WHERE user_id = ? 
          AND event_type = 'auth.login.failed'
          AND success = 0
          AND created_at >= datetime('now', '-${days} days')`,
    args: [userId]
  });
  const failedLogins = (failedResult.rows[0]?.count as number) || 0;

  const lastLoginResult = await conn.execute({
    sql: `SELECT created_at, ip_address FROM AuditLog 
          WHERE user_id = ? 
          AND event_type = 'auth.login.success'
          AND success = 1
          ORDER BY created_at DESC
          LIMIT 1`,
    args: [userId]
  });
  const lastLogin = lastLoginResult.rows[0];

  const ipResult = await conn.execute({
    sql: `SELECT COUNT(DISTINCT ip_address) as count FROM AuditLog 
          WHERE user_id = ? 
          AND event_type = 'auth.login.success'
          AND success = 1
          AND created_at >= datetime('now', '-${days} days')`,
    args: [userId]
  });
  const uniqueIpCount = (ipResult.rows[0]?.count as number) || 0;

  const sessionResult = await conn.execute({
    sql: `SELECT COUNT(*) as count FROM AuditLog 
          WHERE user_id = ? 
          AND event_type = 'auth.login.success'
          AND success = 1
          AND created_at >= datetime('now', '-1 day')`,
    args: [userId]
  });
  const recentSessions = (sessionResult.rows[0]?.count as number) || 0;

  return {
    totalEvents,
    successfulEvents,
    failedEvents,
    eventTypes,
    uniqueIPs,
    totalLogins,
    failedLogins,
    lastLoginAt: lastLogin?.created_at as string | null,
    lastLoginIp: lastLogin?.ip_address as string | null,
    uniqueIpCount,
    recentSessions
  };
}

/**
 * Detect suspicious activity patterns
 * Can detect for a specific user or aggregate suspicious IPs
 *
 * @param userIdOrHours - User ID or number of hours to look back for aggregate query
 * @param currentIpOrMinAttempts - Current IP address or minimum attempts threshold for aggregate query
 * @returns Suspicion result for user, or array of suspicious IPs for aggregate query
 */
export async function detectSuspiciousActivity(
  userIdOrHours: string | number,
  currentIpOrMinAttempts?: string | number
): Promise<
  | {
      isSuspicious: boolean;
      reasons: string[];
    }
  | Array<{
      ipAddress: string;
      failedAttempts: number;
      uniqueEmails: number;
    }>
> {
  const conn = ConnectionFactory();

  // Aggregate query: detectSuspiciousActivity(24, 5) - find IPs with 5+ failed attempts in 24 hours
  if (
    typeof userIdOrHours === "number" &&
    typeof currentIpOrMinAttempts === "number"
  ) {
    const hours = userIdOrHours;
    const minAttempts = currentIpOrMinAttempts;

    const result = await conn.execute({
      sql: `SELECT 
              ip_address,
              COUNT(*) as failed_attempts,
              COUNT(DISTINCT json_extract(event_data, '$.email')) as unique_emails
            FROM AuditLog 
            WHERE event_type = 'auth.login.failed'
            AND success = 0
            AND ip_address IS NOT NULL
            AND created_at >= datetime('now', '-${hours} hours')
            GROUP BY ip_address
            HAVING COUNT(*) >= ?
            ORDER BY failed_attempts DESC`,
      args: [minAttempts]
    });

    return result.rows.map((row) => ({
      ipAddress: row.ip_address as string,
      failedAttempts: row.failed_attempts as number,
      uniqueEmails: row.unique_emails as number
    }));
  }

  // User-specific query: detectSuspiciousActivity("user-123", "192.168.1.1")
  const userId = userIdOrHours as string;
  const currentIp = currentIpOrMinAttempts as string;
  const reasons: string[] = [];

  // Check for excessive failed logins
  const failedAttempts = (await getFailedLoginAttempts(
    userId,
    "user_id",
    15
  )) as number;
  if (failedAttempts >= 3) {
    reasons.push(`${failedAttempts} failed login attempts in last 15 minutes`);
  }

  // Check for rapid location changes (different IPs in short time)
  const recentIps = await conn.execute({
    sql: `SELECT DISTINCT ip_address FROM AuditLog 
          WHERE user_id = ? 
          AND event_type = 'auth.login.success'
          AND success = 1
          AND created_at >= datetime('now', '-1 hour')`,
    args: [userId]
  });

  if (recentIps.rows.length >= 3) {
    reasons.push(
      `Logins from ${recentIps.rows.length} different IPs in last hour`
    );
  }

  // Check for new IP if user has login history
  const ipHistory = await conn.execute({
    sql: `SELECT COUNT(*) as count FROM AuditLog 
          WHERE user_id = ? 
          AND ip_address = ?
          AND event_type = 'auth.login.success'
          AND success = 1`,
    args: [userId, currentIp]
  });

  const hasUsedIpBefore = (ipHistory.rows[0]?.count as number) > 0;
  if (!hasUsedIpBefore) {
    const totalLogins = await conn.execute({
      sql: `SELECT COUNT(*) as count FROM AuditLog 
            WHERE user_id = ? 
            AND event_type = 'auth.login.success'
            AND success = 1`,
      args: [userId]
    });

    if ((totalLogins.rows[0]?.count as number) > 0) {
      reasons.push("Login from new IP address");
    }
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons
  };
}

/**
 * Clean up old audit logs (for maintenance/GDPR compliance)
 *
 * @param olderThanDays - Delete logs older than this many days
 * @returns Number of logs deleted
 */
export async function cleanupOldLogs(olderThanDays: number): Promise<number> {
  const conn = ConnectionFactory();

  const result = await conn.execute({
    sql: `DELETE FROM AuditLog 
          WHERE created_at < datetime('now', '-${olderThanDays} days')
          RETURNING id`,
    args: []
  });

  return result.rows.length;
}
