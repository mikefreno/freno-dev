// @refresh reload
import * as Sentry from "@sentry/solidstart";
import { mount, StartClient } from "@solidjs/start/client";

Sentry.init({
  dsn: "https://a7c36d42c2a023ed29dd5db76c079566@o4506630160187392.ingest.us.sentry.io/4511784457666560",
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/solidstart/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: []
  }
});

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

    if (now - lastReloadTime > RELOAD_WINDOW_MS) {
      sessionStorage.setItem(RELOAD_STORAGE_KEY, "0");
      sessionStorage.setItem(RELOAD_TIMESTAMP_KEY, now.toString());
      return true;
    }

    if (reloadCount >= MAX_RELOADS) {
      console.error(
        `Exceeded ${MAX_RELOADS} reload attempts in ${RELOAD_WINDOW_MS}ms. Stopping to prevent infinite loop.`
      );
      return false;
    }

    sessionStorage.setItem(RELOAD_STORAGE_KEY, (reloadCount + 1).toString());
    sessionStorage.setItem(RELOAD_TIMESTAMP_KEY, now.toString());
    return true;
  } catch (e) {
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

window.addEventListener("error", (event) => {
  if (
    event.message?.includes("Importing a module script failed") ||
    event.message?.includes("Failed to fetch dynamically imported module") ||
    event.message?.includes("error loading dynamically imported module")
  ) {
    event.preventDefault();
    handleChunkError("error event");
  }
});

window.addEventListener("unhandledrejection", (event) => {
  if (
    event.reason?.message?.includes("Importing a module script failed") ||
    event.reason?.message?.includes("Failed to fetch dynamically imported module") ||
    event.reason?.message?.includes("error loading dynamically imported module")
  ) {
    event.preventDefault();
    handleChunkError("unhandled rejection");
  }
});

window.addEventListener("load", () => {
  setTimeout(() => {
    sessionStorage.removeItem(RELOAD_STORAGE_KEY);
    sessionStorage.removeItem(RELOAD_TIMESTAMP_KEY);
  }, 2000);
});

mount(() => <StartClient />, document.getElementById("app")!);
