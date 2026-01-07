import { createTRPCRouter, publicProcedure } from "../utils";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { env } from "~/env/server";
import {
  ConnectionFactory,
  hashPassword,
  checkPassword,
  checkPasswordSafe
} from "~/server/utils";
import { setCookie, getCookie } from "vinxi/http";
import type { User } from "~/db/types";
import {
  fetchWithTimeout,
  checkResponse,
  fetchWithRetry,
  NetworkError,
  TimeoutError,
  APIError
} from "~/server/fetch-utils";
import {
  registerUserSchema,
  loginUserSchema,
  resetPasswordSchema,
  requestPasswordResetSchema
} from "../schemas/user";
import {
  setCSRFToken,
  csrfProtection,
  getClientIP,
  getUserAgent,
  getAuditContext,
  rateLimitLogin,
  rateLimitPasswordReset,
  rateLimitRegistration,
  rateLimitEmailVerification,
  checkAccountLockout,
  recordFailedLogin,
  resetFailedAttempts,
  resetLoginRateLimits,
  createPasswordResetToken,
  validatePasswordResetToken,
  markPasswordResetTokenUsed
} from "~/server/security";
import { logAuditEvent } from "~/server/audit";
import type { H3Event } from "vinxi/http";
import type { Context } from "../utils";
import { AUTH_CONFIG, NETWORK_CONFIG, COOLDOWN_TIMERS } from "~/config";
import {
  createAuthSession,
  getAuthSession,
  invalidateAuthSession,
  rotateAuthSession,
  revokeTokenFamily
} from "~/server/session-helpers";
import { checkAuthStatus } from "~/server/auth";
import { v4 as uuidV4 } from "uuid";
import { jwtVerify, SignJWT } from "jose";

/**
 * Safely extract H3Event from Context
 * In production: ctx.event is APIEvent, H3Event is at ctx.event.nativeEvent
 * In development: ctx.event might be H3Event directly
 */
function getH3Event(ctx: Context): H3Event {
  // Check if nativeEvent exists (production)
  if (ctx.event && "nativeEvent" in ctx.event && ctx.event.nativeEvent) {
    return ctx.event.nativeEvent as H3Event;
  }
  // Otherwise, assume ctx.event is H3Event (development)
  return ctx.event as unknown as H3Event;
}

// Zod schemas
const refreshTokenSchema = z.object({
  rememberMe: z.boolean().optional().default(false)
});

async function sendEmail(to: string, subject: string, htmlContent: string) {
  const apiKey = env.SENDINBLUE_KEY;
  const apiUrl = "https://api.sendinblue.com/v3/smtp/email";

  const sendinblueData = {
    sender: {
      name: "freno.me",
      email: "no_reply@freno.me"
    },
    to: [{ email: to }],
    htmlContent,
    subject
  };

  return fetchWithRetry(
    async () => {
      const response = await fetchWithTimeout(apiUrl, {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": apiKey,
          "content-type": "application/json"
        },
        body: JSON.stringify(sendinblueData),
        timeout: NETWORK_CONFIG.EMAIL_API_TIMEOUT_MS
      });

      await checkResponse(response);
      return response;
    },
    {
      maxRetries: NETWORK_CONFIG.MAX_RETRIES,
      retryDelay: NETWORK_CONFIG.RETRY_DELAY_MS
    }
  );
}

/**
 * Attempt server-side token refresh for SSR
 * Called from getUserState() when access token is expired but refresh token exists
 * @param event - H3Event from SSR
 * @param refreshToken - Refresh token from httpOnly cookie (unused, kept for API compatibility)
 * @returns userId if refresh succeeded, null otherwise
 */
export async function attemptTokenRefresh(
  event: H3Event,
  refreshToken: string
): Promise<string | null> {
  try {
    console.log("[Token Refresh SSR] Attempting server-side refresh");

    // Step 1: Get current session from Vinxi
    const session = await getAuthSession(event);
    if (!session) {
      console.warn("[Token Refresh SSR] No valid session found");
      return null;
    }

    // Step 2: Get client info for rotation
    const clientIP = getClientIP(event);
    const userAgent = getUserAgent(event);

    // Step 3: Rotate session (includes validation, breach detection, cookie update)
    console.log(
      `[Token Refresh SSR] Rotating tokens for session ${session.sessionId}`
    );
    const newSession = await rotateAuthSession(
      event,
      session,
      clientIP,
      userAgent
    );

    if (!newSession) {
      console.warn("[Token Refresh SSR] Token rotation failed");
      return null;
    }

    console.log("[Token Refresh SSR] Token refresh successful");
    return newSession.userId;
  } catch (error) {
    console.error("[Token Refresh SSR] Error:", error);
    return null;
  }
}

export const authRouter = createTRPCRouter({
  githubCallback: publicProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { code } = input;

      try {
        const tokenResponse = await fetchWithTimeout(
          "https://github.com/login/oauth/access_token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify({
              client_id: env.VITE_GITHUB_CLIENT_ID,
              client_secret: env.GITHUB_CLIENT_SECRET,
              code
            }),
            timeout: NETWORK_CONFIG.GITHUB_API_TIMEOUT_MS
          }
        );

        await checkResponse(tokenResponse);
        const { access_token } = await tokenResponse.json();

        if (!access_token) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Failed to get access token from GitHub"
          });
        }

        const userResponse = await fetchWithTimeout(
          "https://api.github.com/user",
          {
            headers: {
              Authorization: `token ${access_token}`
            },
            timeout: NETWORK_CONFIG.GITHUB_API_TIMEOUT_MS
          }
        );

        await checkResponse(userResponse);
        const user = await userResponse.json();
        const login = user.login;
        const icon = user.avatar_url;

        const emailsResponse = await fetchWithTimeout(
          "https://api.github.com/user/emails",
          {
            headers: {
              Authorization: `token ${access_token}`
            },
            timeout: NETWORK_CONFIG.GITHUB_API_TIMEOUT_MS
          }
        );

        await checkResponse(emailsResponse);
        const emails = await emailsResponse.json();

        const primaryEmail = emails.find(
          (e: { primary: boolean; verified: boolean; email: string }) =>
            e.primary && e.verified
        );
        const email = primaryEmail?.email || null;
        const emailVerified = primaryEmail?.verified || false;

        const conn = ConnectionFactory();

        const query = `SELECT * FROM User WHERE provider = ? AND display_name = ?`;
        const params = ["github", login];
        const res = await conn.execute({ sql: query, args: params });

        let userId: string;

        if (res.rows[0]) {
          userId = (res.rows[0] as unknown as User).id;

          try {
            await conn.execute({
              sql: `UPDATE User SET email = ?, email_verified = ?, image = ? WHERE id = ?`,
              args: [email, emailVerified ? 1 : 0, icon, userId]
            });
          } catch (updateError: any) {
            if (
              updateError.code === "SQLITE_CONSTRAINT" &&
              updateError.message?.includes("User.email")
            ) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "This email is already associated with another account. Please sign in with that account or use a different email address."
              });
            }
            throw updateError;
          }
        } else {
          userId = uuidV4();

          const insertQuery = `INSERT INTO User (id, email, email_verified, display_name, provider, image) VALUES (?, ?, ?, ?, ?, ?)`;
          const insertParams = [
            userId,
            email,
            emailVerified ? 1 : 0,
            login,
            "github",
            icon
          ];

          try {
            await conn.execute({ sql: insertQuery, args: insertParams });
          } catch (insertError: any) {
            if (
              insertError.code === "SQLITE_CONSTRAINT" &&
              insertError.message?.includes("User.email")
            ) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "This email is already associated with another account. Please sign in with that account or use a different email address."
              });
            }
            throw insertError;
          }
        }

        const isAdmin = userId === env.ADMIN_ID;

        // Create session with Vinxi (OAuth defaults to remember me)
        const clientIP = getClientIP(getH3Event(ctx));
        const userAgent = getUserAgent(getH3Event(ctx));
        await createAuthSession(
          getH3Event(ctx),
          userId,
          isAdmin,
          true, // OAuth defaults to remember
          clientIP,
          userAgent
        );

        // Set CSRF token for authenticated session
        setCSRFToken(getH3Event(ctx));

        // Log successful OAuth login
        await logAuditEvent({
          userId,
          eventType: "auth.login.success",
          eventData: { method: "github", isNewUser: !res.rows[0] },
          ipAddress: clientIP,
          userAgent,
          success: true
        });

        return {
          success: true,
          redirectTo: "/account"
        };
      } catch (error) {
        // Log failed OAuth login
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          eventType: "auth.login.failed",
          eventData: {
            method: "github",
            reason: error instanceof TRPCError ? error.message : "unknown"
          },
          ipAddress,
          userAgent,
          success: false
        });

        if (error instanceof TRPCError) {
          throw error;
        }

        if (error instanceof TimeoutError) {
          console.error("GitHub API timeout:", error.message);
          throw new TRPCError({
            code: "TIMEOUT",
            message: "GitHub authentication timed out. Please try again."
          });
        } else if (error instanceof NetworkError) {
          console.error("GitHub API network error:", error.message);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to connect to GitHub. Please try again later."
          });
        } else if (error instanceof APIError) {
          console.error("GitHub API error:", error.status, error.statusText);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "GitHub authentication failed. Please try again."
          });
        }

        console.error("GitHub authentication failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "GitHub authentication failed"
        });
      }
    }),

  googleCallback: publicProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { code } = input;

      try {
        const tokenResponse = await fetchWithTimeout(
          "https://oauth2.googleapis.com/token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
              code: code,
              client_id: env.VITE_GOOGLE_CLIENT_ID || "",
              client_secret: env.GOOGLE_CLIENT_SECRET,
              redirect_uri: `${env.VITE_DOMAIN || "https://freno.me"}/api/auth/callback/google`,
              grant_type: "authorization_code"
            }),
            timeout: NETWORK_CONFIG.GOOGLE_API_TIMEOUT_MS
          }
        );

        await checkResponse(tokenResponse);
        const { access_token } = await tokenResponse.json();

        if (!access_token) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Failed to get access token from Google"
          });
        }

        const userResponse = await fetchWithTimeout(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${access_token}`
            },
            timeout: NETWORK_CONFIG.GOOGLE_API_TIMEOUT_MS
          }
        );

        await checkResponse(userResponse);
        const userData = await userResponse.json();
        const name = userData.name;
        const image = userData.picture;
        const email = userData.email;
        const email_verified = userData.email_verified;

        const conn = ConnectionFactory();

        const query = `SELECT * FROM User WHERE provider = ? AND email = ?`;
        const params = ["google", email];
        const res = await conn.execute({ sql: query, args: params });

        let userId: string;

        if (res.rows[0]) {
          userId = (res.rows[0] as unknown as User).id;

          await conn.execute({
            sql: `UPDATE User SET email = ?, email_verified = ?, display_name = ?, image = ? WHERE id = ?`,
            args: [email, email_verified ? 1 : 0, name, image, userId]
          });
        } else {
          userId = uuidV4();

          const insertQuery = `INSERT INTO User (id, email, email_verified, display_name, provider, image) VALUES (?, ?, ?, ?, ?, ?)`;
          const insertParams = [
            userId,
            email,
            email_verified ? 1 : 0,
            name,
            "google",
            image
          ];

          try {
            await conn.execute({
              sql: insertQuery,
              args: insertParams
            });
          } catch (insertError: any) {
            if (
              insertError.code === "SQLITE_CONSTRAINT" &&
              insertError.message?.includes("User.email")
            ) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "This email is already associated with another account. Please sign in with that account instead."
              });
            }
            throw insertError;
          }
        }

        const isAdmin = userId === env.ADMIN_ID;

        // Create session with Vinxi (OAuth defaults to remember me)
        const clientIP = getClientIP(getH3Event(ctx));
        const userAgent = getUserAgent(getH3Event(ctx));
        await createAuthSession(
          getH3Event(ctx),
          userId,
          isAdmin,
          true, // OAuth defaults to remember
          clientIP,
          userAgent
        );

        // Set CSRF token for authenticated session
        setCSRFToken(getH3Event(ctx));

        // Log successful OAuth login
        await logAuditEvent({
          userId,
          eventType: "auth.login.success",
          eventData: { method: "google", isNewUser: !res.rows[0] },
          ipAddress: clientIP,
          userAgent,
          success: true
        });

        return {
          success: true,
          redirectTo: "/account"
        };
      } catch (error) {
        // Log failed OAuth login
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          eventType: "auth.login.failed",
          eventData: {
            method: "google",
            reason: error instanceof TRPCError ? error.message : "unknown"
          },
          ipAddress,
          userAgent,
          success: false
        });

        if (error instanceof TRPCError) {
          throw error;
        }

        if (error instanceof TimeoutError) {
          console.error("Google API timeout:", error.message);
          throw new TRPCError({
            code: "TIMEOUT",
            message: "Google authentication timed out. Please try again."
          });
        } else if (error instanceof NetworkError) {
          console.error("Google API network error:", error.message);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to connect to Google. Please try again later."
          });
        } else if (error instanceof APIError) {
          console.error("Google API error:", error.status, error.statusText);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Google authentication failed. Please try again."
          });
        }

        console.error("Google authentication failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Google authentication failed"
        });
      }
    }),

  emailLogin: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        token: z.string(),
        rememberMe: z.boolean().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { email, token, rememberMe } = input;

      try {
        const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
        const { payload } = await jwtVerify(token, secret);

        if (payload.email !== email) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email mismatch"
          });
        }

        const conn = ConnectionFactory();
        const query = `SELECT * FROM User WHERE email = ?`;
        const params = [email];
        const res = await conn.execute({ sql: query, args: params });

        if (!res.rows[0]) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found"
          });
        }

        const userId = (res.rows[0] as unknown as User).id;
        const isAdmin = userId === env.ADMIN_ID;

        // Create session with Vinxi (handles DB + encrypted cookie)
        const clientIP = getClientIP(getH3Event(ctx));
        const userAgent = getUserAgent(getH3Event(ctx));
        await createAuthSession(
          getH3Event(ctx),
          userId,
          isAdmin,
          rememberMe || false,
          clientIP,
          userAgent
        );

        // Set CSRF token for authenticated session
        setCSRFToken(getH3Event(ctx));

        // Log successful email link login
        await logAuditEvent({
          userId,
          eventType: "auth.login.success",
          eventData: { method: "email_link", rememberMe: rememberMe || false },
          ipAddress: clientIP,
          userAgent,
          success: true
        });

        return {
          success: true,
          redirectTo: "/account"
        };
      } catch (error) {
        // Log failed email link login
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          eventType: "auth.login.failed",
          eventData: {
            method: "email_link",
            email: input.email,
            reason: error instanceof TRPCError ? error.message : "unknown"
          },
          ipAddress,
          userAgent,
          success: false
        });

        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Email login failed:", error);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication failed"
        });
      }
    }),

  emailVerification: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        token: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { email, token } = input;

      try {
        const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
        const { payload } = await jwtVerify(token, secret);

        if (payload.email !== email) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email mismatch"
          });
        }

        const conn = ConnectionFactory();

        // Get user ID for audit log
        const userRes = await conn.execute({
          sql: "SELECT id FROM User WHERE email = ?",
          args: [email]
        });
        const userId = userRes.rows[0] ? (userRes.rows[0] as any).id : null;

        const query = `UPDATE User SET email_verified = ? WHERE email = ?`;
        const params = [true, email];
        await conn.execute({ sql: query, args: params });

        // Log successful email verification
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          userId,
          eventType: "auth.email.verify.complete",
          eventData: { email },
          ipAddress,
          userAgent,
          success: true
        });

        return {
          success: true,
          message: "Email verification success, you may close this window"
        };
      } catch (error) {
        // Log failed email verification
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          eventType: "auth.email.verify.complete",
          eventData: {
            email,
            reason: error instanceof TRPCError ? error.message : "unknown"
          },
          ipAddress,
          userAgent,
          success: false
        });

        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Email verification failed:", error);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid token"
        });
      }
    }),

  emailRegistration: publicProcedure
    .input(registerUserSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, password, passwordConfirmation } = input;

      // Apply rate limiting
      const clientIP = getClientIP(getH3Event(ctx));
      await rateLimitRegistration(clientIP, getH3Event(ctx));

      // Schema already validates password match, but double check
      if (password !== passwordConfirmation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "passwordMismatch"
        });
      }

      const passwordHash = await hashPassword(password);
      const conn = ConnectionFactory();
      const userId = uuidV4();

      try {
        await conn.execute({
          sql: "INSERT INTO User (id, email, password_hash, provider) VALUES (?, ?, ?, ?)",
          args: [userId, email, passwordHash, "email"]
        });

        // Create session with client info
        const clientIP = getClientIP(getH3Event(ctx));
        const userAgent = getUserAgent(getH3Event(ctx));
        const isAdmin = userId === env.ADMIN_ID;

        await createAuthSession(
          getH3Event(ctx),
          userId,
          isAdmin,
          false, // Registration defaults to non-remember
          clientIP,
          userAgent
        );

        // Set CSRF token
        setCSRFToken(getH3Event(ctx));

        // Log successful registration
        await logAuditEvent({
          userId,
          eventType: "auth.register.success",
          eventData: { email, method: "email" },
          ipAddress: clientIP,
          userAgent,
          success: true
        });

        return { success: true, message: "success" };
      } catch (e) {
        // Log failed registration
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          eventType: "auth.register.failed",
          eventData: {
            email,
            method: "email",
            reason: e instanceof Error ? e.message : "unknown"
          },
          ipAddress,
          userAgent,
          success: false
        });

        console.error("Registration error:", e);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "duplicate"
        });
      }
    }),

  emailPasswordLogin: publicProcedure
    .input(loginUserSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { email, password, rememberMe } = input;

        // Apply rate limiting
        const clientIP = getClientIP(getH3Event(ctx));
        await rateLimitLogin(email, clientIP, getH3Event(ctx));

        const conn = ConnectionFactory();
        const res = await conn.execute({
          sql: "SELECT * FROM User WHERE email = ?",
          args: [email]
        });

        // Always run password check to prevent timing attacks
        const user =
          res.rows.length > 0 ? (res.rows[0] as unknown as User) : null;
        const passwordHash = user?.password_hash || null;
        const passwordMatch = await checkPasswordSafe(password, passwordHash);

        // Check all conditions after password verification
        if (!user || !passwordHash || !passwordMatch) {
          // Record failed login attempt if user exists
          if (user?.id) {
            const lockoutStatus = await recordFailedLogin(user.id);

            if (lockoutStatus.isLocked) {
              const remainingSec = Math.ceil(
                (lockoutStatus.remainingMs || 0) / 1000
              );

              // Log account lockout
              try {
                const { ipAddress, userAgent } = getAuditContext(
                  getH3Event(ctx)
                );
                await logAuditEvent({
                  userId: user.id,
                  eventType: "auth.login.failed",
                  eventData: {
                    email,
                    method: "password",
                    reason: "account_locked",
                    failedAttempts: lockoutStatus.failedAttempts
                  },
                  ipAddress,
                  userAgent,
                  success: false
                });
              } catch (auditError) {
                console.error("Audit logging failed:", auditError);
              }

              throw new TRPCError({
                code: "FORBIDDEN",
                message: `Account locked due to too many failed login attempts. Try again in ${Math.ceil(remainingSec / 60)} minutes.`
              });
            }
          }

          // Log failed login attempt
          try {
            const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
            await logAuditEvent({
              userId: user?.id,
              eventType: "auth.login.failed",
              eventData: {
                email,
                method: "password",
                reason: "invalid_credentials",
                failedAttempts: user?.id
                  ? (res.rows[0]?.failed_attempts as number)
                  : undefined
              },
              ipAddress,
              userAgent,
              success: false
            });
          } catch (auditError) {
            console.error("Audit logging failed:", auditError);
          }

          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "no-match"
          });
        }

        // Check if account is locked before allowing login
        const lockoutCheck = await checkAccountLockout(user.id);
        if (lockoutCheck.isLocked) {
          const remainingSec = Math.ceil(
            (lockoutCheck.remainingMs || 0) / 1000
          );

          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Account is locked due to too many failed login attempts. Try again in ${Math.ceil(remainingSec / 60)} minutes.`
          });
        }

        if (
          !user.provider ||
          !["email", "google", "github", "apple"].includes(user.provider)
        ) {
          await conn.execute({
            sql: "UPDATE User SET provider = ? WHERE id = ?",
            args: ["email", user.id]
          });
        }

        // Reset failed attempts on successful login
        await resetFailedAttempts(user.id);

        // Reset rate limits on successful login
        await resetLoginRateLimits(email, clientIP);

        const isAdmin = user.id === env.ADMIN_ID;

        // Create session with Vinxi
        const userAgent = getUserAgent(getH3Event(ctx));
        await createAuthSession(
          getH3Event(ctx),
          user.id,
          isAdmin,
          rememberMe || false,
          clientIP,
          userAgent
        );

        // Set CSRF token for authenticated session
        setCSRFToken(getH3Event(ctx));

        // Log successful login (wrap in try-catch to ensure it never blocks auth flow)
        try {
          await logAuditEvent({
            userId: user.id,
            eventType: "auth.login.success",
            eventData: { method: "password", rememberMe: rememberMe || false },
            ipAddress: clientIP,
            userAgent,
            success: true
          });
        } catch (auditError) {
          console.error("Audit logging failed:", auditError);
        }

        return { success: true, message: "success" };
      } catch (error) {
        // Log the actual error for debugging
        console.error("emailPasswordLogin error:", error);
        console.error(
          "Error stack:",
          error instanceof Error ? error.stack : "no stack"
        );

        // Re-throw TRPCErrors as-is
        if (error instanceof TRPCError) {
          throw error;
        }

        // Wrap other errors
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred during login",
          cause: error
        });
      }
    }),

  requestEmailLinkLogin: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        rememberMe: z.boolean().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { email, rememberMe } = input;

      try {
        const requested = getCookie(getH3Event(ctx), "emailLoginLinkRequested");
        if (requested) {
          const expires = new Date(requested);
          const remaining = expires.getTime() - Date.now();
          if (remaining > 0) {
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: "countdown not expired"
            });
          }
        }

        const conn = ConnectionFactory();
        const res = await conn.execute({
          sql: "SELECT * FROM User WHERE email = ?",
          args: [email]
        });

        if (res.rows.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found"
          });
        }

        const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
        const token = await new SignJWT({
          email,
          rememberMe: rememberMe ?? false
        })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime(AUTH_CONFIG.EMAIL_LOGIN_LINK_EXPIRY)
          .sign(secret);

        const domain = env.VITE_DOMAIN || "https://freno.me";
        const htmlContent = `<html>
<head>
    <style>
        .center {
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            text-align: center;
            text-decoration: none;
            color: #ffffff;
            background-color: #007BFF;
            border-radius: 6px;
            transition: background-color 0.3s;
        }
        .button:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="center">
        <p>Click the button below to log in</p>
    </div>
    <br/>
    <div class="center">
        <a href="${domain}/api/auth/email-login-callback?email=${email}&token=${token}&rememberMe=${rememberMe}" class="button">Log In</a>
    </div>
    <div class="center">
        <p>You can ignore this if you did not request this email, someone may have requested it in error</p>
    </div>
</body>
</html>`;

        await sendEmail(email, "freno.me login link", htmlContent);

        const exp = new Date(Date.now() + COOLDOWN_TIMERS.EMAIL_LOGIN_LINK_MS);
        setCookie(
          getH3Event(ctx),
          "emailLoginLinkRequested",
          exp.toUTCString(),
          {
            maxAge: COOLDOWN_TIMERS.EMAIL_LOGIN_LINK_COOKIE_MAX_AGE,
            path: "/"
          }
        );

        return { success: true, message: "email sent" };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        if (
          error instanceof TimeoutError ||
          error instanceof NetworkError ||
          error instanceof APIError
        ) {
          console.error("Failed to send login email:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to send email. Please try again later."
          });
        }

        console.error("Email login link request failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred. Please try again."
        });
      }
    }),

  requestPasswordReset: publicProcedure
    .input(requestPasswordResetSchema)
    .mutation(async ({ input, ctx }) => {
      const { email } = input;

      // Apply rate limiting
      const clientIP = getClientIP(getH3Event(ctx));
      await rateLimitPasswordReset(clientIP, getH3Event(ctx));

      try {
        const requested = getCookie(getH3Event(ctx), "passwordResetRequested");
        if (requested) {
          const expires = new Date(requested);
          const remaining = expires.getTime() - Date.now();
          if (remaining > 0) {
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: "countdown not expired"
            });
          }
        }

        const conn = ConnectionFactory();
        const res = await conn.execute({
          sql: "SELECT * FROM User WHERE email = ?",
          args: [email]
        });

        if (res.rows.length === 0) {
          return { success: true, message: "email sent" };
        }

        const user = res.rows[0] as unknown as User;

        // Create password reset token (1 hour expiry, single-use)
        const { token } = await createPasswordResetToken(user.id);

        const domain = env.VITE_DOMAIN || "https://freno.me";
        const htmlContent = `<html>
<head>
    <style>
        .center {
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            text-align: center;
            text-decoration: none;
            color: #ffffff;
            background-color: #007BFF;
            border-radius: 6px;
            transition: background-color 0.3s;
        }
        .button:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="center">
        <p>Click the button below to reset password</p>
    </div>
    <br/>
    <div class="center">
        <a href="${domain}/login/password-reset?token=${token}" class="button">Reset Password</a>
    </div>
    <div class="center">
        <p>This link will expire in 1 hour and can only be used once.</p>
    </div>
    <div class="center">
        <p>You can ignore this if you did not request this email, someone may have requested it in error</p>
    </div>
</body>
</html>`;

        await sendEmail(email, "password reset", htmlContent);

        const exp = new Date(
          Date.now() + COOLDOWN_TIMERS.PASSWORD_RESET_REQUEST_MS
        );
        setCookie(
          getH3Event(ctx),
          "passwordResetRequested",
          exp.toUTCString(),
          {
            maxAge: COOLDOWN_TIMERS.PASSWORD_RESET_REQUEST_COOKIE_MAX_AGE,
            path: "/"
          }
        );

        // Log password reset request
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          userId: user.id,
          eventType: "auth.password.reset.request",
          eventData: { email },
          ipAddress,
          userAgent,
          success: true
        });

        return { success: true, message: "email sent" };
      } catch (error) {
        // Log failed password reset request (only if not rate limited)
        if (
          !(error instanceof TRPCError && error.code === "TOO_MANY_REQUESTS")
        ) {
          const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
          await logAuditEvent({
            eventType: "auth.password.reset.request",
            eventData: {
              email: input.email,
              reason: error instanceof TRPCError ? error.message : "unknown"
            },
            ipAddress,
            userAgent,
            success: false
          });
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        if (
          error instanceof TimeoutError ||
          error instanceof NetworkError ||
          error instanceof APIError
        ) {
          console.error("Failed to send password reset email:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to send email. Please try again later."
          });
        }

        console.error("Password reset request failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred. Please try again."
        });
      }
    }),

  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ input, ctx }) => {
      const { token, newPassword, newPasswordConfirmation } = input;

      // Schema already validates password match, but double check
      if (newPassword !== newPasswordConfirmation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password Mismatch"
        });
      }

      try {
        // Validate and consume the password reset token
        const tokenValidation = await validatePasswordResetToken(token);

        if (!tokenValidation) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid or expired reset token"
          });
        }

        const { userId, tokenId } = tokenValidation;

        const conn = ConnectionFactory();
        const passwordHash = await hashPassword(newPassword);

        const userRes = await conn.execute({
          sql: "SELECT provider FROM User WHERE id = ?",
          args: [userId]
        });

        if (userRes.rows.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found"
          });
        }

        const currentProvider = (userRes.rows[0] as any).provider;

        if (
          !currentProvider ||
          !["google", "github", "apple"].includes(currentProvider)
        ) {
          await conn.execute({
            sql: "UPDATE User SET password_hash = ?, provider = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?",
            args: [passwordHash, "email", userId]
          });
        } else {
          await conn.execute({
            sql: "UPDATE User SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?",
            args: [passwordHash, userId]
          });
        }

        // Mark token as used
        await markPasswordResetTokenUsed(tokenId);

        // Log successful password reset
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          userId: userId,
          eventType: "auth.password.reset.complete",
          eventData: {},
          ipAddress,
          userAgent,
          success: true
        });

        return { success: true, message: "success" };
      } catch (error) {
        // Log failed password reset
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          eventType: "auth.password.reset.complete",
          eventData: {
            reason: error instanceof TRPCError ? error.message : "unknown"
          },
          ipAddress,
          userAgent,
          success: false
        });

        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Password reset error:", error);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired reset token"
        });
      }
    }),

  resendEmailVerification: publicProcedure
    .input(requestPasswordResetSchema)
    .mutation(async ({ input, ctx }) => {
      const { email } = input;

      // Apply rate limiting
      const clientIP = getClientIP(getH3Event(ctx));
      await rateLimitEmailVerification(clientIP, getH3Event(ctx));

      try {
        const requested = getCookie(
          getH3Event(ctx),
          "emailVerificationRequested"
        );
        if (requested) {
          const time = parseInt(requested);
          const currentTime = Date.now();
          const difference = (currentTime - time) / 1000;

          if (difference * 1000 < COOLDOWN_TIMERS.EMAIL_VERIFICATION_MS) {
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message:
                "Please wait before requesting another verification email"
            });
          }
        }

        const conn = ConnectionFactory();
        const res = await conn.execute({
          sql: "SELECT * FROM User WHERE email = ?",
          args: [email]
        });

        if (res.rows.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found"
          });
        }

        const user = res.rows[0] as unknown as User;

        const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
        const token = await new SignJWT({ email })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime(AUTH_CONFIG.EMAIL_VERIFICATION_LINK_EXPIRY)
          .sign(secret);

        const domain = env.VITE_DOMAIN || "https://freno.me";
        const htmlContent = `<html>
<head>
    <style>
        .center {
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            text-align: center;
            text-decoration: none;
            color: #ffffff;
            background-color: #007BFF;
            border-radius: 6px;
            transition: background-color 0.3s;
        }
        .button:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="center">
        <p>Click the button below to verify email</p>
    </div>
    <br/>
    <div class="center">
        <a href="${domain}/api/auth/email-verification-callback?email=${email}&token=${token}" class="button">Verify Email</a>
    </div>
</body>
</html>`;

        await sendEmail(email, "freno.me email verification", htmlContent);

        setCookie(
          getH3Event(ctx),
          "emailVerificationRequested",
          Date.now().toString(),
          {
            maxAge: COOLDOWN_TIMERS.EMAIL_VERIFICATION_COOKIE_MAX_AGE,
            path: "/"
          }
        );

        // Log email verification request
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          userId: user.id,
          eventType: "auth.email.verify.request",
          eventData: { email },
          ipAddress,
          userAgent,
          success: true
        });

        return { success: true, message: "Verification email sent" };
      } catch (error) {
        // Log failed email verification request (only if not rate limited)
        if (
          !(error instanceof TRPCError && error.code === "TOO_MANY_REQUESTS")
        ) {
          const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
          await logAuditEvent({
            eventType: "auth.email.verify.request",
            eventData: {
              email: input.email,
              reason: error instanceof TRPCError ? error.message : "unknown"
            },
            ipAddress,
            userAgent,
            success: false
          });
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        if (
          error instanceof TimeoutError ||
          error instanceof NetworkError ||
          error instanceof APIError
        ) {
          console.error("Failed to send verification email:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to send email. Please try again later."
          });
        }

        console.error("Email verification request failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred. Please try again."
        });
      }
    }),

  refreshToken: publicProcedure
    .input(refreshTokenSchema)
    .mutation(async ({ ctx }) => {
      try {
        const event = getH3Event(ctx);

        // Step 1: Get current session from Vinxi
        const session = await getAuthSession(event);
        if (!session) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "No valid session found"
          });
        }

        // Step 2: Get client info for rotation
        const clientIP = getClientIP(event);
        const userAgent = getUserAgent(event);

        // Step 3: Rotate session (includes validation, breach detection, cookie update)
        const newSession = await rotateAuthSession(
          event,
          session,
          clientIP,
          userAgent
        );

        if (!newSession) {
          // Rotation failed - session invalid, reuse detected, or max rotations reached
          await invalidateAuthSession(event, session.sessionId);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Token refresh failed - please login again"
          });
        }

        // Step 4: Refresh CSRF token
        setCSRFToken(event);

        // Step 5: Opportunistic cleanup (serverless-friendly)
        import("~/server/token-cleanup")
          .then((module) => module.opportunisticCleanup())
          .catch((err) => console.error("Opportunistic cleanup failed:", err));

        return {
          success: true,
          message: "Token refreshed successfully"
        };
      } catch (error) {
        console.error("Token refresh error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Token refresh failed"
        });
      }
    }),

  signOut: publicProcedure.mutation(async ({ ctx }) => {
    try {
      // Step 1: Get current session
      const session = await getAuthSession(getH3Event(ctx));

      if (session) {
        // Step 2: Revoke entire token family (all devices)
        await revokeTokenFamily(session.tokenFamily, "user_logout");
        console.log(`Token family ${session.tokenFamily} revoked on signout`);

        // Step 3: Log signout event
        const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
        await logAuditEvent({
          userId: session.userId,
          eventType: "auth.logout",
          eventData: { sessionId: session.sessionId },
          ipAddress,
          userAgent,
          success: true
        });
      }
    } catch (e) {
      console.error("Error during signout:", e);
      // Continue with session clearing even if revocation fails
    }

    // Step 4: Clear Vinxi session (clears encrypted cookie)
    await invalidateAuthSession(getH3Event(ctx), "");

    return { success: true };
  }),

  // Admin endpoints for session management
  cleanupSessions: publicProcedure.mutation(async ({ ctx }) => {
    // Get user ID to check admin status
    const userId = ctx.userId;
    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required"
      });
    }

    // Import cleanup functions
    const { cleanupExpiredSessions, cleanupOrphanedReferences } =
      await import("~/server/token-cleanup");

    try {
      // Run cleanup
      const stats = await cleanupExpiredSessions();
      const orphansFixed = await cleanupOrphanedReferences();

      // Log admin action
      const { ipAddress, userAgent } = getAuditContext(getH3Event(ctx));
      await logAuditEvent({
        userId,
        eventType: "admin.session_cleanup",
        eventData: {
          sessionsDeleted: stats.totalDeleted,
          orphansFixed
        },
        ipAddress,
        userAgent,
        success: true
      });

      return {
        success: true,
        sessionsDeleted: stats.totalDeleted,
        expiredDeleted: stats.expiredDeleted,
        revokedDeleted: stats.revokedDeleted,
        orphansFixed
      };
    } catch (error) {
      console.error("Manual cleanup failed:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Cleanup failed"
      });
    }
  }),

  getSessionStats: publicProcedure.query(async ({ ctx }) => {
    // Get user ID to check admin status
    const userId = ctx.userId;
    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required"
      });
    }

    // Import stats function
    const { getSessionStats } = await import("~/server/token-cleanup");

    try {
      const stats = await getSessionStats();
      return stats;
    } catch (error) {
      console.error("Failed to get session stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve stats"
      });
    }
  })
});
