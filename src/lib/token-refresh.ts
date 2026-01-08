/**
 * Token Refresh Manager
 * Handles automatic token refresh before expiry
 *
 * Note: Since access tokens are httpOnly cookies, we can't read them from client JS.
 * Instead, we schedule refresh based on a fixed interval that aligns with token expiry.
 */

import { api } from "~/lib/api";
import { revalidateAuth } from "~/lib/auth-query";

// Token expiry durations (must match server config)
const ACCESS_TOKEN_EXPIRY_MS = import.meta.env.PROD
  ? 15 * 60 * 1000
  : 2 * 60 * 1000; // 15m prod, 2m dev
const REFRESH_THRESHOLD_MS = import.meta.env.PROD ? 2 * 60 * 1000 : 30 * 1000; // 2m prod, 30s dev

class TokenRefreshManager {
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private isRefreshing = false;
  private isStarted = false;
  private visibilityChangeHandler: (() => void) | null = null;
  private lastRefreshTime: number | null = null;

  /**
   * Start monitoring and auto-refresh
   * @param isAuthenticated - Whether user is currently authenticated (from server state)
   */
  start(isAuthenticated: boolean = true): void {
    console.log(
      `[Token Refresh] start() called - isStarted: ${this.isStarted}, isAuthenticated: ${isAuthenticated}, lastRefreshTime: ${this.lastRefreshTime}`
    );

    if (typeof window === "undefined") return; // Server-side bail

    if (this.isStarted) {
      console.log(
        "[Token Refresh] Already started, skipping duplicate start()"
      );
      return; // Already started, prevent duplicate listeners
    }

    if (!isAuthenticated) {
      console.log("[Token Refresh] Not authenticated, skipping start()");
      return; // No need to refresh if not authenticated
    }

    this.isStarted = true;
    this.lastRefreshTime = Date.now(); // Assume token was just issued
    console.log(
      `[Token Refresh] Manager started, lastRefreshTime set to ${this.lastRefreshTime}`
    );
    this.scheduleNextRefresh();

    // Re-check on visibility change (user returns to tab)
    this.visibilityChangeHandler = () => {
      if (document.visibilityState === "visible") {
        console.log(
          "[Token Refresh] Tab became visible, checking token status"
        );
        this.checkAndRefreshIfNeeded();
      }
    };
    document.addEventListener("visibilitychange", this.visibilityChangeHandler);
  }

  /**
   * Stop monitoring and clear timers
   */
  stop(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (this.visibilityChangeHandler) {
      document.removeEventListener(
        "visibilitychange",
        this.visibilityChangeHandler
      );
      this.visibilityChangeHandler = null;
    }

    this.isStarted = false;
    this.lastRefreshTime = null; // Reset refresh time on stop
  }

  /**
   * Reset the last refresh time (call after login or successful refresh)
   */
  reset(): void {
    console.log(
      `[Token Refresh] reset() called - isRefreshing: ${this.isRefreshing}`,
      new Error().stack?.split("\n").slice(1, 4).join("\n") // Show caller
    );

    // Don't reset if we're currently refreshing (prevents infinite loop)
    if (this.isRefreshing) {
      console.log("[Token Refresh] Skipping reset during active refresh");
      return;
    }

    console.log(
      `[Token Refresh] Resetting refresh timer, old lastRefreshTime: ${this.lastRefreshTime}`
    );
    this.lastRefreshTime = Date.now();
    console.log(`[Token Refresh] New lastRefreshTime: ${this.lastRefreshTime}`);

    if (this.isStarted) {
      this.scheduleNextRefresh();
    }
  }

  /**
   * Check if token needs refresh based on last refresh time
   */
  private checkAndRefreshIfNeeded(): void {
    if (!this.lastRefreshTime) {
      console.log("[Token Refresh] No refresh history, refreshing now");
      this.refreshNow();
      return;
    }

    const timeSinceRefresh = Date.now() - this.lastRefreshTime;
    const timeUntilExpiry = ACCESS_TOKEN_EXPIRY_MS - timeSinceRefresh;

    if (timeUntilExpiry <= REFRESH_THRESHOLD_MS) {
      // Token expired or about to expire - refresh immediately
      console.log(
        `[Token Refresh] Token likely expired (${Math.round(timeSinceRefresh / 1000)}s since last refresh), refreshing now`
      );
      this.refreshNow();
    } else {
      // Token still valid - reschedule
      console.log(
        `[Token Refresh] Token still valid (~${Math.round(timeUntilExpiry / 1000)}s remaining), rescheduling refresh`
      );
      this.scheduleNextRefresh();
    }
  }

  /**
   * Schedule next refresh based on token expiry
   */
  private scheduleNextRefresh(): void {
    // Clear existing timer but don't stop the manager
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (!this.lastRefreshTime) {
      console.log("[Token Refresh] No refresh history, cannot schedule");
      return;
    }

    const timeSinceRefresh = Date.now() - this.lastRefreshTime;
    const timeUntilExpiry = ACCESS_TOKEN_EXPIRY_MS - timeSinceRefresh;

    if (timeUntilExpiry <= REFRESH_THRESHOLD_MS) {
      console.warn(
        "[Token Refresh] Token likely expired, attempting refresh now"
      );
      this.refreshNow();
      return;
    }

    // Schedule refresh before expiry
    const timeUntilRefresh = Math.max(
      0,
      timeUntilExpiry - REFRESH_THRESHOLD_MS
    );

    console.log(
      `[Token Refresh] Scheduling refresh in ${Math.round(timeUntilRefresh / 1000)}s ` +
        `(~${Math.round(timeUntilExpiry / 1000)}s until expiry)`
    );

    this.refreshTimer = setTimeout(() => {
      this.refreshNow();
    }, timeUntilRefresh);
  }

  /**
   * Get rememberMe preference
   * Since we can't read httpOnly cookies, we default to true and let the server
   * determine the correct expiry based on the existing session
   */
  private getRememberMePreference(): boolean {
    // Default to true - server will use the correct expiry from the existing session
    return true;
  }

  /**
   * Perform token refresh immediately
   */
  async refreshNow(): Promise<boolean> {
    if (this.isRefreshing) {
      console.log("[Token Refresh] Refresh already in progress, skipping");
      return false;
    }

    this.isRefreshing = true;

    try {
      console.log("[Token Refresh] Refreshing access token...");

      // Preserve rememberMe state from existing session
      const rememberMe = this.getRememberMePreference();
      console.log(
        `[Token Refresh] Using rememberMe: ${rememberMe} (from refresh token cookie existence)`
      );

      const result = await Promise.race([
        api.auth.refreshToken.mutate({
          rememberMe
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Token refresh timeout")), 10000)
        )
      ]);

      if (result.success) {
        console.log("[Token Refresh] Token refreshed successfully");
        this.lastRefreshTime = Date.now(); // Update refresh time
        this.scheduleNextRefresh(); // Schedule next refresh

        // Revalidate auth AFTER scheduling to avoid race condition
        revalidateAuth(); // Refresh auth state after token refresh
        return true;
      } else {
        console.error("[Token Refresh] Token refresh failed:", result);
        this.handleRefreshFailure();
        return false;
      }
    } catch (error) {
      console.error("[Token Refresh] Token refresh error:", error);

      // Don't redirect on timeout - might be deployment in progress
      const isTimeout =
        error instanceof Error && error.message.includes("timeout");
      if (isTimeout) {
        console.warn(
          "[Token Refresh] Timeout - server might be deploying, will retry on schedule"
        );
        this.scheduleNextRefresh();
        return false;
      }

      this.handleRefreshFailure();
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Handle refresh failure (redirect to login)
   */
  private handleRefreshFailure(): void {
    console.warn("[Token Refresh] Token refresh failed, redirecting to login");

    // Store current URL for redirect after login
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== "/login") {
      sessionStorage.setItem("redirectAfterLogin", currentPath);
    }

    // Redirect to login
    window.location.href = "/login";
  }

  /**
   * Attempt immediate refresh (for page load when access token expired)
   * Always attempts refresh - server will reject if no refresh token exists
   * Returns true if refresh succeeded, false otherwise
   *
   * Note: We can't check for httpOnly refresh token from client JavaScript,
   * so we always attempt and let the server decide if token exists
   */
  async attemptInitialRefresh(): Promise<boolean> {
    console.log(
      "[Token Refresh] Attempting initial refresh (server will check for refresh token)"
    );

    // refreshNow() already calls revalidateAuth() on success
    return await this.refreshNow();
  }
}

// Singleton instance
export const tokenRefreshManager = new TokenRefreshManager();
