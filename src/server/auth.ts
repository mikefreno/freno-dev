import { getCookie, setCookie, type H3Event } from "vinxi/http";
import { jwtVerify } from "jose";
import { OAuth2Client } from "google-auth-library";
import type { Row } from "@libsql/client/web";
import { env } from "~/env/server";
import { ConnectionFactory } from "./database";

/**
 * Extract cookie value from H3Event (works in both production and tests)
 * Falls back to manual header parsing if vinxi's getCookie fails
 */
function getCookieValue(event: H3Event, name: string): string | undefined {
  try {
    // Try vinxi's getCookie first
    return getCookie(event, name);
  } catch (e) {
    // Fallback for tests: parse cookie header manually
    try {
      const cookieHeader =
        event.headers?.get("cookie") || event.node?.req?.headers?.cookie || "";
      const cookies = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .reduce(
          (acc, cookie) => {
            const [key, value] = cookie.split("=");
            if (key && value) acc[key] = value;
            return acc;
          },
          {} as Record<string, string>
        );
      return cookies[name];
    } catch {
      return undefined;
    }
  }
}

/**
 * Clear cookie (works in both production and tests)
 */
function clearCookie(event: H3Event, name: string): void {
  try {
    setCookie(event, name, "", {
      maxAge: 0,
      expires: new Date("2016-10-05")
    });
  } catch (e) {
    // In tests, setCookie might fail silently
  }
}

/**
 * Validate session and update last_used timestamp
 * @param sessionId - Session ID from JWT
 * @param userId - User ID from JWT
 * @returns true if session is valid, false otherwise
 */
async function validateSession(
  sessionId: string,
  userId: string
): Promise<boolean> {
  try {
    const conn = ConnectionFactory();
    const result = await conn.execute({
      sql: `SELECT revoked, expires_at FROM Session 
            WHERE id = ? AND user_id = ?`,
      args: [sessionId, userId]
    });

    if (result.rows.length === 0) {
      // Session doesn't exist
      return false;
    }

    const session = result.rows[0];

    // Check if session is revoked
    if (session.revoked === 1) {
      return false;
    }

    // Check if session is expired
    const expiresAt = new Date(session.expires_at as string);
    if (expiresAt < new Date()) {
      return false;
    }

    // Update last_used timestamp (fire and forget, don't block)
    conn
      .execute({
        sql: "UPDATE Session SET last_used = datetime('now') WHERE id = ?",
        args: [sessionId]
      })
      .catch((err) =>
        console.error("Failed to update session last_used:", err)
      );

    return true;
  } catch (e) {
    console.error("Session validation error:", e);
    return false;
  }
}

export async function getPrivilegeLevel(
  event: H3Event
): Promise<"anonymous" | "admin" | "user"> {
  try {
    const userIDToken = getCookieValue(event, "userIDToken");

    if (userIDToken) {
      try {
        const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
        const { payload } = await jwtVerify(userIDToken, secret);

        if (payload.id && typeof payload.id === "string") {
          // Validate session if session ID is present
          if (payload.sid) {
            const isValidSession = await validateSession(
              payload.sid as string,
              payload.id
            );
            if (!isValidSession) {
              clearCookie(event, "userIDToken");
              return "anonymous";
            }
          }

          return payload.id === env.ADMIN_ID ? "admin" : "user";
        }
      } catch (err) {
        // Silently clear invalid token (401s are expected for non-authenticated users)
        clearCookie(event, "userIDToken");
      }
    }
  } catch (e) {
    return "anonymous";
  }
  return "anonymous";
}

export async function getUserID(event: H3Event): Promise<string | null> {
  try {
    const userIDToken = getCookieValue(event, "userIDToken");

    if (userIDToken) {
      try {
        const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
        const { payload } = await jwtVerify(userIDToken, secret);

        if (payload.id && typeof payload.id === "string") {
          // Validate session if session ID is present
          if (payload.sid) {
            const isValidSession = await validateSession(
              payload.sid as string,
              payload.id
            );
            if (!isValidSession) {
              clearCookie(event, "userIDToken");
              return null;
            }
          }

          return payload.id;
        }
      } catch (err) {
        // Silently clear invalid token (401s are expected for non-authenticated users)
        clearCookie(event, "userIDToken");
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

export async function checkAuthStatus(event: H3Event): Promise<{
  isAuthenticated: boolean;
  userId: string | null;
}> {
  const userId = await getUserID(event);
  return {
    isAuthenticated: !!userId,
    userId
  };
}

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
      const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
      const { payload } = await jwtVerify(auth_token, secret);
      if (email !== payload.email) {
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
    const CLIENT_ID = process.env().VITE_GOOGLE_CLIENT_ID_MAGIC_DELVE;
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
