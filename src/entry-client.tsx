// @refresh reload
import { mount, StartClient } from "@solidjs/start/client";

// Deployment version detection and chunk loading error handling
const RELOAD_STORAGE_KEY = "chunk-reload-count";
const RELOAD_TIMESTAMP_KEY = "chunk-reload-timestamp";
const MAX_RELOADS = 3;
const RELOAD_WINDOW_MS = 30000; // 30 seconds

/**
 * Check if we should attempt reload or show error
 * Prevents infinite reload loops by tracking reload attempts
 */
function shouldAttemptReload(): boolean {
  try {
    const now = Date.now();
    const reloadCount = parseInt(
      sessionStorage.getItem(RELOAD_STORAGE_KEY) || "0",
      10
    );
    const lastReloadTime = parseInt(
      sessionStorage.getItem(RELOAD_TIMESTAMP_KEY) || "0",
      10
    );

    // Reset counter if outside the time window
    if (now - lastReloadTime > RELOAD_WINDOW_MS) {
      sessionStorage.setItem(RELOAD_STORAGE_KEY, "0");
      sessionStorage.setItem(RELOAD_TIMESTAMP_KEY, now.toString());
      return true;
    }

    // Check if we've exceeded max reloads
    if (reloadCount >= MAX_RELOADS) {
      console.error(
        `Exceeded ${MAX_RELOADS} reload attempts in ${RELOAD_WINDOW_MS}ms. Stopping to prevent infinite loop.`
      );
      return false;
    }

    // Increment counter and allow reload
    sessionStorage.setItem(RELOAD_STORAGE_KEY, (reloadCount + 1).toString());
    sessionStorage.setItem(RELOAD_TIMESTAMP_KEY, now.toString());
    return true;
  } catch (e) {
    // If sessionStorage fails, allow reload but log error
    console.warn("Failed to access sessionStorage:", e);
    return true;
  }
}

/**
 * Handle chunk loading errors with smart reload logic
 */
function handleChunkError(source: string): void {
  console.warn(`[Chunk Error] ${source} - chunk load failure detected`);

  if (shouldAttemptReload()) {
    const reloadCount = sessionStorage.getItem(RELOAD_STORAGE_KEY) || "1";
    console.log(
      `[Chunk Error] Attempting reload (${reloadCount}/${MAX_RELOADS})...`
    );

    // Add small delay to prevent race conditions
    setTimeout(() => {
      window.location.reload();
    }, 100);
  } else {
    // Show user-friendly error message
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #f59e0b;
      color: #000;
      padding: 16px;
      text-align: center;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    errorDiv.innerHTML = `
      <strong>Update Required</strong><br>
      A new version is available. Please refresh the page manually or 
      <a href="javascript:void(0)" onclick="location.reload()" style="color: #000; text-decoration: underline; font-weight: bold;">click here</a>.
    `;
    document.body.appendChild(errorDiv);
  }
}

// Handle runtime chunk loading errors
window.addEventListener("error", (event) => {
  if (
    event.message?.includes("Importing a module script failed") ||
    event.message?.includes("Failed to fetch dynamically imported module")
  ) {
    event.preventDefault();
    handleChunkError("error event");
  }
});

// Handle promise-based chunk loading errors
window.addEventListener("unhandledrejection", (event) => {
  if (
    event.reason?.message?.includes("Importing a module script failed") ||
    event.reason?.message?.includes(
      "Failed to fetch dynamically imported module"
    )
  ) {
    event.preventDefault();
    handleChunkError("unhandled rejection");
  }
});

// Clear reload counter on successful page load
window.addEventListener("load", () => {
  // Only clear if we successfully loaded (we're past the critical chunk loading phase)
  setTimeout(() => {
    sessionStorage.removeItem(RELOAD_STORAGE_KEY);
    sessionStorage.removeItem(RELOAD_TIMESTAMP_KEY);
  }, 2000);
});

mount(() => <StartClient />, document.getElementById("app")!);
