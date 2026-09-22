import type { APIEvent } from "@solidjs/start/server";

/**
 * Lightweight uptime/monitoring probe.
 *
 * Returns a tiny 200 that the edge CDN caches (`CDN-Cache-Control`), so
 * health checks (Sentry uptime monitors, external monitors, `curl`) cost a
 * fraction of a rendered page instead of a full SSR response. Point monitors
 * at `https://freno.me/api/health`.
 */
export async function GET(_event: APIEvent) {
 return new Response(JSON.stringify({ status: "ok" }), {
  status: 200,
  headers: {
   "Content-Type": "application/json; charset=utf-8",
   // Browser: always revalidate (tiny body, no reason to cache).
   "Cache-Control": "public, max-age=0",
   // Edge CDN: serve from cache for 1 min, then stale-while-revalidate
   // for a day so repeated probe hits never touch the origin.
   "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=86400"
  }
 });
}
