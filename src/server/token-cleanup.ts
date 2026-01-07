import { ConnectionFactory } from "~/server/utils";
import { logAuditEvent } from "~/server/audit";
import { AUTH_CONFIG } from "~/config";

/**
 * Cleanup expired and revoked sessions
 * Keeps sessions for audit purposes up to retention limit
 * @param retentionDays - How long to keep revoked sessions (default 90)
 * @returns Cleanup statistics
 */
export async function cleanupExpiredSessions(
  retentionDays: number = AUTH_CONFIG.SESSION_CLEANUP_RETENTION_DAYS
): Promise<{
  expiredDeleted: number;
  revokedDeleted: number;
  totalDeleted: number;
}> {
  const conn = ConnectionFactory();
  const retentionDate = new Date();
  retentionDate.setDate(retentionDate.getDate() - retentionDays);

  try {
    // Step 1: Delete expired sessions (hard delete)
    const expiredResult = await conn.execute({
      sql: `DELETE FROM Session 
            WHERE expires_at < datetime('now')
            AND created_at < ?`,
      args: [retentionDate.toISOString()]
    });

    // Step 2: Delete old revoked sessions (keep recent for audit)
    const revokedResult = await conn.execute({
      sql: `DELETE FROM Session 
            WHERE revoked = 1 
            AND created_at < ?`,
      args: [retentionDate.toISOString()]
    });

    const stats = {
      expiredDeleted: Number(expiredResult.rowsAffected) || 0,
      revokedDeleted: Number(revokedResult.rowsAffected) || 0,
      totalDeleted:
        (Number(expiredResult.rowsAffected) || 0) +
        (Number(revokedResult.rowsAffected) || 0)
    };

    console.log(
      `Session cleanup completed: ${stats.totalDeleted} sessions deleted ` +
        `(${stats.expiredDeleted} expired, ${stats.revokedDeleted} revoked)`
    );

    // Log cleanup event
    await logAuditEvent({
      eventType: "system.session_cleanup",
      eventData: stats,
      success: true
    });

    return stats;
  } catch (error) {
    console.error("Session cleanup failed:", error);

    await logAuditEvent({
      eventType: "system.session_cleanup",
      eventData: { error: String(error) },
      success: false
    });

    throw error;
  }
}

/**
 * Cleanup orphaned parent session references
 * Remove parent_session_id references to deleted sessions
 */
export async function cleanupOrphanedReferences(): Promise<number> {
  const conn = ConnectionFactory();

  const result = await conn.execute({
    sql: `UPDATE Session 
          SET parent_session_id = NULL 
          WHERE parent_session_id IS NOT NULL 
          AND parent_session_id NOT IN (
            SELECT id FROM Session
          )`
  });

  const orphansFixed = Number(result.rowsAffected) || 0;
  if (orphansFixed > 0) {
    console.log(`Fixed ${orphansFixed} orphaned parent_session_id references`);
  }

  return orphansFixed;
}

/**
 * Get session statistics for monitoring
 */
export async function getSessionStats(): Promise<{
  total: number;
  active: number;
  expired: number;
  revoked: number;
  avgRotationCount: number;
}> {
  const conn = ConnectionFactory();

  const totalResult = await conn.execute({
    sql: "SELECT COUNT(*) as count FROM Session"
  });

  const activeResult = await conn.execute({
    sql: `SELECT COUNT(*) as count FROM Session 
          WHERE revoked = 0 AND expires_at > datetime('now')`
  });

  const expiredResult = await conn.execute({
    sql: `SELECT COUNT(*) as count FROM Session 
          WHERE expires_at < datetime('now')`
  });

  const revokedResult = await conn.execute({
    sql: "SELECT COUNT(*) as count FROM Session WHERE revoked = 1"
  });

  const rotationResult = await conn.execute({
    sql: "SELECT AVG(rotation_count) as avg FROM Session WHERE revoked = 0"
  });

  return {
    total: Number(totalResult.rows[0]?.count) || 0,
    active: Number(activeResult.rows[0]?.count) || 0,
    expired: Number(expiredResult.rows[0]?.count) || 0,
    revoked: Number(revokedResult.rows[0]?.count) || 0,
    avgRotationCount: Number(rotationResult.rows[0]?.avg) || 0
  };
}

/**
 * Opportunistic cleanup trigger
 * Runs cleanup if it hasn't been run recently (serverless-friendly)
 * Uses a simple timestamp check to avoid running too frequently
 */
let lastCleanupTime = 0;

export async function opportunisticCleanup(): Promise<void> {
  const now = Date.now();
  const minIntervalMs =
    AUTH_CONFIG.SESSION_CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000;

  // Only run if enough time has passed since last cleanup
  if (now - lastCleanupTime < minIntervalMs) {
    return;
  }

  // Update timestamp immediately to prevent concurrent runs
  lastCleanupTime = now;

  try {
    console.log("Running opportunistic session cleanup...");

    // Run cleanup asynchronously (don't block the request)
    Promise.all([cleanupExpiredSessions(), cleanupOrphanedReferences()])
      .then(([stats, orphansFixed]) => {
        console.log(
          `Opportunistic cleanup completed: ${stats.totalDeleted} sessions deleted, ` +
            `${orphansFixed} orphaned references fixed`
        );
      })
      .catch((error) => {
        console.error("Opportunistic cleanup error:", error);
        // Reset timer on failure so we can retry sooner
        lastCleanupTime = now - minIntervalMs + 5 * 60 * 1000; // Retry in 5 minutes
      });
  } catch (error) {
    console.error("Opportunistic cleanup trigger error:", error);
    // Reset timer on failure
    lastCleanupTime = now - minIntervalMs + 5 * 60 * 1000;
  }
}
