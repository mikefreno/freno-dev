import { createTRPCRouter, publicProcedure } from "../utils";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { v4 as uuidV4 } from "uuid";
import { env } from "~/env/server";
import { ConnectionFactory, hashPassword, checkPassword } from "~/server/utils";
import { SignJWT, jwtVerify } from "jose";
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

async function createJWT(
  userId: string,
  expiresIn: string = "14d"
): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
  const token = await new SignJWT({ id: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .sign(secret);
  return token;
}

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
        timeout: 15000
      });

      await checkResponse(response);
      return response;
    },
    {
      maxRetries: 2,
      retryDelay: 1000
    }
  );
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
            timeout: 15000
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
            timeout: 15000
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
            timeout: 15000
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

        const token = await createJWT(userId);

        setCookie(ctx.event.nativeEvent, "userIDToken", token, {
          maxAge: 60 * 60 * 24 * 14, // 14 days
          path: "/",
          httpOnly: true,
          secure: env.NODE_ENV === "production",
          sameSite: "lax"
        });

        return {
          success: true,
          redirectTo: "/account"
        };
      } catch (error) {
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
            timeout: 15000
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
            timeout: 15000
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

        const token = await createJWT(userId);

        setCookie(ctx.event.nativeEvent, "userIDToken", token, {
          maxAge: 60 * 60 * 24 * 14, // 14 days
          path: "/",
          httpOnly: true,
          secure: env.NODE_ENV === "production",
          sameSite: "lax"
        });

        return {
          success: true,
          redirectTo: "/account"
        };
      } catch (error) {
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

        const userToken = await createJWT(userId);

        const cookieOptions: any = {
          path: "/",
          httpOnly: true,
          secure: env.NODE_ENV === "production",
          sameSite: "lax"
        };

        if (rememberMe) {
          cookieOptions.maxAge = 60 * 60 * 24 * 14;
        }

        setCookie(
          ctx.event.nativeEvent,
          "userIDToken",
          userToken,
          cookieOptions
        );

        return {
          success: true,
          redirectTo: "/account"
        };
      } catch (error) {
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
    .mutation(async ({ input }) => {
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
        const query = `UPDATE User SET email_verified = ? WHERE email = ?`;
        const params = [true, email];
        await conn.execute({ sql: query, args: params });

        return {
          success: true,
          message: "Email verification success, you may close this window"
        };
      } catch (error) {
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

        const token = await createJWT(userId);

        setCookie(ctx.event.nativeEvent, "userIDToken", token, {
          maxAge: 60 * 60 * 24 * 14, // 14 days
          path: "/",
          httpOnly: true,
          secure: env.NODE_ENV === "production",
          sameSite: "lax"
        });

        return { success: true, message: "success" };
      } catch (e) {
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
      const { email, password, rememberMe } = input;

      const conn = ConnectionFactory();
      const res = await conn.execute({
        sql: "SELECT * FROM User WHERE email = ?",
        args: [email]
      });

      if (res.rows.length === 0) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "no-match"
        });
      }

      const user = res.rows[0] as unknown as User;

      if (!user.password_hash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "no-match"
        });
      }

      const passwordMatch = await checkPassword(password, user.password_hash);

      if (!passwordMatch) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "no-match"
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

      const expiresIn = rememberMe ? "14d" : "12h";
      const token = await createJWT(user.id, expiresIn);

      const cookieOptions: any = {
        path: "/",
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax"
      };

      if (rememberMe) {
        cookieOptions.maxAge = 60 * 60 * 24 * 14; // 14 days
      }

      setCookie(ctx.event.nativeEvent, "userIDToken", token, cookieOptions);

      return { success: true, message: "success" };
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
        const requested = getCookie(
          ctx.event.nativeEvent,
          "emailLoginLinkRequested"
        );
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
          .setExpirationTime("15m")
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

        const exp = new Date(Date.now() + 2 * 60 * 1000);
        setCookie(
          ctx.event.nativeEvent,
          "emailLoginLinkRequested",
          exp.toUTCString(),
          {
            maxAge: 2 * 60,
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

      try {
        const requested = getCookie(
          ctx.event.nativeEvent,
          "passwordResetRequested"
        );
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

        const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
        const token = await new SignJWT({ id: user.id })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("15m")
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
        <p>Click the button below to reset password</p>
    </div>
    <br/>
    <div class="center">
        <a href="${domain}/login/password-reset?token=${token}" class="button">Reset Password</a>
    </div>
    <div class="center">
        <p>You can ignore this if you did not request this email, someone may have requested it in error</p>
    </div>
</body>
</html>`;

        await sendEmail(email, "password reset", htmlContent);

        const exp = new Date(Date.now() + 5 * 60 * 1000);
        setCookie(
          ctx.event.nativeEvent,
          "passwordResetRequested",
          exp.toUTCString(),
          {
            maxAge: 5 * 60,
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
        const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
        const { payload } = await jwtVerify(token, secret);

        if (!payload.id || typeof payload.id !== "string") {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "bad token"
          });
        }

        const conn = ConnectionFactory();
        const passwordHash = await hashPassword(newPassword);

        const userRes = await conn.execute({
          sql: "SELECT provider FROM User WHERE id = ?",
          args: [payload.id]
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
            sql: "UPDATE User SET password_hash = ?, provider = ? WHERE id = ?",
            args: [passwordHash, "email", payload.id]
          });
        } else {
          await conn.execute({
            sql: "UPDATE User SET password_hash = ? WHERE id = ?",
            args: [passwordHash, payload.id]
          });
        }

        setCookie(ctx.event.nativeEvent, "emailToken", "", {
          maxAge: 0,
          path: "/"
        });
        setCookie(ctx.event.nativeEvent, "userIDToken", "", {
          maxAge: 0,
          path: "/"
        });

        return { success: true, message: "success" };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Password reset error:", error);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "token expired"
        });
      }
    }),

  resendEmailVerification: publicProcedure
    .input(requestPasswordResetSchema)
    .mutation(async ({ input, ctx }) => {
      const { email } = input;

      try {
        const requested = getCookie(
          ctx.event.nativeEvent,
          "emailVerificationRequested"
        );
        if (requested) {
          const time = parseInt(requested);
          const currentTime = Date.now();
          const difference = (currentTime - time) / (1000 * 60);

          if (difference < 15) {
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

        const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
        const token = await new SignJWT({ email })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("15m")
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
          ctx.event.nativeEvent,
          "emailVerificationRequested",
          Date.now().toString(),
          {
            maxAge: 15 * 60,
            path: "/"
          }
        );

        return { success: true, message: "Verification email sent" };
      } catch (error) {
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

  signOut: publicProcedure.mutation(async ({ ctx }) => {
    setCookie(ctx.event.nativeEvent, "userIDToken", "", {
      maxAge: 0,
      path: "/"
    });
    setCookie(ctx.event.nativeEvent, "emailToken", "", {
      maxAge: 0,
      path: "/"
    });

    return { success: true };
  })
});
