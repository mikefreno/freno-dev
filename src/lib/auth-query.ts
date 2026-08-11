import { query, revalidate as revalidateKey } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";

export interface UserState {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  isAdmin: boolean;
}

/**
 * Get current user state from server
 * Uses cache() to ensure single execution per request and proper SSR hydration
 */
export const getUserState = query(async (): Promise<UserState> => {
  "use server";
  const { checkAuthStatus } = await import("~/server/auth");
  const { ConnectionFactory } = await import("~/server/utils");

  const event = getRequestEvent();

  // Safety check: if no event, we're not in a request context
  if (!event || !event.nativeEvent) {
    return {
      isAuthenticated: false,
      userId: null,
      email: null,
      displayName: null,
      emailVerified: false,
      isAdmin: false
    };
  }

  const auth = await checkAuthStatus(event.nativeEvent);

  if (!auth.isAuthenticated || !auth.userId) {
    return {
      isAuthenticated: false,
      userId: null,
      email: null,
      displayName: null,
      emailVerified: false,
      isAdmin: false
    };
  }

  const conn = ConnectionFactory();
  const res = await conn.execute({
    sql: "SELECT email, display_name, email_verified FROM User WHERE id = ?",
    args: [auth.userId]
  });

  if (res.rows.length === 0) {
    return {
      isAuthenticated: false,
      userId: null,
      email: null,
      displayName: null,
      emailVerified: false,
      isAdmin: false
    };
  }

  const user = res.rows[0] as any;

  return {
    isAuthenticated: true,
    userId: auth.userId,
    email: user.email ?? null,
    displayName: user.display_name ?? null,
    emailVerified: user.email_verified === 1,
    isAdmin: auth.isAdmin
  };
}, "user-auth-state");

/**
 * Revalidate auth state globally
 * Call this after login, logout, token refresh, email verification
 */
export function revalidateAuth() {
  revalidateKey("user-auth-state");

  // Dispatch event to trigger UI updates (client-side only)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth-state-changed"));
  }
}
