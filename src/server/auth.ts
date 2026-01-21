import type { H3Event } from "vinxi/http";
import { getCookie, setCookie } from "vinxi/http";
import { OAuth2Client } from "google-auth-library";
import type { Row } from "@libsql/client/web";
import { SignJWT, jwtVerify } from "jose";
import { env } from "~/env/server";
import { ConnectionFactory } from "./database";
import { AUTH_CONFIG, expiryToSeconds, getAccessTokenExpiry } from "~/config";

export const authCookieName = "auth_token";

type AuthTokenPayload = {
  sub: string;
  email: string | null;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
};

function getAuthCookieOptions(rememberMe: boolean) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: rememberMe
      ? expiryToSeconds(AUTH_CONFIG.ACCESS_TOKEN_EXPIRY_LONG)
      : undefined
  };
}

function getAuthHeaderToken(event: H3Event): string | null {
  const requestHeader = event.request?.headers?.get?.("authorization") || null;
  const eventHeader = event.headers
    ? typeof (event.headers as any).get === "function"
      ? (event.headers as any).get("authorization")
      : (event.headers as any).authorization
    : null;
  const nodeHeader = event.node?.req?.headers?.authorization || null;
  const header = requestHeader || eventHeader || nodeHeader || null;
  if (!header) return null;
  const normalized = header.trim();
  if (!normalized.toLowerCase().startsWith("bearer ")) return null;
  return normalized.slice("Bearer ".length).trim();
}

export function getAuthTokenFromEvent(event: H3Event): string | null {
  return getCookie(event, authCookieName) || getAuthHeaderToken(event);
}

export async function verifyAuthToken(
  token: string
): Promise<AuthTokenPayload | null> {
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) {
      return null;
    }
    return {
      sub: payload.sub as string,
      email: (payload.email as string | null) ?? null,
      isAdmin: (payload.isAdmin as boolean) ?? false,
      iat: payload.iat,
      exp: payload.exp
    };
  } catch (error) {
    console.error("Auth token verification failed:", error);
    return null;
  }
}

export async function getAuthPayloadFromEvent(
  event: H3Event
): Promise<AuthTokenPayload | null> {
  const token = getAuthTokenFromEvent(event);
  if (!token) return null;
  return verifyAuthToken(token);
}

export async function issueAuthToken({
  event,
  userId,
  rememberMe
}: {
  event: H3Event;
  userId: string;
  rememberMe: boolean;
}): Promise<string> {
  const conn = ConnectionFactory();
  const result = await conn.execute({
    sql: "SELECT email, is_admin FROM User WHERE id = ?",
    args: [userId]
  });

  if (result.rows.length === 0) {
    throw new Error("User not found");
  }

  const row = result.rows[0] as { email?: string | null; is_admin?: number };
  const isAdmin = row.is_admin === 1;
  const email = row.email ?? null;

  const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
  const expiry = rememberMe
    ? AUTH_CONFIG.ACCESS_TOKEN_EXPIRY_LONG
    : getAccessTokenExpiry();

  const token = await new SignJWT({ email, isAdmin })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(secret);

  setCookie(event, authCookieName, token, getAuthCookieOptions(rememberMe));

  return token;
}

export function clearAuthToken(event: H3Event): void {
  setCookie(event, authCookieName, "", {
    ...getAuthCookieOptions(true),
    maxAge: 0
  });
  setCookie(event, "csrf-token", "", {
    httpOnly: false,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

/**
 * Check authentication status
 * @param event - H3Event
 * @returns Object with isAuthenticated, userId, and isAdmin flags
 */
export async function checkAuthStatus(event: H3Event): Promise<{
  isAuthenticated: boolean;
  userId: string | null;
  isAdmin: boolean;
}> {
  try {
    const payload = await getAuthPayloadFromEvent(event);
    if (!payload) {
      return {
        isAuthenticated: false,
        userId: null,
        isAdmin: false
      };
    }

    return {
      isAuthenticated: true,
      userId: payload.sub,
      isAdmin: payload.isAdmin
    };
  } catch (error) {
    console.error("Auth check error:", error);
    return {
      isAuthenticated: false,
      userId: null,
      isAdmin: false
    };
  }
}

/**
 * Get user ID from auth token
 * @param event - H3Event
 * @returns User ID or null if not authenticated
 */
export async function getUserID(event: H3Event): Promise<string | null> {
  const auth = await checkAuthStatus(event);
  return auth.userId;
}

/**
 * Validate Lineage mobile app authentication request
 * Supports email (JWT), Apple (user string), and Google (OAuth token) providers
 * @param auth_token - Authentication token from the app
 * @param userRow - User database row
 * @returns true if valid, false otherwise
 */
export async function validateLineageRequest({
  auth_token,
  userRow
}: {
  auth_token: string;
  userRow: Row;
}): Promise<boolean> {
  const { provider, email } = userRow;
  if (provider === "email") {
    try {
      const payload = await verifyAuthToken(auth_token);
      if (!payload || email !== payload.email) {
        return false;
      }
    } catch (err) {
      return false;
    }
  } else if (provider == "apple") {
    const { apple_user_string } = userRow;
    if (apple_user_string !== auth_token) {
      return false;
    }
  } else if (provider == "google") {
    const CLIENT_ID = env.VITE_GOOGLE_CLIENT_ID_MAGIC_DELVE;
    if (!CLIENT_ID) {
      console.error("Missing VITE_GOOGLE_CLIENT_ID_MAGIC_DELVE");
      return false;
    }
    const client = new OAuth2Client(CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: auth_token,
      audience: CLIENT_ID
    });
    if (ticket.getPayload()?.email !== email) {
      return false;
    }
  } else {
    return false;
  }
  return true;
}
