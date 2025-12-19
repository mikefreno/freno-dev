import { getCookie, setCookie, type H3Event } from "vinxi/http";
import { jwtVerify } from "jose";
import { OAuth2Client } from "google-auth-library";
import type { Row } from "@libsql/client/web";
import { env } from "~/env/server";

export async function getPrivilegeLevel(
  event: H3Event
): Promise<"anonymous" | "admin" | "user"> {
  try {
    const userIDToken = getCookie(event, "userIDToken");

    if (userIDToken) {
      try {
        const secret = new TextEncoder().encode(env().JWT_SECRET_KEY);
        const { payload } = await jwtVerify(userIDToken, secret);

        if (payload.id && typeof payload.id === "string") {
          return payload.id === env().ADMIN_ID ? "admin" : "user";
        }
      } catch (err) {
        console.log("Failed to authenticate token.");
        setCookie(event, "userIDToken", "", {
          maxAge: 0,
          expires: new Date("2016-10-05")
        });
      }
    }
  } catch (e) {
    return "anonymous";
  }
  return "anonymous";
}

export async function getUserID(event: H3Event): Promise<string | null> {
  try {
    const userIDToken = getCookie(event, "userIDToken");

    if (userIDToken) {
      try {
        const secret = new TextEncoder().encode(env().JWT_SECRET_KEY);
        const { payload } = await jwtVerify(userIDToken, secret);

        if (payload.id && typeof payload.id === "string") {
          return payload.id;
        }
      } catch (err) {
        console.log("Failed to authenticate token.");
        setCookie(event, "userIDToken", "", {
          maxAge: 0,
          expires: new Date("2016-10-05")
        });
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
      const secret = new TextEncoder().encode(env().JWT_SECRET_KEY);
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
