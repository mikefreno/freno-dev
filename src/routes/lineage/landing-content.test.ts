/**
 * Unit tests for the Lineage landing page content.
 *
 * Mirrors the `page-head-meta.ts` / `nav-config.ts` pattern: assert against
 * pure constants exported from `landing-content.ts` (no solid-js / router /
 * DOM). This covers the acceptance matrix that's structurally
 * verifiable without rendering:
 *  - App Store link is present and correct
 *  - Google Play / downloads link targets the subdomain `/downloads` path
 *    (public browser path, NOT the vercel-rewritten `/lineage/downloads`)
 *  - Feature highlights cover: dark fantasy, mobile, remote saves, PvP
 *  - PageHead base title + description (suffix is added by PageHead)
 *  - Legacy `/marketing/life-and-lineage` redirect target points at the
 *    Lineage subdomain.
 *
 * The PageHead title-suffix + canonical derivation for the lineage site is
 * already covered by `src/components/PageHead.test.ts`; these tests assert
 * the *inputs* the page passes to PageHead.
 */
import { describe, it, expect } from "bun:test";
import {
  APP_STORE_URL,
  DOWNLOADS_HREF,
  APP_ICON_SRC,
  GOOGLE_PLAY_BADGE_SRC,
  SCREENSHOT_ASSETS,
  PAGE_META,
  FEATURES,
  LEGACY_REDIRECT_TARGET,
  type LineageFeature
} from "~/routes/lineage/landing-content";

describe("Lineage landing — App Store link", () => {
  it("matches the canonical Life and Lineage App Store URL", () => {
    expect(APP_STORE_URL).toBe(
      "https://apps.apple.com/us/app/life-and-lineage/id6737252442"
    );
  });

  it("is an absolute https URL", () => {
    expect(APP_STORE_URL.startsWith("https://")).toBe(true);
  });
});

describe("Lineage landing — downloads link", () => {
  it("targets the subdomain-relative public browser path", () => {
    // NOT `/lineage/downloads` (the internal vercel-rewrite prefix) — vercel
    // rewrites `lineage.freno.me/downloads` → `/lineage/downloads` while
    // leaving the browser URL clean, matching the canonical rule.
    expect(DOWNLOADS_HREF).toBe("/downloads");
  });

  it("does not leak the internal route prefix", () => {
    expect(DOWNLOADS_HREF).not.toContain("/lineage");
  });
});

describe("Lineage landing — asset paths", () => {
  it("points at the shared app icon", () => {
    expect(APP_ICON_SRC).toBe("/LineageIcon.png");
  });

  it("points at the shared Google Play badge", () => {
    expect(GOOGLE_PLAY_BADGE_SRC).toBe("/google-play-badge.png");
  });

  it("exposes screenshot + preview assets", () => {
    expect(SCREENSHOT_ASSETS.home).toBe("/lineage-home.png");
    expect(SCREENSHOT_ASSETS.shops).toBe("/lineage-shops.png");
    expect(SCREENSHOT_ASSETS.preview).toBe("/lineage-preview.mp4");
  });
});

describe("Lineage landing — PageHead inputs", () => {
  it("passes the base title (suffix is appended by PageHead)", () => {
    expect(PAGE_META.title).toBe("Life and Lineage");
  });

  it("does not pre-bake the site suffix into the title", () => {
    // PageHead via resolvePageHeadMeta appends ` | Life and Lineage`.
    expect(PAGE_META.title).not.toContain("|");
  });

  it("carries a non-empty description", () => {
    expect(PAGE_META.description.length).toBeGreaterThan(0);
  });

  it("description mentions both store fronts", () => {
    expect(PAGE_META.description.toLowerCase()).toContain("app store");
    expect(PAGE_META.description.toLowerCase()).toContain("google play");
  });
});

describe("Lineage landing — feature highlights", () => {
  it("exposes exactly the four required pillars", () => {
    expect(FEATURES.length).toBe(4);
    const titles = FEATURES.map((f) => f.title);
    expect(titles).toContain("Dark Fantasy Adventure");
    expect(titles).toContain("Built for Mobile");
    expect(titles).toContain("Remote Saves");
    expect(titles).toContain("PvP Combat");
  });

  it("every feature has a non-empty title + description", () => {
    for (const f of FEATURES as LineageFeature[]) {
      expect(f.title.length).toBeGreaterThan(0);
      expect(f.description.length).toBeGreaterThan(0);
    }
  });

  it("covers the dark-fantasy / mobile / saves / PvP themes", () => {
    const blob = FEATURES.map((f) => `${f.title} ${f.description}`)
      .join(" ")
      .toLowerCase();
    expect(blob).toContain("dark fantasy");
    expect(blob).toContain("mobile");
    expect(blob).toContain("sav");
    expect(blob).toContain("pvp");
  });
});

describe("Lineage landing — legacy redirect target", () => {
  it("points at the lineage subdomain (derived from VITE_DOMAIN)", () => {
    // LEGACY_REDIRECT_TARGET is now dynamically derived from VITE_DOMAIN
    // via buildSubdomainUrl("lineage"). In dev it's path-based
    // (http://localhost:3000/lineage); in prod it's host-based
    // (https://lineage.freno.me). Assert it's a valid absolute URL.
    expect(LEGACY_REDIRECT_TARGET).toMatch(/^https?:\/\/[^/]+\/[a-z]+$/i);
    expect(LEGACY_REDIRECT_TARGET).toContain("lineage");
  });

  it("has no trailing slash", () => {
    expect(LEGACY_REDIRECT_TARGET.endsWith("/")).toBe(false);
  });
});
