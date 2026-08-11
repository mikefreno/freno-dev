/**
 * Pure utilities for generating sitemap XML.
 *
 * Extracted from the route handler so the logic can be unit-tested without
 * spinning up an HTTP server.
 */
import type { Site } from "./site-context";
import type { SitemapEntry } from "./sitemap-routes";

/**
 * Escape a string for safe XML attribute / text content embedding.
 */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generate a single `<url>` element for a given entry on a site.
 */
function urlElement(site: Site, entry: SitemapEntry): string {
  const loc = `https://${site.domain}${entry.path}`;
  return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${xmlEscape(entry.changefreq)}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`;
}

/**
 * Generate the full sitemap XML for a given site and its route entries.
 */
export function generateSitemap(site: Site, entries: SitemapEntry[]): string {
  const urls = entries.map((e) => urlElement(site, e)).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}
