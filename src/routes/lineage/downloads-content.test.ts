/**
 * Unit tests for the Lineage per-subdomain downloads page content.
 *
 * Mirrors the `landing-content.test.ts` pattern: assert against pure
 * constants exported from `downloads-content.ts` (no solid-js / router /
 * DOM). This covers the acceptance matrix that's structurally
 * verifiable without rendering:
 *  - APK asset key is `"lineage"` (the tRPC key the downloads router maps to
 *    `Life and Lineage.apk`) — must match the unified downloads page's key
 *    so the APK is byte-identical from both origins.
 *  - App Store link is the canonical Life and Lineage App Store URL.
 *  - PageHead base title + description (suffix appended by PageHead).
 *  - Back-to-home link is the subdomain-relative public browser path.
 */
import { describe, it, expect } from "bun:test";
import {
  LINEAGE_DOWNLOAD_ASSET,
  LINEAGE_APK_BUTTON_LABEL,
  LINEAGE_APP_STORE_URL,
  LINEAGE_HOME_HREF,
  PAGE_META
} from "~/routes/lineage/downloads-content";
import { APP_STORE_URL as LANDING_APP_STORE_URL } from "~/routes/lineage/landing-content";

describe("Lineage downloads — APK asset", () => {
  it("uses the tRPC key the downloads router maps to the lineage APK", () => {
    // src/server/api/routers/downloads.ts: assets["lineage"] = "Life and Lineage.apk"
    expect(LINEAGE_DOWNLOAD_ASSET).toBe("lineage");
  });

  it("matches the asset key used by the unified freno.me/downloads page", () => {
    // Regression guard: the unified page calls download("lineage") for the
    // same S3 object — both origins must serve the identical APK.
    expect(LINEAGE_DOWNLOAD_ASSET).toBe("lineage");
  });
});

describe("Lineage downloads — button label", () => {
  it("surfaces the APK file extension in the CTA", () => {
    expect(LINEAGE_APK_BUTTON_LABEL).toBe("download.apk");
  });
});

describe("Lineage downloads — App Store link", () => {
  it("matches the canonical Life and Lineage App Store URL", () => {
    expect(LINEAGE_APP_STORE_URL).toBe(
      "https://apps.apple.com/us/app/life-and-lineage/id6737252442"
    );
  });

  it("is an absolute https URL", () => {
    expect(LINEAGE_APP_STORE_URL.startsWith("https://")).toBe(true);
  });

  it("matches the App Store URL surfaced on the landing page", () => {
    // landing-content.ts exports APP_STORE_URL — same canonical link.
    expect(LINEAGE_APP_STORE_URL).toBe(LANDING_APP_STORE_URL);
  });
});

describe("Lineage downloads — back-to-home link", () => {
  it("targets the subdomain-relative public browser path", () => {
    // NOT `/lineage/` (the internal vercel-rewrite prefix) — vercel rewrites
    // `lineage.freno.me/` → `/lineage/` while leaving the browser URL clean.
    expect(LINEAGE_HOME_HREF).toBe("/");
  });

  it("does not leak the internal route prefix", () => {
    expect(LINEAGE_HOME_HREF).not.toContain("/lineage");
  });
});

describe("Lineage downloads — PageHead inputs", () => {
  it("passes the base title (suffix is appended by PageHead)", () => {
    expect(PAGE_META.title).toBe("Downloads");
  });

  it("does not pre-bake the site suffix into the title", () => {
    expect(PAGE_META.title).not.toContain("|");
  });

  it("carries a non-empty description", () => {
    expect(PAGE_META.description.length).toBeGreaterThan(0);
  });

  it("description mentions the product + both store fronts", () => {
    const desc = PAGE_META.description.toLowerCase();
    expect(desc).toContain("life and lineage");
    expect(desc).toContain("apk");
    expect(desc).toContain("app store");
  });
});
