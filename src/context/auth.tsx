/**
 * Auth Context Provider
 * Provides convenient access to auth state throughout the app
 *
 * Security Note:
 * - Context is for UI display only (showing/hiding buttons, user email, etc.)
 * - Server endpoints ALWAYS validate independently from cookies
 * - Never trust client-side state for authorization decisions
 */

import {
  createContext,
  useContext,
  createSignal,
  onMount,
  onCleanup,
  createEffect,
  Accessor,
  ParentComponent
} from "solid-js";
import { createAsync, revalidate } from "@solidjs/router";
import { getUserState, type UserState } from "~/lib/auth-query";

interface AuthContextType {
  /** Current user state (for UI display) */
  userState: Accessor<UserState | undefined>;

  /** Is user authenticated (convenience) */
  isAuthenticated: Accessor<boolean>;

  /** User email (null if not authenticated) */
  email: Accessor<string | null>;

  /** User display name (null if not set) */
  displayName: Accessor<string | null>;

  /** User ID (null if not authenticated) */
  userId: Accessor<string | null>;

  /** Is user admin (for UI display only - server still validates) */
  isAdmin: Accessor<boolean>;

  /** Is email verified */
  isEmailVerified: Accessor<boolean>;

  /** Refresh auth state from server */
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType>();

export const AuthProvider: ParentComponent = (props) => {
  // Get server state using createAsync which works with cache()
  const serverAuth = createAsync(() => getUserState(), { deferStream: true });

  const refreshAuth = () => {
    revalidate(["user-auth-state"]);
  };

  // Convenience accessors with safe defaults - MUST BE DEFINED BEFORE onMount
  const isAuthenticated = () => serverAuth()?.isAuthenticated ?? false;
  const email = () => serverAuth()?.email ?? null;
  const displayName = () => serverAuth()?.displayName ?? null;
  const userId = () => serverAuth()?.userId ?? null;
  const isAdmin = () => serverAuth()?.isAdmin ?? false;
  const isEmailVerified = () => serverAuth()?.emailVerified ?? false;

  // Server handles all token refresh logic
  // Client just displays the current auth state from server

  onMount(() => {
    if (typeof window === "undefined") return;

    const handleAuthRefresh = () => {
      console.log("[AuthContext] Received auth refresh event");
      refreshAuth();
    };

    window.addEventListener("auth-state-changed", handleAuthRefresh);

    onCleanup(() => {
      window.removeEventListener("auth-state-changed", handleAuthRefresh);
    });
  });

  const value: AuthContextType = {
    userState: serverAuth,
    isAuthenticated,
    email,
    displayName,
    userId,
    isAdmin,
    isEmailVerified,
    refreshAuth
  };

  return (
    <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
  );
};

/**
 * Hook to access auth state anywhere in the app
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isAuthenticated, email, refreshAuth } = useAuth();
 *
 *   return (
 *     <Show when={isAuthenticated()}>
 *       <p>Welcome, {email()}!</p>
 *       <button onClick={() => refreshAuth()}>Refresh</button>
 *     </Show>
 *   );
 * }
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
