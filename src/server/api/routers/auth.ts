import { createTRPCRouter, publicProcedure } from "../utils";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { v4 as uuidV4 } from "uuid";
import { env } from "~/env/server";
import { ConnectionFactory } from "~/server/utils";
import { SignJWT, jwtVerify } from "jose";
import { setCookie } from "vinxi/http";

// Helper to create JWT token
async function createJWT(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
  const token = await new SignJWT({ id: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("14d") // 14 days
    .sign(secret);
  return token;
}

// User type for database rows
interface User {
  id: string;
  email?: string;
  display_name?: string;
  provider?: string;
  image?: string;
  email_verified?: boolean;
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
              Accept: "application/json",
            },
            body: JSON.stringify({
              client_id: env.VITE_GITHUB_CLIENT_ID || env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
              client_secret: env.GITHUB_CLIENT_SECRET,
              code,
            }),
          },
        );
        const { access_token } = await tokenResponse.json();

        // Fetch user info from GitHub
        const userResponse = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `token ${access_token}`,
          },
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
          sameSite: "lax",
        });

        return {
          success: true,
          redirectTo: "/account",
        };
      } catch (error) {
        console.error("GitHub authentication failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "GitHub authentication failed",
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
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            code: code,
            client_id: env.VITE_GOOGLE_CLIENT_ID || env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: `${env.VITE_DOMAIN || env.NEXT_PUBLIC_DOMAIN}/api/auth/callback/google`,
            grant_type: "authorization_code",
          }),
        });

        const { access_token } = await tokenResponse.json();

        // Fetch user info from Google
        const userResponse = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          },
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
            image,
          ];
          await conn.execute({
            sql: insertQuery,
            args: insertParams,
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
          sameSite: "lax",
        });

        return {
          success: true,
          redirectTo: "/account",
        };
      } catch (error) {
        console.error("Google authentication failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Google authentication failed",
        });
      }
    }),

  // Email login route
  emailLogin: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        token: z.string(),
        rememberMe: z.boolean().optional(),
      }),
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
            message: "Email mismatch",
          });
        }

        const conn = ConnectionFactory();
        const query = `SELECT * FROM User WHERE email = ?`;
        const params = [email];
        const res = await conn.execute({ sql: query, args: params });

        if (!res.rows[0]) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
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
          sameSite: "lax",
        };

        if (rememberMe) {
          cookieOptions.maxAge = 60 * 60 * 24 * 14; // 14 days
        }
        // If rememberMe is false, cookie will be session-only (no maxAge)

        setCookie(ctx.event.nativeEvent, "userIDToken", userToken, cookieOptions);

        return {
          success: true,
          redirectTo: "/account",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Email login failed:", error);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication failed",
        });
      }
    }),

  // Email verification route
  emailVerification: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        token: z.string(),
      }),
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
            message: "Email mismatch",
          });
        }

        const conn = ConnectionFactory();
        const query = `UPDATE User SET email_verified = ? WHERE email = ?`;
        const params = [true, email];
        await conn.execute({ sql: query, args: params });

        return {
          success: true,
          message: "Email verification success, you may close this window",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Email verification failed:", error);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid token",
        });
      }
    }),
});