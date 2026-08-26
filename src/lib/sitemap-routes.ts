/**
 * Centralized sitemap route registry per site.
 *
 * Each entry describes a URL path that should appear in the corresponding
 * site's `sitemap.xml`, along with SEO metadata (change frequency and
 * relative priority).
 *
 * This module is pure — no imports of server-side code — so it can be
 * used in unit tests and from both server and client contexts.
 */
import type { SiteId } from "./site-context";

export interface SitemapEntry {
  /**
   * Absolute path on the site's domain (must start with `/`).
   */
  path: string;

  /**
   * Expected change frequency.
   */
  changefreq:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";

  /**
   * Relative priority (0.0–1.0).
   */
  priority: number;
}

/**
 * Per-site sitemap route definitions.
 *
 * Entries for subdomain pages (contact, privacy, downloads, etc.) are
 * populated as those pages are built.
 */
export const SITEMAP_ROUTES: Record<SiteId, SitemapEntry[]> = {
  main: [
    { path: "/", changefreq: "weekly", priority: 1.0 },
    { path: "/blog", changefreq: "daily", priority: 0.9 },
    { path: "/contact", changefreq: "monthly", priority: 0.7 },
    { path: "/login", changefreq: "monthly", priority: 0.5 },
    { path: "/resume", changefreq: "yearly", priority: 0.6 },
    { path: "/downloads", changefreq: "weekly", priority: 0.8 }
  ],

  // ── Subdomain sites ──────────────────────────────────────────────────
  // Populated as pages land.

  nessa: [
    { path: "/", changefreq: "weekly", priority: 1.0 },
    { path: "/contact", changefreq: "monthly", priority: 0.6 },
    { path: "/privacy", changefreq: "yearly", priority: 0.4 }
  ],

  lineage: [
    { path: "/", changefreq: "weekly", priority: 1.0 },
    { path: "/contact", changefreq: "monthly", priority: 0.6 },
    { path: "/privacy", changefreq: "yearly", priority: 0.4 },
    { path: "/downloads", changefreq: "weekly", priority: 0.8 },
    { path: "/deletion", changefreq: "yearly", priority: 0.3 }
  ],

  gaze: [
    { path: "/", changefreq: "weekly", priority: 1.0 },
    { path: "/contact", changefreq: "monthly", priority: 0.6 },
    { path: "/privacy", changefreq: "yearly", priority: 0.4 }
  ],

  inputhalo: [
    { path: "/", changefreq: "weekly", priority: 1.0 },
    { path: "/contact", changefreq: "monthly", priority: 0.6 },
    { path: "/privacy", changefreq: "yearly", priority: 0.4 }
  ],

  nook: [
    { path: "/", changefreq: "weekly", priority: 1.0 },
    { path: "/checkout", changefreq: "monthly", priority: 0.5 },
    { path: "/privacy", changefreq: "yearly", priority: 0.4 }
  ]
};
