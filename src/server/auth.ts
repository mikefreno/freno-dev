import type { H3Event } from "vinxi/http";
import { OAuth2Client } from "google-auth-library";
import type { Row } from "@libsql/client/web";
import { env } from "~/env/server";
import { getAuthSession } from "./session-helpers";

/**
 * Check authentication status
 * Consolidates getUserID, getPrivilegeLevel, and checkAuthStatus into single function
 * @param event - H3Event
 * @returns Object with isAuthenticated, userId, and isAdmin flags
 */
export async function checkAuthStatus(event: H3Event): Promise<{
  isAuthenticated: boolean;
  userId: string | null;
  isAdmin: boolean;
}> {
  try {
    const session = await getAuthSession(event);

    if (!session || !session.userId) {
      return {
        isAuthenticated: false,
        userId: null,
        isAdmin: false
      };
    }

    return {
      isAuthenticated: true,
      userId: session.userId,
      isAdmin: session.isAdmin
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
 * Get user ID from session
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
      const { jwtVerify } = await import("jose");
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
