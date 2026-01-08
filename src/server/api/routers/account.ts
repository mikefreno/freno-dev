import { createTRPCRouter, protectedProcedure } from "../utils";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getUserProviders,
  unlinkProvider,
  getProviderSummary
} from "~/server/provider-helpers";
import {
  getUserActiveSessions,
  revokeUserSession,
  revokeOtherUserSessions,
  getSessionCountByDevice
} from "~/server/session-management";
import { getAuthSession } from "~/server/session-helpers";
import { logAuditEvent } from "~/server/audit";
import { getAuditContext } from "~/server/security";
import type { H3Event } from "vinxi/http";
import type { Context } from "../utils";

/**
 * Extract H3Event from Context
 */
function getH3Event(ctx: Context): H3Event {
  if (ctx.event && "nativeEvent" in ctx.event && ctx.event.nativeEvent) {
    return ctx.event.nativeEvent as H3Event;
  }
  return ctx.event as unknown as H3Event;
}

export const accountRouter = createTRPCRouter({
  /**
   * Get all linked authentication providers for current user
   */
  getLinkedProviders: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.userId!;
      const summary = await getProviderSummary(userId);

      return {
        success: true,
        providers: summary.providers,
        count: summary.count
      };
    } catch (error) {
      console.error("Error fetching linked providers:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch linked providers"
      });
    }
  }),

  /**
   * Unlink an authentication provider
   */
  unlinkProvider: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["email", "google", "github"])
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.userId!;
        const { provider } = input;

        await unlinkProvider(userId, provider);

        // Log audit event
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          userId,
          eventType: "auth.provider.unlinked",
          eventData: { provider },
          ipAddress,
          userAgent,
          success: true
        });

        return {
          success: true,
          message: `${provider} authentication unlinked successfully`
        };
      } catch (error) {
        console.error("Error unlinking provider:", error);

        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to unlink provider"
        });
      }
    }),

  /**
   * Get all active sessions for current user
   */
  getActiveSessions: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.userId!;
      const sessions = await getUserActiveSessions(userId);

      // Mark current session
      const currentSession = await getAuthSession(getH3Event(ctx));
      const currentSessionId = currentSession?.sessionId;

      const sessionsWithCurrent = sessions.map((session) => ({
        ...session,
        current: session.sessionId === currentSessionId
      }));

      return {
        success: true,
        sessions: sessionsWithCurrent
      };
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch active sessions"
      });
    }
  }),

  /**
   * Get session statistics by device type
   */
  getSessionStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.userId!;
      const stats = await getSessionCountByDevice(userId);

      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error("Error fetching session stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch session stats"
      });
    }
  }),

  /**
   * Revoke a specific session
   */
  revokeSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.userId!;
        const { sessionId } = input;

        await revokeUserSession(userId, sessionId);

        // Log audit event
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          userId,
          eventType: "auth.session_revoked",
          eventData: { sessionId, reason: "user_request" },
          ipAddress,
          userAgent,
          success: true
        });

        return {
          success: true,
          message: "Session revoked successfully"
        };
      } catch (error) {
        console.error("Error revoking session:", error);

        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to revoke session"
        });
      }
    }),

  /**
   * Revoke all other sessions (keep current session active)
   */
  revokeOtherSessions: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const userId = ctx.userId!;

      // Get current session
      const currentSession = await getAuthSession(getH3Event(ctx));
      if (!currentSession) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "No active session found"
        });
      }

      const revokedCount = await revokeOtherUserSessions(
        userId,
        currentSession.sessionId
      );

      // Log audit event
      const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
      await logAuditEvent({
        userId,
        eventType: "auth.sessions_bulk_revoked",
        eventData: {
          revokedCount,
          keptSession: currentSession.sessionId,
          reason: "user_request"
        },
        ipAddress,
        userAgent,
        success: true
      });

      return {
        success: true,
        message: `${revokedCount} session(s) revoked successfully`,
        revokedCount
      };
    } catch (error) {
      console.error("Error revoking other sessions:", error);

      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to revoke sessions"
      });
    }
  })
});
