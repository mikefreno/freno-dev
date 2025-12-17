import { createTRPCRouter, publicProcedure } from "../../utils";
import { z } from "zod";
import {
  LineageConnectionFactory,
  LineageDBInit,
  hashPassword,
  checkPassword,
  sendEmailVerification,
  LINEAGE_JWT_EXPIRY,
} from "~/server/utils";
import { env } from "~/env/server";
import { TRPCError } from "@trpc/server";
import { SignJWT, jwtVerify } from "jose";
import { LibsqlError } from "@libsql/client/web";
import { createClient as createAPIClient } from "@tursodatabase/api";

export const lineageAuthRouter = createTRPCRouter({
  emailLogin: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      const { email, password } = input;

      const conn = LineageConnectionFactory();
      const query = `SELECT * FROM User WHERE email = ? AND provider = ? LIMIT 1`;
      const params = [email, "email"];
      const res = await conn.execute({ sql: query, args: params });

      if (res.rows.length === 0) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid Credentials",
        });
      }

      const user = res.rows[0];

      if (user.email_verified === 0) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email not yet verified!",
        });
      }

      const valid = await checkPassword(password, user.password_hash as string);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid Credentials",
        });
      }

      const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
      const token = await new SignJWT({ userId: user.id, email: user.email })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(LINEAGE_JWT_EXPIRY)
        .sign(secret);

      return {
        success: true,
        message: "Login successful",
        token,
        email,
      };
    }),

  emailRegistration: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        password_conf: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      const { email, password, password_conf } = input;

      if (password !== password_conf) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password mismatch",
        });
      }

      const passwordHash = await hashPassword(password);
      const conn = LineageConnectionFactory();
      const userCreationQuery = `
        INSERT INTO User (email, provider, password_hash)
        VALUES (?, ?, ?)
      `;
      const params = [email, "email", passwordHash];

      try {
        await conn.execute({ sql: userCreationQuery, args: params });

        const emailResult = await sendEmailVerification(email);
        if (emailResult.success && emailResult.messageId) {
          return {
            success: true,
            message: "Email verification sent!",
          };
        } else {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: emailResult.message || "Failed to send verification email",
          });
        }
      } catch (e) {
        console.error(e);
        if (e instanceof LibsqlError && e.code === "SQLITE_CONSTRAINT") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User already exists",
          });
        }
        if (e instanceof TRPCError) throw e;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while creating the user",
        });
      }
    }),

  emailVerification: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        token: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { email: userEmail, token } = input;

      let conn;
      let dbName;
      let dbToken;

      try {
        const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
        const { payload } = await jwtVerify(token, secret);

        if (payload.email !== userEmail) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication failed: email mismatch",
          });
        }

        conn = LineageConnectionFactory();
        const dbInit = await LineageDBInit();
        dbName = dbInit.dbName;
        dbToken = dbInit.token;

        const query = `UPDATE User SET email_verified = ?, database_name = ?, database_token = ? WHERE email = ?`;
        const queryParams = [true, dbName, dbToken, userEmail];
        const res = await conn.execute({ sql: query, args: queryParams });

        if (res.rowsAffected === 0) {
          throw new Error("User not found or update failed");
        }

        return {
          success: true,
          message:
            "Email verification success. You may close this window and sign in within the app.",
        };
      } catch (err) {
        console.error("Error in email verification:", err);

        if (dbName) {
          try {
            const turso = createAPIClient({
              org: "mikefreno",
              token: env.TURSO_DB_API_TOKEN,
            });
            await turso.databases.delete(dbName);
            console.log(`Database ${dbName} deleted due to error`);
          } catch (deleteErr) {
            console.error("Error deleting database:", deleteErr);
          }
        }

        if (conn) {
          try {
            await conn.execute({
              sql: `UPDATE User SET email_verified = ?, database_name = ?, database_token = ? WHERE email = ?`,
              args: [false, null, null, userEmail],
            });
            console.log("User table update reverted");
          } catch (revertErr) {
            console.error("Error reverting User table update:", revertErr);
          }
        }

        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Authentication failed: An error occurred during email verification. Please try again.",
        });
      }
    }),

  refreshVerification: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const { email } = input;
      const conn = LineageConnectionFactory();
      const query = "SELECT * FROM User WHERE email = ?";
      const params = [email];

      const res = await conn.execute({ sql: query, args: params });

      if (res.rows.length === 0 || res.rows[0].email_verified) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Invalid Request",
        });
      }

      const emailResult = await sendEmailVerification(email);
      if (emailResult.success && emailResult.messageId) {
        return {
          success: true,
          message: "Email verification sent!",
        };
      } else {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: emailResult.message || "Failed to send verification email",
        });
      }
    }),

  refreshToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const { token } = input;

      try {
        const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
        const { payload } = await jwtVerify(token, secret);

        const newToken = await new SignJWT({
          userId: payload.userId,
          email: payload.email,
        })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime(LINEAGE_JWT_EXPIRY)
          .sign(secret);

        return {
          status: 200,
          ok: true,
          valid: true,
          token: newToken,
          email: payload.email,
        };
      } catch (error) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired token",
        });
      }
    }),

  googleRegistration: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const { email } = input;

      const conn = LineageConnectionFactory();

      try {
        const checkUserQuery = "SELECT * FROM User WHERE email = ?";
        const checkUserResult = await conn.execute({
          sql: checkUserQuery,
          args: [email],
        });

        if (checkUserResult.rows.length > 0) {
          const updateQuery = `
            UPDATE User 
            SET provider = ?
            WHERE email = ?
          `;
          const updateRes = await conn.execute({
            sql: updateQuery,
            args: ["google", email],
          });

          if (updateRes.rowsAffected !== 0) {
            return {
              success: true,
              message: "User information updated",
            };
          } else {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "User update failed!",
            });
          }
        } else {
          let db_name;
          try {
            const { token, dbName } = await LineageDBInit();
            db_name = dbName;
            console.log("init success");
            const insertQuery = `
              INSERT INTO User (email, email_verified, provider, database_name, database_token)
              VALUES (?, ?, ?, ?, ?)
            `;
            await conn.execute({
              sql: insertQuery,
              args: [email, true, "google", dbName, token],
            });

            console.log("insert success");

            return {
              success: true,
              message: "New user created",
            };
          } catch (error) {
            if (db_name) {
              const turso = createAPIClient({
                org: "mikefreno",
                token: env.TURSO_DB_API_TOKEN,
              });
              await turso.databases.delete(db_name);
            }
            console.error(error);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create user",
            });
          }
        }
      } catch (error) {
        console.error("Error in Google Sign-Up handler:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while processing the request",
        });
      }
    }),

  appleRegistration: publicProcedure
    .input(
      z.object({
        email: z.string().email().optional(),
        userString: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { email, userString } = input;

      let dbName;
      let dbToken;
      const conn = LineageConnectionFactory();

      try {
        let checkUserQuery = "SELECT * FROM User WHERE apple_user_string = ?";

        let args: string[] = [userString];
        if (email) {
          args.push(email);
          checkUserQuery += " OR email = ?";
        }
        const checkUserResult = await conn.execute({
          sql: checkUserQuery,
          args: args,
        });

        if (checkUserResult.rows.length > 0) {
          const setClauses = [];
          const values = [];

          if (email) {
            setClauses.push("email = ?");
            values.push(email);
          }
          setClauses.push("provider = ?", "apple_user_string = ?");
          values.push("apple", userString);
          const whereClause = `WHERE apple_user_string = ?${
            email ? " OR email = ?" : ""
          }`;
          values.push(userString);
          if (email) {
            values.push(email);
          }

          const updateQuery = `UPDATE User SET ${setClauses.join(
            ", "
          )} ${whereClause}`;
          const updateRes = await conn.execute({
            sql: updateQuery,
            args: values,
          });

          if (updateRes.rowsAffected !== 0) {
            return {
              success: true,
              message: "User information updated",
              email: checkUserResult.rows[0].email as string,
            };
          } else {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "User update failed!",
            });
          }
        } else {
          const dbInit = await LineageDBInit();
          dbToken = dbInit.token;
          dbName = dbInit.dbName;

          try {
            const insertQuery = `
              INSERT INTO User (email, email_verified, apple_user_string, provider, database_name, database_token)
              VALUES (?, ?, ?, ?, ?, ?)
            `;
            await conn.execute({
              sql: insertQuery,
              args: [email, true, userString, "apple", dbName, dbToken],
            });

            return {
              success: true,
              message: "New user created",
              dbName,
              dbToken,
            };
          } catch (error) {
            if (dbName) {
              const turso = createAPIClient({
                org: "mikefreno",
                token: env.TURSO_DB_API_TOKEN,
              });
              await turso.databases.delete(dbName);
            }
            console.error(error);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create user",
            });
          }
        }
      } catch (error) {
        if (dbName) {
          try {
            const turso = createAPIClient({
              org: "mikefreno",
              token: env.TURSO_DB_API_TOKEN,
            });
            await turso.databases.delete(dbName);
          } catch (deleteErr) {
            console.error("Error deleting database:", deleteErr);
          }
        }
        console.error("Error in Apple Sign-Up handler:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while processing the request",
        });
      }
    }),

  appleGetEmail: publicProcedure
    .input(z.object({ userString: z.string() }))
    .mutation(async ({ input }) => {
      const { userString } = input;

      const conn = LineageConnectionFactory();
      const query = "SELECT * FROM User WHERE apple_user_string = ?";
      const res = await conn.execute({ sql: query, args: [userString] });

      if (res.rows.length > 0) {
        return { success: true, email: res.rows[0].email as string };
      } else {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }
    }),
});
