/**
 * Token Refresh Manager
 * Handles automatic token refresh before expiry
 */

import { api } from "~/lib/api";
import { getClientCookie } from "~/lib/cookies.client";
import { getTimeUntilExpiry } from "~/lib/client-utils";
import { revalidateAuth } from "~/lib/auth-query";

class TokenRefreshManager {
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private isRefreshing = false;
  private refreshThresholdMs = 2 * 60 * 1000; // Refresh 2 minutes before expiry
  private isStarted = false;
  private visibilityChangeHandler: (() => void) | null = null;

  /**
   * Start monitoring token and auto-refresh before expiry
   */
  start(): void {
    if (typeof window === "undefined") return; // Server-side bail
    if (this.isStarted) return; // Already started, prevent duplicate listeners

    this.isStarted = true;
    this.scheduleNextRefresh();

    // Re-check on visibility change (user returns to tab)
    this.visibilityChangeHandler = () => {
      if (document.visibilityState === "visible") {
        this.scheduleNextRefresh();
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
  }

  /**
   * Schedule next refresh based on token expiry
   */
  private scheduleNextRefresh(): void {
    this.stop(); // Clear existing timer

    const token = getClientCookie("userIDToken");
    if (!token) {
      // No token found - user not logged in, nothing to refresh
      return;
    }

    const timeUntilExpiry = getTimeUntilExpiry(token);
    if (!timeUntilExpiry) {
      console.warn("Token expired or invalid, attempting refresh now");
      this.refreshNow();
      return;
    }

    // Schedule refresh before expiry
    const timeUntilRefresh = Math.max(
      0,
      timeUntilExpiry - this.refreshThresholdMs
    );

    console.log(
      `[Token Refresh] Token expires in ${Math.round(timeUntilExpiry / 1000)}s, ` +
        `scheduling refresh in ${Math.round(timeUntilRefresh / 1000)}s`
    );

    this.refreshTimer = setTimeout(() => {
      this.refreshNow();
    }, timeUntilRefresh);
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

      const result = await api.auth.refreshToken.mutate({
        rememberMe: false // Maintain existing rememberMe state
      });

      if (result.success) {
        console.log("[Token Refresh] Token refreshed successfully");
        revalidateAuth(); // Refresh auth state after token refresh
        this.scheduleNextRefresh(); // Schedule next refresh
        return true;
      } else {
        console.error("[Token Refresh] Token refresh failed:", result);
        this.handleRefreshFailure();
        return false;
      }
    } catch (error) {
      console.error("[Token Refresh] Token refresh error:", error);
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
}

// Singleton instance
export const tokenRefreshManager = new TokenRefreshManager();

/**
 * Manually trigger token refresh (can be called from UI)
 * @returns Promise<boolean> success status
 */
export async function manualRefresh(): Promise<boolean> {
  return tokenRefreshManager.refreshNow();
}
