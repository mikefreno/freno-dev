import { createTRPCRouter, publicProcedure } from "../utils";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { v4 as uuidV4 } from "uuid";
import { env } from "~/env/server";
import { ConnectionFactory, hashPassword, checkPassword } from "~/server/utils";
import { SignJWT, jwtVerify } from "jose";
import { setCookie, getCookie } from "vinxi/http";
import type { User } from "~/types/user";
import {
  emailSchema,
  passwordSchema,
  registrationSchema,
  loginSchema,
  passwordResetSchema
} from "~/server/api/schemas/validation";

// Helper to create JWT token
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

// Helper to send email via Brevo/SendInBlue
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

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify(sendinblueData)
  });

  if (!response.ok) {
    throw new Error("Failed to send email");
  }

  return response;
}

export const authRouter = createTRPCRouter({
  // GitHub callback route
  githubCallback: publicProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { code } = input;

      try {
        // Exchange code for access token
        const tokenResponse = await fetch(
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
            })
          }
        );
        const { access_token } = await tokenResponse.json();

        // Fetch user info from GitHub
        const userResponse = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `token ${access_token}`
          }
        });

        const user = await userResponse.json();
        const login = user.login;
        const conn = ConnectionFactory();

        // Check if user exists
        const query = `SELECT * FROM User WHERE provider = ? AND display_name = ?`;
        const params = ["github", login];
        const res = await conn.execute({ sql: query, args: params });

        let userId: string;

        if (res.rows[0]) {
          // User exists
          userId = (res.rows[0] as unknown as User).id;
        } else {
          // Create new user
          const icon = user.avatar_url;
          const email = user.email;
          userId = uuidV4();

          const insertQuery = `INSERT INTO User (id, email, display_name, provider, image) VALUES (?, ?, ?, ?, ?)`;
          const insertParams = [userId, email, login, "github", icon];
          await conn.execute({ sql: insertQuery, args: insertParams });
        }

        // Create JWT token
        const token = await createJWT(userId);

        // Set cookie
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
        console.error("GitHub authentication failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "GitHub authentication failed"
        });
      }
    }),

  // Google callback route
  googleCallback: publicProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { code } = input;

      try {
        // Exchange code for access token
        const tokenResponse = await fetch(
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
            })
          }
        );

        const { access_token } = await tokenResponse.json();

        // Fetch user info from Google
        const userResponse = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${access_token}`
            }
          }
        );

        const userData = await userResponse.json();
        const name = userData.name;
        const image = userData.picture;
        const email = userData.email;
        const email_verified = userData.email_verified;

        const conn = ConnectionFactory();

        // Check if user exists
        const query = `SELECT * FROM User WHERE provider = ? AND email = ?`;
        const params = ["google", email];
        const res = await conn.execute({ sql: query, args: params });

        let userId: string;

        if (res.rows[0]) {
          // User exists
          userId = (res.rows[0] as unknown as User).id;
        } else {
          // Create new user
          userId = uuidV4();

          const insertQuery = `INSERT INTO User (id, email, email_verified, display_name, provider, image) VALUES (?, ?, ?, ?, ?, ?)`;
          const insertParams = [
            userId,
            email,
            email_verified,
            name,
            "google",
            image
          ];
          await conn.execute({
            sql: insertQuery,
            args: insertParams
          });
        }

        // Create JWT token
        const token = await createJWT(userId);

        // Set cookie
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
        console.error("Google authentication failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Google authentication failed"
        });
      }
    }),

  // Email login route
  emailLogin: publicProcedure
    .input(
      z.object({
        email: emailSchema,
        token: z.string(),
        rememberMe: z.boolean().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { email, token, rememberMe } = input;

      try {
        // Verify JWT token
        const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
        const { payload } = await jwtVerify(token, secret);

        // Check if email matches
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

        // Create JWT token
        const userToken = await createJWT(userId);

        // Set cookie based on rememberMe flag
        const cookieOptions: any = {
          path: "/",
          httpOnly: true,
          secure: env.NODE_ENV === "production",
          sameSite: "lax"
        };

        if (rememberMe) {
          cookieOptions.maxAge = 60 * 60 * 24 * 14; // 14 days
        }
        // If rememberMe is false, cookie will be session-only (no maxAge)

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

  // Email verification route
  emailVerification: publicProcedure
    .input(
      z.object({
        email: emailSchema,
        token: z.string()
      })
    )
    .mutation(async ({ input }) => {
      const { email, token } = input;

      try {
        // Verify JWT token
        const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
        const { payload } = await jwtVerify(token, secret);

        // Check if email matches
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

  // Email/password registration
  emailRegistration: publicProcedure
    .input(registrationSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input;

      const passwordHash = await hashPassword(password);
      const conn = ConnectionFactory();
      const userId = uuidV4();

      try {
        await conn.execute({
          sql: "INSERT INTO User (id, email, password_hash, provider) VALUES (?, ?, ?, ?)",
          args: [userId, email, passwordHash, "email"]
        });

        // Create JWT token
        const token = await createJWT(userId);

        // Set cookie
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

  // Email/password login
  emailPasswordLogin: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, password, rememberMe } = input;

      const conn = ConnectionFactory();
      const res = await conn.execute({
        sql: "SELECT * FROM User WHERE email = ? AND provider = ?",
        args: [email, "email"]
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

      // Create JWT token with appropriate expiry
      const expiresIn = rememberMe ? "14d" : "12h";
      const token = await createJWT(user.id, expiresIn);

      // Set cookie
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

  // Request email login link
  requestEmailLinkLogin: publicProcedure
    .input(
      z.object({
        email: emailSchema,
        rememberMe: z.boolean().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { email, rememberMe } = input;

      // Check rate limiting
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

      // Create JWT token for email link (15min expiry)
      const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
      const token = await new SignJWT({
        email,
        rememberMe: rememberMe ?? false
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("15m")
        .sign(secret);

      // Send email
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

      // Set rate limit cookie (2 minutes)
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
    }),

  // Request password reset
  requestPasswordReset: publicProcedure
    .input(z.object({ email: emailSchema }))
    .mutation(async ({ input, ctx }) => {
      const { email } = input;

      // Check rate limiting
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
        // Don't reveal if user exists
        return { success: true, message: "email sent" };
      }

      const user = res.rows[0] as unknown as User;

      // Create JWT token with user ID (15min expiry)
      const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
      const token = await new SignJWT({ id: user.id })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("15m")
        .sign(secret);

      // Send email
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

      // Set rate limit cookie (5 minutes)
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
    }),

  // Reset password with token
  resetPassword: publicProcedure
    .input(passwordResetSchema)
    .mutation(async ({ input, ctx }) => {
      const { token, newPassword } = input;

      try {
        // Verify JWT token
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

        await conn.execute({
          sql: "UPDATE User SET password_hash = ? WHERE id = ?",
          args: [passwordHash, payload.id]
        });

        // Clear any session cookies
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

  // Resend email verification
  resendEmailVerification: publicProcedure
    .input(z.object({ email: emailSchema }))
    .mutation(async ({ input, ctx }) => {
      const { email } = input;

      // Check rate limiting
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
            message: "Please wait before requesting another verification email"
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

      // Create JWT token (15min expiry)
      const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
      const token = await new SignJWT({ email })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("15m")
        .sign(secret);

      // Send email
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

      // Set rate limit cookie
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
    }),

  // Sign out
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
