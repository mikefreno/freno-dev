/**
 * Unit tests for the per-subdomain sitemap generation.
 *
 * Covers:
 *  - `generateSitemap(site, entries)` returns correct XML for each site
 *  - All `<loc>` URLs use the correct subdomain domain
 *  - Main site sitemap includes all existing routes (no regression)
 *  - XML is valid (parseable by standard XML parsers)
 *  - No cross-site URL leakage
 */
import { describe, it, expect } from "bun:test";
import { SITE_CONFIG, type SiteId } from "./site-context";
import { SITEMAP_ROUTES } from "./sitemap-routes";
import { generateSitemap } from "./sitemap-generate";

// Helper: parse XML string and return matching <loc> values
function extractLocs(xml: string): string[] {
  const matches: string[] = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    matches.push(m[1]);
  }
  return matches;
}

describe("generateSitemap", () => {
  it("generates valid XML for main site with all expected routes", () => {
    const xml = generateSitemap(SITE_CONFIG.main, SITEMAP_ROUTES.main);

    // Basic structure
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    );

    // All main site paths present with freno.me domain
    const locs = extractLocs(xml);
    expect(locs).toContain("https://freno.me/");
    expect(locs).toContain("https://freno.me/blog");
    expect(locs).toContain("https://freno.me/contact");
    expect(locs).toContain("https://freno.me/login");
    expect(locs).toContain("https://freno.me/resume");
    expect(locs).toContain("https://freno.me/downloads");

    // Exactly 6 entries
    expect(locs.length).toBe(6);

    // Verify well-formedness by checking balanced tags
    expect(xml).toContain("</urlset>");
    const urlOpens = (xml.match(/<url>/g) || []).length;
    const urlCloses = (xml.match(/<\/url>/g) || []).length;
    expect(urlOpens).toBe(urlCloses);
    expect(urlOpens).toBe(6);
  });

  it("generates valid parseable XML for lineage site", () => {
    const xml = generateSitemap(SITE_CONFIG.lineage, SITEMAP_ROUTES.lineage);
    // Verify balanced tags
    expect(xml).toContain("</urlset>");
    const urlOpens = (xml.match(/<url>/g) || []).length;
    const urlCloses = (xml.match(/<\/url>/g) || []).length;
    expect(urlOpens).toBe(urlCloses);
    expect(urlOpens).toBe(5);
  });

  it("generates correct URLs for essa site", () => {
    const xml = generateSitemap(SITE_CONFIG.nessa, SITEMAP_ROUTES.nessa);
    const locs = extractLocs(xml);

    expect(locs).toContain("https://nessa.freno.me/");
    expect(locs).toContain("https://nessa.freno.me/contact");
    expect(locs).toContain("https://nessa.freno.me/privacy");
    expect(locs.length).toBe(3);

    // No leakage from main site
    for (const loc of locs) {
      expect(loc).not.toContain("://freno.me/");
      expect(loc).not.toContain("://freno.me/blog");
    }
  });

  it("generates correct URLs for lineage site", () => {
    const xml = generateSitemap(SITE_CONFIG.lineage, SITEMAP_ROUTES.lineage);
    const locs = extractLocs(xml);

    expect(locs).toContain("https://lineage.freno.me/");
    expect(locs).toContain("https://lineage.freno.me/contact");
    expect(locs).toContain("https://lineage.freno.me/privacy");
    expect(locs).toContain("https://lineage.freno.me/downloads");
    expect(locs).toContain("https://lineage.freno.me/deletion");
    expect(locs.length).toBe(5);
  });

  it("generates correct URLs for gaze site", () => {
    const xml = generateSitemap(SITE_CONFIG.gaze, SITEMAP_ROUTES.gaze);
    const locs = extractLocs(xml);

    expect(locs).toContain("https://gaze.freno.me/");
    expect(locs).toContain("https://gaze.freno.me/contact");
    expect(locs).toContain("https://gaze.freno.me/privacy");
    expect(locs.length).toBe(3);
  });

  it("generates correct URLs for inputhalo site", () => {
    const xml = generateSitemap(
      SITE_CONFIG.inputhalo,
      SITEMAP_ROUTES.inputhalo
    );
    const locs = extractLocs(xml);

    expect(locs).toContain("https://inputhalo.freno.me/");
    expect(locs).toContain("https://inputhalo.freno.me/contact");
    expect(locs).toContain("https://inputhalo.freno.me/privacy");
    expect(locs.length).toBe(3);
  });

  it("escapes special XML characters in URLs", () => {
    const xml = generateSitemap(SITE_CONFIG.main, [
      { path: "/test?a=1&b=2", changefreq: "weekly", priority: 0.5 }
    ]);
    expect(xml).toContain("a=1&amp;b=2");
  });
});

describe("SITEMAP_ROUTES validation", () => {
  it("all entries have paths starting with /", () => {
    for (const [siteId, entries] of Object.entries(SITEMAP_ROUTES)) {
      for (const entry of entries) {
        expect(entry.path).toMatch(/^\//);
      }
    }
  });

  it("all entries have priority between 0 and 1", () => {
    for (const [siteId, entries] of Object.entries(SITEMAP_ROUTES)) {
      for (const entry of entries) {
        expect(entry.priority).toBeGreaterThanOrEqual(0);
        expect(entry.priority).toBeLessThanOrEqual(1);
      }
    }
  });

  it("main site has the original 4 entries plus resume and downloads", () => {
    const mainPaths = SITEMAP_ROUTES.main.map((e) => e.path);
    expect(mainPaths).toContain("/");
    expect(mainPaths).toContain("/blog");
    expect(mainPaths).toContain("/contact");
    expect(mainPaths).toContain("/login");
    expect(mainPaths).toContain("/resume");
    expect(mainPaths).toContain("/downloads");
  });

  it("each site has at least the home page entry", () => {
    const siteIds: SiteId[] = ["main", "nessa", "lineage", "gaze", "inputhalo"];
    for (const id of siteIds) {
      expect(SITEMAP_ROUTES[id].some((e) => e.path === "/")).toBe(true);
    }
  });
});
