import { createTRPCRouter, publicProcedure } from "../utils";
import { TRPCError } from "@trpc/server";
import { ConnectionFactory, hashPassword, checkPassword } from "~/server/utils";
import { setCookie } from "vinxi/http";
import type { User } from "~/db/types";
import { toUserProfile } from "~/types/user";
import { getUserProviders, unlinkProvider } from "~/server/provider-helpers";
import { z } from "zod";
import { getAuthSession } from "~/server/session-helpers";
import { logAuditEvent } from "~/server/audit";
import { getClientIP, getUserAgent } from "~/server/security";
import { generatePasswordSetEmail } from "~/server/email-templates";
import { formatDeviceDescription } from "~/server/device-utils";
import sendEmail from "~/server/email";
import {
  updateEmailSchema,
  updateDisplayNameSchema,
  updateProfileImageSchema,
  changePasswordSchema,
  setPasswordSchema,
  deleteAccountSchema
} from "../schemas/user";

export const userRouter = createTRPCRouter({
  getProfile: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;

    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated"
      });
    }

    const conn = ConnectionFactory();
    const res = await conn.execute({
      sql: "SELECT * FROM User WHERE id = ?",
      args: [userId]
    });

    if (res.rows.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found"
      });
    }

    const user = res.rows[0] as unknown as User;
    return toUserProfile(user);
  }),

  updateEmail: publicProcedure
    .input(updateEmailSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated"
        });
      }

      const { email } = input;
      const conn = ConnectionFactory();

      await conn.execute({
        sql: "UPDATE User SET email = ?, email_verified = ? WHERE id = ?",
        args: [email, 0, userId]
      });

      const res = await conn.execute({
        sql: "SELECT * FROM User WHERE id = ?",
        args: [userId]
      });

      const user = res.rows[0] as unknown as User;

      return toUserProfile(user);
    }),

  updateDisplayName: publicProcedure
    .input(updateDisplayNameSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated"
        });
      }

      const { displayName } = input;
      const conn = ConnectionFactory();

      await conn.execute({
        sql: "UPDATE User SET display_name = ? WHERE id = ?",
        args: [displayName, userId]
      });

      const res = await conn.execute({
        sql: "SELECT * FROM User WHERE id = ?",
        args: [userId]
      });

      const user = res.rows[0] as unknown as User;
      return toUserProfile(user);
    }),

  updateProfileImage: publicProcedure
    .input(updateProfileImageSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated"
        });
      }

      const { imageUrl } = input;
      const conn = ConnectionFactory();

      await conn.execute({
        sql: "UPDATE User SET image = ? WHERE id = ?",
        args: [imageUrl, userId]
      });

      const res = await conn.execute({
        sql: "SELECT * FROM User WHERE id = ?",
        args: [userId]
      });

      const user = res.rows[0] as unknown as User;
      return toUserProfile(user);
    }),

  changePassword: publicProcedure
    .input(changePasswordSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated"
        });
      }

      const { oldPassword, newPassword, newPasswordConfirmation } = input;

      if (newPassword !== newPasswordConfirmation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password Mismatch"
        });
      }

      const conn = ConnectionFactory();
      const res = await conn.execute({
        sql: "SELECT * FROM User WHERE id = ?",
        args: [userId]
      });

      if (res.rows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found"
        });
      }

      const user = res.rows[0] as unknown as User;

      if (!user.password_hash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No password set"
        });
      }

      const passwordMatch = await checkPassword(
        oldPassword,
        user.password_hash
      );

      if (!passwordMatch) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Password did not match record"
        });
      }

      const newPasswordHash = await hashPassword(newPassword);
      await conn.execute({
        sql: "UPDATE User SET password_hash = ? WHERE id = ?",
        args: [newPasswordHash, userId]
      });

      return { success: true, message: "success" };
    }),

  setPassword: publicProcedure
    .input(setPasswordSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated"
        });
      }

      const { newPassword, newPasswordConfirmation } = input;

      if (newPassword !== newPasswordConfirmation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password Mismatch"
        });
      }

      const conn = ConnectionFactory();
      const res = await conn.execute({
        sql: "SELECT * FROM User WHERE id = ?",
        args: [userId]
      });

      if (res.rows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found"
        });
      }

      const user = res.rows[0] as unknown as User;

      if (user.password_hash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password exists"
        });
      }

      const passwordHash = await hashPassword(newPassword);
      await conn.execute({
        sql: "UPDATE User SET password_hash = ? WHERE id = ?",
        args: [passwordHash, userId]
      });

      // Send email notification about password being set
      if (user.email) {
        try {
          const h3Event = ctx.event.nativeEvent
            ? ctx.event.nativeEvent
            : (ctx.event as any);
          const clientIP = getClientIP(h3Event);
          const userAgent = getUserAgent(h3Event);

          const deviceInfo = formatDeviceDescription({
            userAgent
          });

          const providerName =
            user.provider === "google"
              ? "Google"
              : user.provider === "github"
                ? "GitHub"
                : "provider";

          const htmlContent = generatePasswordSetEmail({
            providerName,
            setTime: new Date().toLocaleString(),
            deviceInfo,
            ipAddress: clientIP
          });

          await sendEmail(
            user.email,
            "Password Added to Your Account",
            htmlContent
          );

          console.log(`[setPassword] Confirmation email sent to ${user.email}`);
        } catch (emailError) {
          console.error(
            "[setPassword] Failed to send confirmation email:",
            emailError
          );
          // Don't fail the operation if email fails
        }
      }

      return { success: true, message: "success" };
    }),

  deleteAccount: publicProcedure
    .input(deleteAccountSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated"
        });
      }

      const { password } = input;
      const conn = ConnectionFactory();

      const res = await conn.execute({
        sql: "SELECT * FROM User WHERE id = ?",
        args: [userId]
      });

      if (res.rows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found"
        });
      }

      const user = res.rows[0] as unknown as User;

      if (!user.password_hash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password required"
        });
      }

      const passwordMatch = await checkPassword(password, user.password_hash);

      if (!passwordMatch) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Password Did Not Match"
        });
      }

      await conn.execute({
        sql: `UPDATE User SET 
          email = ?, 
          email_verified = ?, 
          password_hash = ?, 
          display_name = ?, 
          provider = ?, 
          image = ? 
          WHERE id = ?`,
        args: [null, 0, null, "user deleted", null, null, userId]
      });

      return { success: true, message: "deleted" };
    }),

  getProviders: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;

    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated"
      });
    }

    const providers = await getUserProviders(userId);

    return providers.map((p) => ({
      id: p.id,
      provider: p.provider,
      email: p.email || undefined,
      displayName: p.display_name || undefined,
      lastUsedAt: p.last_used_at,
      createdAt: p.created_at
    }));
  }),

  unlinkProvider: publicProcedure
    .input(
      z.object({
        provider: z.enum(["email", "google", "github"])
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated"
        });
      }

      await unlinkProvider(userId, input.provider);

      return { success: true, message: "Provider unlinked" };
    }),

  getSessions: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;

    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated"
      });
    }

    const conn = ConnectionFactory();
    const res = await conn.execute({
      sql: `SELECT session_id, token_family, created_at, expires_at, last_rotated_at, 
            rotation_count, client_ip, user_agent 
            FROM Session 
            WHERE user_id = ? AND revoked = 0 AND expires_at > datetime('now')
            ORDER BY last_rotated_at DESC`,
      args: [userId]
    });

    // Get current session to mark it
    const currentSession = await getAuthSession(ctx.event as any);

    return res.rows.map((row: any) => ({
      sessionId: row.session_id,
      tokenFamily: row.token_family,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      lastRotatedAt: row.last_rotated_at,
      rotationCount: row.rotation_count,
      clientIp: row.client_ip,
      userAgent: row.user_agent,
      isCurrent: currentSession?.sessionId === row.session_id
    }));
  }),

  revokeSession: publicProcedure
    .input(
      z.object({
        sessionId: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated"
        });
      }

      const conn = ConnectionFactory();

      // Verify session belongs to this user
      const sessionCheck = await conn.execute({
        sql: "SELECT user_id, token_family FROM Session WHERE session_id = ?",
        args: [input.sessionId]
      });

      if (sessionCheck.rows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found"
        });
      }

      const session = sessionCheck.rows[0] as any;
      if (session.user_id !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot revoke another user's session"
        });
      }

      // Revoke the entire token family (all sessions on this device)
      await conn.execute({
        sql: "UPDATE Session SET revoked = 1 WHERE token_family = ?",
        args: [session.token_family]
      });

      // Log audit event
      const h3Event = ctx.event.nativeEvent
        ? ctx.event.nativeEvent
        : (ctx.event as any);
      const clientIP = getClientIP(h3Event);
      const userAgent = getUserAgent(h3Event);

      await logAuditEvent({
        userId,
        eventType: "auth.session_revoked",
        eventData: {
          sessionId: input.sessionId,
          tokenFamily: session.token_family,
          reason: "user_revoked"
        },
        ipAddress: clientIP,
        userAgent,
        success: true
      });

      return { success: true, message: "Session revoked" };
    })
});
