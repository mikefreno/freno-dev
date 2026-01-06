/**
 * Real User Monitoring (RUM) - Client-side performance tracking
 * Captures Core Web Vitals and sends to analytics endpoint
 */

interface PerformanceMetrics {
  fcp?: number;
  lcp?: number;
  cls?: number;
  fid?: number;
  inp?: number;
  ttfb?: number;
  domLoad?: number;
  loadComplete?: number;
}

let metrics: PerformanceMetrics = {};
let clsValue = 0;
let clsEntries: number[] = [];
let inpValue = 0;

export function initPerformanceTracking() {
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) {
    return;
  }

  // Observe LCP
  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch (e) {
    console.debug("LCP not supported");
  }

  // Observe CLS
  try {
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const layoutShift = entry as any;
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
          clsEntries.push(layoutShift.value);
        }
      }
      metrics.cls = clsValue;
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
  } catch (e) {
    console.debug("CLS not supported");
  }

  // Observe FID
  try {
    const fidObserver = new PerformanceObserver((entryList) => {
      const firstInput = entryList.getEntries()[0] as any;
      if (firstInput) {
        metrics.fid = firstInput.processingStart - firstInput.startTime;
      }
    });
    fidObserver.observe({ type: "first-input", buffered: true });
  } catch (e) {
    console.debug("FID not supported");
  }

  // Observe INP (event timing)
  try {
    const interactions: number[] = [];
    const inpObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const eventEntry = entry as any;
        if (eventEntry.interactionId) {
          interactions.push(eventEntry.duration);
          const sorted = [...interactions].sort((a, b) => b - a);
          const p98Index = Math.floor(sorted.length * 0.02);
          inpValue = sorted[p98Index] || sorted[0] || 0;
          metrics.inp = inpValue;
        }
      }
    });
    inpObserver.observe({ type: "event", buffered: true });
  } catch (e) {
    console.debug("INP not supported");
  }

  // Get navigation timing metrics
  window.addEventListener("load", () => {
    setTimeout(() => {
      const navTiming = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming;

      if (navTiming) {
        metrics.ttfb = navTiming.responseStart - navTiming.requestStart;
        metrics.domLoad =
          navTiming.domContentLoadedEventEnd - navTiming.fetchStart;
        metrics.loadComplete = navTiming.loadEventEnd - navTiming.fetchStart;
      }

      // Get FCP
      const paintEntries = performance.getEntriesByType("paint");
      const fcpEntry = paintEntries.find(
        (entry) => entry.name === "first-contentful-paint"
      );
      if (fcpEntry) {
        metrics.fcp = fcpEntry.startTime;
      }

      // Send metrics after a short delay to ensure all metrics are captured
      setTimeout(() => {
        sendMetrics();
      }, 2000);
    }, 0);
  });

  // Send metrics before page unload (in case user navigates away)
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      sendMetrics();
    }
  });
}

function sendMetrics() {
  // Only send if we have at least one metric
  if (Object.keys(metrics).length === 0) {
    return;
  }

  const path = window.location.pathname + window.location.search;

  // tRPC batch format for public procedure
  const tRPCPayload = {
    0: {
      path: path,
      metrics: { ...metrics }
    }
  };

  const apiUrl = "/api/trpc/analytics.logPerformance?batch=1";
  const payload = JSON.stringify(tRPCPayload);

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon(apiUrl, blob);
  } else {
    // Fallback to fetch with keepalive
    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    }).catch((err) =>
      console.debug("Failed to send performance metrics:", err)
    );
  }

  // Clear metrics after sending
  metrics = {};
}
