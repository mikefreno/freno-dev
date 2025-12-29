import { createTRPCRouter, adminProcedure } from "../utils";
import { z } from "zod";
import {
  queryAuditLogs,
  getUserSecuritySummary,
  cleanupOldLogs,
  getFailedLoginAttempts,
  detectSuspiciousActivity
} from "~/server/audit";

/**
 * Audit log router - admin-only endpoints for querying security logs
 */
export const auditRouter = createTRPCRouter({
  /**
   * Query audit logs with filters
   */
  getLogs: adminProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        eventType: z.string().optional(),
        success: z.boolean().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().min(1).max(1000).default(100),
        offset: z.number().min(0).default(0)
      })
    )
    .query(async ({ input }) => {
      const logs = await queryAuditLogs({
        userId: input.userId,
        eventType: input.eventType as any,
        success: input.success,
        startDate: input.startDate,
        endDate: input.endDate,
        limit: input.limit,
        offset: input.offset
      });

      return {
        logs,
        count: logs.length,
        offset: input.offset,
        limit: input.limit
      };
    }),

  /**
   * Get failed login attempts (last 24 hours by default)
   */
  getFailedLogins: adminProcedure
    .input(
      z.object({
        hours: z.number().min(1).max(168).default(24),
        limit: z.number().min(1).max(1000).default(100)
      })
    )
    .query(async ({ input }) => {
      const attempts = (await getFailedLoginAttempts(
        input.hours,
        input.limit
      )) as Array<any>;

      return {
        attempts,
        count: attempts.length,
        timeWindow: `${input.hours} hours`
      };
    }),

  /**
   * Get security summary for a specific user
   */
  getUserSummary: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        days: z.number().min(1).max(90).default(30)
      })
    )
    .query(async ({ input }) => {
      const summary = await getUserSecuritySummary(input.userId, input.days);

      return {
        userId: input.userId,
        summary,
        timeWindow: `${input.days} days`
      };
    }),

  /**
   * Detect suspicious activity patterns
   */
  getSuspiciousActivity: adminProcedure
    .input(
      z.object({
        hours: z.number().min(1).max(168).default(24),
        minFailedAttempts: z.number().min(1).default(5)
      })
    )
    .query(async ({ input }) => {
      const suspicious = (await detectSuspiciousActivity(
        input.hours,
        input.minFailedAttempts
      )) as Array<any>;

      return {
        suspicious,
        count: suspicious.length,
        timeWindow: `${input.hours} hours`,
        threshold: input.minFailedAttempts
      };
    }),

  /**
   * Clean up old logs
   */
  cleanupLogs: adminProcedure
    .input(
      z.object({
        olderThanDays: z.number().min(1).max(365).default(90)
      })
    )
    .mutation(async ({ input }) => {
      const deleted = await cleanupOldLogs(input.olderThanDays);

      return {
        deleted,
        olderThanDays: input.olderThanDays
      };
    })
});
