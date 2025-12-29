/**
 * Audit Logging Tests
 * Tests for audit logging system including log creation, querying, and analysis
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  logAuditEvent,
  queryAuditLogs,
  getFailedLoginAttempts,
  getUserSecuritySummary,
  detectSuspiciousActivity,
  cleanupOldLogs
} from "~/server/audit";
import { ConnectionFactory } from "~/server/database";

// Helper to clean up test audit logs
async function cleanupTestLogs() {
  const conn = ConnectionFactory();
  await conn.execute({
    sql: "DELETE FROM AuditLog WHERE event_data LIKE '%test-%'"
  });
}

describe("Audit Logging System", () => {
  beforeEach(async () => {
    await cleanupTestLogs();
  });

  describe("logAuditEvent", () => {
    it("should create audit log with all fields", async () => {
      await logAuditEvent({
        eventType: "auth.login.success",
        eventData: { method: "password", test: "test-1" },
        ipAddress: "192.168.1.100",
        userAgent: "Test Browser 1.0",
        success: true
      });

      const logs = await queryAuditLogs({
        ipAddress: "192.168.1.100",
        limit: 1
      });

      expect(logs.length).toBe(1);
      expect(logs[0].userId).toBeNull();
      expect(logs[0].eventType).toBe("auth.login.success");
      expect(logs[0].ipAddress).toBe("192.168.1.100");
      expect(logs[0].userAgent).toBe("Test Browser 1.0");
      expect(logs[0].success).toBe(true);

      expect(logs[0].eventData.method).toBe("password");
    });

    it("should create audit log without user ID", async () => {
      await logAuditEvent({
        eventType: "auth.login.failed",
        eventData: { email: "test@example.com", test: "test-2" },
        ipAddress: "192.168.1.2",
        userAgent: "Test Browser 1.0",
        success: false
      });

      const logs = await queryAuditLogs({
        eventType: "auth.login.failed",
        limit: 1
      });

      expect(logs.length).toBe(1);
      expect(logs[0].userId).toBeNull();
      expect(logs[0].success).toBe(false);
    });

    it("should handle missing optional fields gracefully", async () => {
      await logAuditEvent({
        eventType: "auth.logout",
        success: true
      });

      const logs = await queryAuditLogs({
        eventType: "auth.logout",
        limit: 1
      });

      expect(logs.length).toBe(1);
      expect(logs[0].ipAddress).toBeNull();
      expect(logs[0].userAgent).toBeNull();
      expect(logs[0].eventData).toBeNull();
    });

    it("should not throw errors on logging failures", async () => {
      // This should not throw even if there's an invalid event type
      await expect(
        logAuditEvent({
          eventType: "invalid.test.event",
          success: true
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("queryAuditLogs", () => {
    beforeEach(async () => {
      // Create test logs
      await logAuditEvent({
        eventType: "auth.login.success",
        eventData: { test: "test-query-1", testUser: "user-1" },
        ipAddress: "192.168.1.10",
        success: true
      });

      await logAuditEvent({
        eventType: "auth.login.failed",
        eventData: { test: "test-query-2", testUser: "user-1" },
        ipAddress: "192.168.1.10",
        success: false
      });

      await logAuditEvent({
        eventType: "auth.login.success",
        eventData: { test: "test-query-3", testUser: "user-2" },
        ipAddress: "192.168.1.20",
        success: true
      });

      await logAuditEvent({
        eventType: "auth.password_reset.requested",
        eventData: { test: "test-query-4", testUser: "user-2" },
        ipAddress: "192.168.1.20",
        success: true
      });
    });

    it("should query logs by IP address (simulating user)", async () => {
      const logs = await queryAuditLogs({ ipAddress: "192.168.1.10" });

      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs.every((log) => log.ipAddress === "192.168.1.10")).toBe(true);
    });

    it("should query logs by event type", async () => {
      const logs = await queryAuditLogs({
        eventType: "auth.login.success"
      });

      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs.every((log) => log.eventType === "auth.login.success")).toBe(
        true
      );
    });

    it("should query logs by success status", async () => {
      const successLogs = await queryAuditLogs({ success: true });
      const failedLogs = await queryAuditLogs({ success: false });

      expect(successLogs.length).toBeGreaterThanOrEqual(3);
      expect(failedLogs.length).toBeGreaterThanOrEqual(1);
      expect(successLogs.every((log) => log.success === true)).toBe(true);
      expect(failedLogs.every((log) => log.success === false)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const logs = await queryAuditLogs({ limit: 2 });

      expect(logs.length).toBeLessThanOrEqual(2);
    });

    it("should respect offset parameter", async () => {
      const firstPage = await queryAuditLogs({ limit: 2, offset: 0 });
      const secondPage = await queryAuditLogs({ limit: 2, offset: 2 });

      expect(firstPage.length).toBeGreaterThan(0);
      if (secondPage.length > 0) {
        expect(firstPage[0].id).not.toBe(secondPage[0].id);
      }
    });

    it("should filter by date range", async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const logs = await queryAuditLogs({
        startDate: oneHourAgo.toISOString(),
        endDate: oneDayFromNow.toISOString()
      });

      expect(logs.length).toBeGreaterThanOrEqual(4);
    });

    it("should return empty array when no logs match", async () => {
      const logs = await queryAuditLogs({
        userId: "nonexistent-user-xyz"
      });

      expect(logs).toEqual([]);
    });
  });

  describe("getFailedLoginAttempts", () => {
    beforeEach(async () => {
      // Create failed login attempts
      for (let i = 0; i < 5; i++) {
        await logAuditEvent({
          eventType: "auth.login.failed",
          eventData: {
            email: `test${i}@example.com`,
            test: `test-failed-${i}`
          },
          ipAddress: `192.168.1.${i}`,
          success: false
        });
      }

      // Create successful logins (should be excluded)
      await logAuditEvent({
        eventType: "auth.login.success",
        eventData: { test: "test-success-1" },
        success: true
      });
    });

    it("should return only failed login attempts", async () => {
      const attempts = await getFailedLoginAttempts(24, 10);

      expect(attempts.length).toBeGreaterThanOrEqual(5);
      expect(
        attempts.every((attempt) => attempt.event_type === "auth.login.failed")
      ).toBe(true);
      expect(attempts.every((attempt) => attempt.success === 0)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const attempts = await getFailedLoginAttempts(24, 3);

      expect(attempts.length).toBeLessThanOrEqual(3);
    });

    it("should filter by time window", async () => {
      const attemptsIn24h = await getFailedLoginAttempts(24, 100);
      const attemptsIn1h = await getFailedLoginAttempts(1, 100);

      expect(attemptsIn24h.length).toBeGreaterThanOrEqual(5);
      // Recent attempts should be within 1 hour
      expect(attemptsIn1h.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("getUserSecuritySummary", () => {
    beforeEach(async () => {
      // Create various events for summary (without user IDs due to FK constraint)
      await logAuditEvent({
        eventType: "auth.login.success",
        eventData: { test: "test-summary-1", testSummaryUser: "summary-123" },
        ipAddress: "192.168.99.1",
        success: true
      });

      await logAuditEvent({
        eventType: "auth.login.failed",
        eventData: { test: "test-summary-2", testSummaryUser: "summary-123" },
        ipAddress: "192.168.99.1",
        success: false
      });

      await logAuditEvent({
        eventType: "auth.login.failed",
        eventData: { test: "test-summary-3", testSummaryUser: "summary-123" },
        ipAddress: "192.168.99.1",
        success: false
      });

      await logAuditEvent({
        eventType: "auth.password_reset.requested",
        eventData: { test: "test-summary-4", testSummaryUser: "summary-123" },
        ipAddress: "192.168.99.1",
        success: true
      });
    });

    it("should return zero counts for non-existent user", async () => {
      // Since we can't use real user IDs in tests, this test verifies query works
      const summary = await getUserSecuritySummary("nonexistent-user", 30);

      expect(summary).toHaveProperty("totalEvents");
      expect(summary).toHaveProperty("successfulEvents");
      expect(summary).toHaveProperty("failedEvents");
      expect(summary).toHaveProperty("eventTypes");
      expect(summary).toHaveProperty("uniqueIPs");
    });

    it("should return summary structure", async () => {
      const summary = await getUserSecuritySummary("nonexistent-user", 30);

      expect(summary.totalEvents).toBe(0);
      expect(summary.successfulEvents).toBe(0);
      expect(summary.failedEvents).toBe(0);
      expect(summary.eventTypes.length).toBe(0);
      expect(summary.uniqueIPs.length).toBe(0);
    });
  });

  describe("detectSuspiciousActivity", () => {
    beforeEach(async () => {
      // Create suspicious pattern: many failed logins from same IP
      for (let i = 0; i < 10; i++) {
        await logAuditEvent({
          eventType: "auth.login.failed",
          eventData: {
            email: `victim${i}@example.com`,
            test: `test-suspicious-${i}`
          },
          ipAddress: "10.0.0.1",
          success: false
        });
      }

      // Create normal activity
      await logAuditEvent({
        eventType: "auth.login.success",
        eventData: { test: "test-normal-1" },
        ipAddress: "10.0.0.2",
        success: true
      });
    });

    it("should detect IPs with excessive failed attempts", async () => {
      const suspicious = await detectSuspiciousActivity(24, 5);

      expect(suspicious.length).toBeGreaterThanOrEqual(1);

      const suspiciousIP = suspicious.find((s) => s.ipAddress === "10.0.0.1");
      expect(suspiciousIP).toBeDefined();
      expect(suspiciousIP!.failedAttempts).toBeGreaterThanOrEqual(10);
    });

    it("should respect minimum attempts threshold", async () => {
      const lowThreshold = await detectSuspiciousActivity(24, 5);
      const highThreshold = await detectSuspiciousActivity(24, 20);

      expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length);
    });

    it("should return empty array when no suspicious activity", async () => {
      await cleanupTestLogs();

      // Create only successful logins
      await logAuditEvent({
        eventType: "auth.login.success",
        eventData: { test: "test-clean-1" },
        ipAddress: "10.0.0.100",
        success: true
      });

      const suspicious = await detectSuspiciousActivity(24, 5);
      const cleanIP = suspicious.find((s) => s.ipAddress === "10.0.0.100");

      expect(cleanIP).toBeUndefined();
    });
  });

  describe("cleanupOldLogs", () => {
    it("should delete logs older than specified days", async () => {
      // Create an old log by directly inserting with past date
      const conn = ConnectionFactory();
      const veryOldDate = new Date();
      veryOldDate.setDate(veryOldDate.getDate() - 100); // 100 days ago

      await conn.execute({
        sql: `INSERT INTO AuditLog (id, event_type, event_data, success, created_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [
          `old-log-${Date.now()}`,
          "auth.login.success",
          JSON.stringify({ test: "test-cleanup-1" }),
          1,
          veryOldDate.toISOString()
        ]
      });

      // Clean up logs older than 90 days
      const deleted = await cleanupOldLogs(90);

      expect(deleted).toBeGreaterThanOrEqual(1);
    });

    it("should not delete recent logs", async () => {
      await logAuditEvent({
        eventType: "auth.login.success",
        eventData: { test: "test-recent-1" },
        success: true
      });

      const logsBefore = await queryAuditLogs({ limit: 100 });
      const countBefore = logsBefore.length;

      // Try to clean up logs older than 1 day (should not delete recent log)
      await cleanupOldLogs(1);

      const logsAfter = await queryAuditLogs({ limit: 100 });

      // Should still have recent logs
      expect(logsAfter.length).toBeGreaterThan(0);
    });
  });
});
