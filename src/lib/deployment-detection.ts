/**
 * Deployment Detection System
 * Detects when the app has been updated on the server
 */

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const VERSION_STORAGE_KEY = "app-version-hash";

/**
 * Get a simple hash from the current page HTML
 * This changes when deployment happens
 */
function getCurrentVersionHash(): string {
  try {
    const scripts = Array.from(document.querySelectorAll("script[src]"))
      .map((s) => (s as HTMLScriptElement).src)
      .filter((src) => src.includes("/_build/"))
      .sort()
      .join(",");

    let hash = 0;
    for (let i = 0; i < scripts.length; i++) {
      const char = scripts.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  } catch (e) {
    console.warn("[Version Detection] Failed to get version hash:", e);
    return "";
  }
}

/**
 * Check if a new version is available
 * Returns true if new version detected
 */
async function checkForNewVersion(): Promise<boolean> {
  try {
    const response = await fetch(window.location.pathname, {
      method: "HEAD",
      cache: "no-cache"
    });

    if (!response.ok) {
      console.warn("[Version Detection] Health check failed:", response.status);
      return false;
    }

    // Check if ETag changed (Vercel sets this)
    const newEtag = response.headers.get("etag");
    const storedEtag = sessionStorage.getItem("app-etag");

    if (storedEtag && newEtag && storedEtag !== newEtag) {
      console.log(
        "[Version Detection] New version detected (ETag changed)",
        storedEtag,
        "→",
        newEtag
      );
      return true;
    }

    if (newEtag) {
      sessionStorage.setItem("app-etag", newEtag);
    }

    return false;
  } catch (error) {
    console.warn("[Version Detection] Version check failed:", error);
    return false;
  }
}

/**
 * Show update notification to user
 */
function showUpdateNotification(): void {
  if (sessionStorage.getItem("update-notification-shown")) {
    return;
  }

  sessionStorage.setItem("update-notification-shown", "true");

  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #3b82f6;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    z-index: 9999;
    max-width: 320px;
    animation: slideIn 0.3s ease-out;
  `;

  notification.innerHTML = `
    <style>
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    </style>
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <div>
        <strong>🎉 New Update Available</strong><br>
        <span style="font-size: 13px; opacity: 0.9;">A new version of the app is ready.</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <button onclick="location.reload()" style="
          background: white;
          color: #3b82f6;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          flex: 1;
        ">Update Now</button>
        <button onclick="this.closest('div').parentElement.parentElement.remove()" style="
          background: rgba(255,255,255,0.2);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        ">Later</button>
      </div>
    </div>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = "slideIn 0.3s ease-out reverse";
      setTimeout(() => notification.remove(), 300);
    }
  }, 30000);
}

/**
 * Start monitoring for new deployments
 */
export function startDeploymentMonitoring(): void {
  if (typeof window === "undefined") return;

  const initialVersion = getCurrentVersionHash();
  sessionStorage.setItem(VERSION_STORAGE_KEY, initialVersion);

  const intervalId = setInterval(async () => {
    const hasNewVersion = await checkForNewVersion();
    if (hasNewVersion) {
      showUpdateNotification();
    }
  }, VERSION_CHECK_INTERVAL);

  const handleVisibilityChange = async () => {
    if (document.visibilityState === "visible") {
      const hasNewVersion = await checkForNewVersion();
      if (hasNewVersion) {
        showUpdateNotification();
      }
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  if (typeof window !== "undefined") {
    (window as any).__cleanupDeploymentMonitoring = () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }
}
