/**
 * Shared Auth Query
 * Single source of truth for authentication state across the app
 *
 * Security Model:
 * - Server query reads from httpOnly cookies (secure)
 * - Client context syncs from this query (UI convenience)
 * - Server endpoints always validate independently (never trust client)
 */

import { query, revalidate as revalidateKey } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";

export interface UserState {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  privilegeLevel: "admin" | "user" | "anonymous";
}

/**
 * Global auth state query - single source of truth
 * Called on server during SSR, cached by SolidStart router
 */
export const getUserState = query(async (): Promise<UserState> => {
  "use server";
  const { getPrivilegeLevel, getUserID } = await import("~/server/auth");
  const { ConnectionFactory } = await import("~/server/utils");
  const { getCookie, setCookie } = await import("vinxi/http");
  const event = getRequestEvent()!;

  let privilegeLevel = await getPrivilegeLevel(event.nativeEvent);
  let userId = await getUserID(event.nativeEvent);

  // If no userId but refresh token exists, attempt server-side token refresh
  // Use a flag cookie to prevent infinite loops (only try once per request)
  if (!userId) {
    const refreshToken = getCookie(event.nativeEvent, "refreshToken");
    const refreshAttempted = getCookie(event.nativeEvent, "_refresh_attempted");

    if (refreshToken && !refreshAttempted) {
      console.log(
        "[Auth-Query] Access token expired but refresh token exists, attempting server-side refresh"
      );

      // Set flag to prevent retry loops (expires immediately, just for this request)
      setCookie(event.nativeEvent, "_refresh_attempted", "1", {
        maxAge: 1,
        path: "/",
        httpOnly: true
      });

      try {
        // Import token rotation function
        const { attemptTokenRefresh } =
          await import("~/server/api/routers/auth");

        // Attempt to refresh tokens server-side
        const refreshed = await attemptTokenRefresh(
          event.nativeEvent,
          refreshToken
        );

        if (refreshed) {
          console.log("[Auth-Query] Server-side token refresh successful");
          // Re-check auth state with new tokens
          privilegeLevel = await getPrivilegeLevel(event.nativeEvent);
          userId = await getUserID(event.nativeEvent);
        } else {
          console.log("[Auth-Query] Server-side token refresh failed");
        }
      } catch (error) {
        console.error(
          "[Auth-Query] Error during server-side token refresh:",
          error
        );
      }
    } else if (refreshAttempted) {
      console.log(
        "[Auth-Query] Refresh already attempted this request, skipping"
      );
    }
  }

  if (!userId) {
    return {
      isAuthenticated: false,
      userId: null,
      email: null,
      displayName: null,
      emailVerified: false,
      privilegeLevel: "anonymous"
    };
  }

  const conn = ConnectionFactory();
  const res = await conn.execute({
    sql: "SELECT email, display_name, email_verified FROM User WHERE id = ?",
    args: [userId]
  });

  if (res.rows.length === 0) {
    return {
      isAuthenticated: false,
      userId: null,
      email: null,
      displayName: null,
      emailVerified: false,
      privilegeLevel: "anonymous"
    };
  }

  const user = res.rows[0] as any;

  return {
    isAuthenticated: true,
    userId,
    email: user.email ?? null,
    displayName: user.display_name ?? null,
    emailVerified: user.email_verified === 1,
    privilegeLevel
  };
}, "global-auth-state");

/**
 * Revalidate auth state globally
 * Call this after login, logout, token refresh, email verification
 */
export function revalidateAuth() {
  revalidateKey(getUserState.key);

  // Dispatch browser event to trigger UI updates (client-side only)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth-state-changed"));

    // Reset token refresh timer when auth state changes
    // This ensures the timer is synchronized with fresh tokens
    import("~/lib/token-refresh").then(({ tokenRefreshManager }) => {
      tokenRefreshManager.reset();
    });
  }
}
