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
  const { getPrivilegeLevel, getUserID, ConnectionFactory } =
    await import("~/server/utils");
  const event = getRequestEvent()!;
  const privilegeLevel = await getPrivilegeLevel(event.nativeEvent);
  const userId = await getUserID(event.nativeEvent);

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
}
