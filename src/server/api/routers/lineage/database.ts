import { z } from "zod";
import {
  LineageConnectionFactory,
  validateLineageRequest,
  dumpAndSendDB
} from "~/server/utils";
import { env } from "~/env/server";
import { TRPCError } from "@trpc/server";
import { OAuth2Client } from "google-auth-library";
import { jwtVerify } from "jose";
import { createTRPCRouter, publicProcedure } from "~/server/api/utils";
import {
  fetchWithTimeout,
  checkResponse,
  NetworkError,
  TimeoutError,
  APIError
} from "~/server/fetch-utils";

export const lineageDatabaseRouter = createTRPCRouter({
  credentials: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        provider: z.enum(["email", "google", "apple"]),
        authToken: z.string()
      })
    )
    .mutation(async ({ input }) => {
      const { email, provider, authToken } = input;

      try {
        let valid_request = false;

        if (provider === "email") {
          const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
          const { payload } = await jwtVerify(authToken, secret);
          if (payload.email === email) {
            valid_request = true;
          }
        } else if (provider === "google") {
          const CLIENT_ID = env.VITE_GOOGLE_CLIENT_ID_MAGIC_DELVE;
          if (!CLIENT_ID) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Google client ID not configured"
            });
          }
          const client = new OAuth2Client(CLIENT_ID);
          const ticket = await client.verifyIdToken({
            idToken: authToken,
            audience: CLIENT_ID
          });
          if (ticket.getPayload()?.email === email) {
            valid_request = true;
          }
        } else {
          const conn = LineageConnectionFactory();
          const query = "SELECT * FROM User WHERE apple_user_string = ?";
          const res = await conn.execute({ sql: query, args: [authToken] });
          if (res.rows.length > 0 && res.rows[0].email === email) {
            valid_request = true;
          }
        }

        if (valid_request) {
          const conn = LineageConnectionFactory();
          const query = "SELECT * FROM User WHERE email = ? LIMIT 1";
          const params = [email];
          const res = await conn.execute({ sql: query, args: params });

          if (res.rows.length === 1) {
            const user = res.rows[0];
            return {
              success: true,
              db_name: user.database_name as string,
              db_token: user.database_token as string
            };
          }

          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No user found"
          });
        } else {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid credentials"
          });
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication failed"
        });
      }
    }),

  deletionInit: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        db_name: z.string(),
        db_token: z.string(),
        authToken: z.string(),
        skip_cron: z.boolean().optional(),
        send_dump_target: z.string().email().optional()
      })
    )
    .mutation(async ({ input }) => {
      const {
        email,
        db_name,
        db_token,
        authToken,
        skip_cron,
        send_dump_target
      } = input;

      const conn = LineageConnectionFactory();
      const res = await conn.execute({
        sql: `SELECT * FROM User WHERE email = ?`,
        args: [email]
      });
      const userRow = res.rows[0];

      if (!userRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found"
        });
      }

      const valid = await validateLineageRequest({
        auth_token: authToken,
        userRow
      });

      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid Verification"
        });
      }

      const { database_token, database_name } = userRow;

      if (database_token !== db_token || database_name !== db_name) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Incorrect Verification"
        });
      }

      if (skip_cron) {
        if (send_dump_target) {
          const dumpRes = await dumpAndSendDB({
            dbName: db_name,
            dbToken: db_token,
            sendTarget: send_dump_target
          });

          if (dumpRes.success) {
            try {
              const deleteRes = await fetchWithTimeout(
                `https://api.turso.tech/v1/organizations/mikefreno/databases/${db_name}`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${env.TURSO_DB_API_TOKEN}`
                  },
                  timeout: 20000 // 20s for database deletion
                }
              );

              await checkResponse(deleteRes);

              await conn.execute({
                sql: `DELETE FROM User WHERE email = ?`,
                args: [email]
              });
              return {
                ok: true,
                status: 200,
                message: `Account and Database deleted, db dump sent to email: ${send_dump_target}`
              };
            } catch (error) {
              if (error instanceof TimeoutError) {
                console.error("Database deletion timeout:", error.message);
                throw new TRPCError({
                  code: "TIMEOUT",
                  message:
                    "Database deletion timed out. Please contact support."
                });
              } else if (error instanceof NetworkError) {
                console.error(
                  "Network error during database deletion:",
                  error.message
                );
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Network error deleting database. Please try again."
                });
              } else if (error instanceof APIError) {
                console.error(
                  "API error deleting database:",
                  error.status,
                  error.statusText
                );
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Failed to delete database"
                });
              }
              throw error;
            }
          } else {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: dumpRes.reason || "Failed to dump database"
            });
          }
        } else {
          try {
            const deleteRes = await fetchWithTimeout(
              `https://api.turso.tech/v1/organizations/mikefreno/databases/${db_name}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${env.TURSO_DB_API_TOKEN}`
                },
                timeout: 20000
              }
            );

            await checkResponse(deleteRes);

            await conn.execute({
              sql: `DELETE FROM User WHERE email = ?`,
              args: [email]
            });
            return {
              ok: true,
              status: 200,
              message: `Account and Database deleted`
            };
          } catch (error) {
            if (error instanceof TimeoutError) {
              console.error("Database deletion timeout:", error.message);
              throw new TRPCError({
                code: "TIMEOUT",
                message: "Database deletion timed out. Please contact support."
              });
            } else if (error instanceof NetworkError) {
              console.error(
                "Network error during database deletion:",
                error.message
              );
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Network error deleting database. Please try again."
              });
            } else if (error instanceof APIError) {
              console.error(
                "API error deleting database:",
                error.status,
                error.statusText
              );
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to delete database"
              });
            }
            throw error;
          }
        }
      } else {
        const insertRes = await conn.execute({
          sql: `INSERT INTO cron (email, db_name, db_token, send_dump_target) VALUES (?, ?, ?, ?)`,
          args: [email, db_name, db_token, send_dump_target]
        });

        if (insertRes.rowsAffected > 0) {
          return {
            ok: true,
            status: 200,
            message: `Deletion scheduled.`
          };
        } else {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Deletion not scheduled, due to server failure`
          });
        }
      }
    }),

  deletionCheck: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const { email } = input;
      const conn = LineageConnectionFactory();

      try {
        const res = await conn.execute({
          sql: `SELECT * FROM cron WHERE email = ?`,
          args: [email]
        });
        const cronRow = res.rows[0];

        if (!cronRow) {
          return { status: 204, ok: true };
        }

        return {
          ok: true,
          status: 200,
          created_at: cronRow.created_at as string
        };
      } catch (e) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to check deletion status"
        });
      }
    }),

  deletionCancel: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        authToken: z.string()
      })
    )
    .mutation(async ({ input }) => {
      const { email, authToken } = input;

      const conn = LineageConnectionFactory();

      const resUser = await conn.execute({
        sql: `SELECT * FROM User WHERE email = ?;`,
        args: [email]
      });

      if (resUser.rows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found."
        });
      }

      const userRow = resUser.rows[0];

      const valid = await validateLineageRequest({
        auth_token: authToken,
        userRow
      });

      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials for cancelation."
        });
      }

      const result = await conn.execute({
        sql: `DELETE FROM cron WHERE email = ?;`,
        args: [email]
      });

      if (result.rowsAffected > 0) {
        return {
          status: 200,
          ok: true,
          message: "Cron job(s) canceled successfully."
        };
      } else {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No cron job found for the given email."
        });
      }
    }),

  deletionCron: publicProcedure.query(async () => {
    const conn = LineageConnectionFactory();
    const res = await conn.execute(
      `SELECT * FROM cron WHERE created_at <= datetime('now', '-1 day');`
    );

    if (res.rows.length > 0) {
      const executed_ids: (number | string)[] = [];

      for (const row of res.rows) {
        const { id, db_name, db_token, send_dump_target, email } = row;

        if (send_dump_target) {
          const dumpRes = await dumpAndSendDB({
            dbName: db_name as string,
            dbToken: db_token as string,
            sendTarget: send_dump_target as string
          });

          if (dumpRes.success) {
            try {
              const deleteRes = await fetchWithTimeout(
                `https://api.turso.tech/v1/organizations/mikefreno/databases/${db_name}`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${env.TURSO_DB_API_TOKEN}`
                  },
                  timeout: 20000
                }
              );

              await checkResponse(deleteRes);

              await conn.execute({
                sql: `DELETE FROM User WHERE email = ?`,
                args: [email]
              });
              executed_ids.push(id as number);
            } catch (error) {
              console.error(
                `Failed to delete database ${db_name} in cron job:`,
                error
              );
              // Continue with other deletions even if one fails
            }
          }
        } else {
          try {
            const deleteRes = await fetchWithTimeout(
              `https://api.turso.tech/v1/organizations/mikefreno/databases/${db_name}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${env.TURSO_DB_API_TOKEN}`
                },
                timeout: 20000
              }
            );

            await checkResponse(deleteRes);

            await conn.execute({
              sql: `DELETE FROM User WHERE email = ?`,
              args: [email]
            });
            executed_ids.push(id as number);
          } catch (error) {
            console.error(
              `Failed to delete database ${db_name} in cron job:`,
              error
            );
            // Continue with other deletions even if one fails
          }
        }
      }

      if (executed_ids.length > 0) {
        const placeholders = executed_ids.map(() => "?").join(", ");
        const deleteQuery = `DELETE FROM cron WHERE id IN (${placeholders});`;
        await conn.execute({ sql: deleteQuery, args: executed_ids });

        return {
          status: 200,
          message:
            "Processed databases deleted and corresponding cron rows removed."
        };
      }
    }

    return { status: 200, ok: true };
  })
});
