/**
 * Host-aware sitemap.xml route handler (task 03).
 *
 * Reads the `Host` header to determine the active site, then generates a
 * sitemap scoped to that site's routes with canonical URLs from the
 * corresponding domain.
 */
import { APIEvent } from "@solidjs/start/server";
import { getSiteFromEvent } from "~/server/site-context-server";
import { SITEMAP_ROUTES } from "~/lib/sitemap-routes";
import { generateSitemap } from "~/lib/sitemap-generate";

export async function GET(event: APIEvent) {
  const site = getSiteFromEvent(event);
  const entries = SITEMAP_ROUTES[site.id] ?? [];
  const xml = generateSitemap(site, entries);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
