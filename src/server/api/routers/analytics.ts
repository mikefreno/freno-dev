import { createTRPCRouter, adminProcedure } from "../utils";
import { z } from "zod";
import {
  queryAnalytics,
  getAnalyticsSummary,
  getPathAnalytics,
  cleanupOldAnalytics
} from "~/server/analytics";

export const analyticsRouter = createTRPCRouter({
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
    })
});
