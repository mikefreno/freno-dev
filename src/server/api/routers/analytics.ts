import { createTRPCRouter, adminProcedure, publicProcedure } from "../utils";
import { z } from "zod";
import {
  queryAnalytics,
  getAnalyticsSummary,
  getPathAnalytics,
  cleanupOldAnalytics,
  logVisit,
  getPerformanceStats
} from "~/server/analytics";
import { ConnectionFactory } from "~/server/database";

export const analyticsRouter = createTRPCRouter({
  logPerformance: publicProcedure
    .input(
      z.object({
        path: z.string(),
        metrics: z.object({
          fcp: z.number().optional(),
          lcp: z.number().optional(),
          cls: z.number().optional(),
          fid: z.number().optional(),
          inp: z.number().optional(),
          ttfb: z.number().optional(),
          domLoad: z.number().optional(),
          loadComplete: z.number().optional()
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const conn = ConnectionFactory();

        // First, try to find a recent entry for this path without performance data
        const checkQuery = await conn.execute({
          sql: `SELECT id, path, created_at FROM VisitorAnalytics 
                WHERE path = ? 
                AND created_at >= datetime('now', '-5 minutes')
                AND fcp IS NULL
                ORDER BY created_at DESC
                LIMIT 1`,
          args: [input.path]
        });

        if (checkQuery.rows.length > 0) {
          const result = await conn.execute({
            sql: `UPDATE VisitorAnalytics 
                  SET fcp = ?, lcp = ?, cls = ?, fid = ?, inp = ?, ttfb = ?, dom_load = ?, load_complete = ?
                  WHERE id = ?`,
            args: [
              input.metrics.fcp || null,
              input.metrics.lcp || null,
              input.metrics.cls || null,
              input.metrics.fid || null,
              input.metrics.inp || null,
              input.metrics.ttfb || null,
              input.metrics.domLoad || null,
              input.metrics.loadComplete || null,
              (checkQuery.rows[0] as any).id
            ]
          });

          return {
            success: true,
            rowsAffected: result.rowsAffected,
            action: "updated"
          };
        } else {
          const { v4: uuid } = await import("uuid");
          const { enrichAnalyticsEntry } = await import("~/server/analytics");

          const req = ctx.event.nativeEvent.node?.req || ctx.event.nativeEvent;
          const userAgent =
            req.headers?.["user-agent"] ||
            ctx.event.request?.headers?.get("user-agent") ||
            undefined;
          const referrer =
            req.headers?.referer ||
            req.headers?.referrer ||
            ctx.event.request?.headers?.get("referer") ||
            undefined;
          const { getRequestIP } = await import("vinxi/http");
          const ipAddress = getRequestIP(ctx.event.nativeEvent) || undefined;
          const { getCookie } = await import("vinxi/http");
          const sessionId =
            getCookie(ctx.event.nativeEvent, "session_id") || undefined;

          const enriched = enrichAnalyticsEntry({
            userId: ctx.userId,
            path: input.path,
            method: "GET",
            userAgent,
            referrer,
            ipAddress,
            sessionId,
            fcp: input.metrics.fcp,
            lcp: input.metrics.lcp,
            cls: input.metrics.cls,
            fid: input.metrics.fid,
            inp: input.metrics.inp,
            ttfb: input.metrics.ttfb,
            domLoad: input.metrics.domLoad,
            loadComplete: input.metrics.loadComplete
          });

          await conn.execute({
            sql: `INSERT INTO VisitorAnalytics (
              id, user_id, path, method, referrer, user_agent, ip_address, 
              country, device_type, browser, os, session_id, duration_ms,
              fcp, lcp, cls, fid, inp, ttfb, dom_load, load_complete
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              uuid(),
              enriched.userId || null,
              enriched.path,
              enriched.method,
              enriched.referrer || null,
              enriched.userAgent || null,
              enriched.ipAddress || null,
              enriched.country || null,
              enriched.deviceType || null,
              enriched.browser || null,
              enriched.os || null,
              enriched.sessionId || null,
              enriched.durationMs || null,
              enriched.fcp || null,
              enriched.lcp || null,
              enriched.cls || null,
              enriched.fid || null,
              enriched.inp || null,
              enriched.ttfb || null,
              enriched.domLoad || null,
              enriched.loadComplete || null
            ]
          });

          return { success: true, rowsAffected: 1, action: "created" };
        }
      } catch (error) {
        console.error("Failed to log performance metrics:", error);
        return { success: false };
      }
    }),

  getLogs: adminProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        path: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().min(1).max(1000).default(100),
        offset: z.number().min(0).default(0)
      })
    )
    .query(async ({ input }) => {
      const logs = await queryAnalytics({
        userId: input.userId,
        path: input.path,
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

  getSummary: adminProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30)
      })
    )
    .query(async ({ input }) => {
      const summary = await getAnalyticsSummary(input.days);

      return {
        ...summary,
        timeWindow: `${input.days} days`
      };
    }),

  getPathStats: adminProcedure
    .input(
      z.object({
        path: z.string(),
        days: z.number().min(1).max(365).default(30)
      })
    )
    .query(async ({ input }) => {
      const stats = await getPathAnalytics(input.path, input.days);

      return {
        path: input.path,
        ...stats,
        timeWindow: `${input.days} days`
      };
    }),

  cleanup: adminProcedure
    .input(
      z.object({
        olderThanDays: z.number().min(1).max(365).default(90)
      })
    )
    .mutation(async ({ input }) => {
      const deleted = await cleanupOldAnalytics(input.olderThanDays);

      return {
        deleted,
        olderThanDays: input.olderThanDays
      };
    }),

  getPerformanceStats: adminProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30)
      })
    )
    .query(async ({ input }) => {
      const stats = await getPerformanceStats(input.days);

      return {
        ...stats,
        timeWindow: `${input.days} days`
      };
    })
});
