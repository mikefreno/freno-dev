import { createTRPCRouter, publicProcedure, csrfProtectedProcedure } from "../utils";
import { TRPCError } from "@trpc/server";
import { ConnectionFactory, hashPassword, checkPassword } from "~/server/utils";
import type { User } from "~/db/types";
import { toUserProfile } from "~/types/user";
import { getUserProviders, unlinkProvider } from "~/server/provider-helpers";
import { z } from "zod";
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

  updateEmail: csrfProtectedProcedure
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

  updateDisplayName: csrfProtectedProcedure
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

  updateProfileImage: csrfProtectedProcedure
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

  changePassword: csrfProtectedProcedure
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

  setPassword: csrfProtectedProcedure
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

      // For OAuth accounts, require verified email before setting password
      if (user.provider !== "email" && (!user.email || !user.email_verified)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email verification required before setting password"
        });
      }

      const passwordHash = await hashPassword(newPassword);
      await conn.execute({
        sql: "UPDATE User SET password_hash = ? WHERE id = ?",
        args: [passwordHash, userId]
      });

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

  deleteAccount: csrfProtectedProcedure
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

  unlinkProvider: csrfProtectedProcedure
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
    })
});
