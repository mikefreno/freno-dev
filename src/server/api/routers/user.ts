import { createTRPCRouter, publicProcedure } from "../utils";
import { TRPCError } from "@trpc/server";
import { ConnectionFactory, hashPassword, checkPassword } from "~/server/utils";
import { setCookie } from "vinxi/http";
import type { User } from "~/db/types";
import { toUserProfile } from "~/types/user";
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

      setCookie(ctx.event.nativeEvent, "emailToken", email, {
        path: "/"
      });

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

      setCookie(ctx.event.nativeEvent, "emailToken", "", {
        maxAge: 0,
        path: "/"
      });
      setCookie(ctx.event.nativeEvent, "userIDToken", "", {
        maxAge: 0,
        path: "/"
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

      setCookie(ctx.event.nativeEvent, "emailToken", "", {
        maxAge: 0,
        path: "/"
      });
      setCookie(ctx.event.nativeEvent, "userIDToken", "", {
        maxAge: 0,
        path: "/"
      });

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

      setCookie(ctx.event.nativeEvent, "emailToken", "", {
        maxAge: 0,
        path: "/"
      });
      setCookie(ctx.event.nativeEvent, "userIDToken", "", {
        maxAge: 0,
        path: "/"
      });

      return { success: true, message: "deleted" };
    })
});
