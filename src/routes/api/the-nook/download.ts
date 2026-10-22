import type { APIEvent } from "@solidjs/start/server";
import { trackDownload } from "~/server/track-download";
import { resolveLatestDownload } from "./_download";

/**
 * GET /api/the-nook/download
 *
 * The measured download door. Both hero buttons point here instead of
 * resolving the appcast in the browser: this route resolves the latest
 * release enclosure server-side, records the click through the shared
 * analytics buffer, then 302s to the DMG.
 *
 * Why a redirect and not a direct S3 link: the appcast route and the DMG
 * route never logged anything, so step 2 of the funnel (download click →
 * DMG served) was invisible. Every click now lands one row in
 * VisitorAnalytics under `/api/downloads/thenook`, alongside the clicks and
 * served files of every other product — see `~/server/track-download`.
 *
 * Referrer, campaign tags, edge country (with `?c=` override) and user agent
 * are read by `trackDownload`, which is shared with the other download doors.
 *
 * ONLY the handler is exported here: Vinxi's route tree-shake deletes
 * exported declarations that are not in the router's `pick=` list, so a
 * helper exported from this file would be removed while `GET` still
 * referenced it. All resolution helpers live in `./_download.ts`.
 */

export async function GET(event: APIEvent): Promise<Response> {
  // Recorded before resolving: a click that dies at resolution is exactly the
  // failure the funnel needs to show.
  await trackDownload(event, "thenook");

  let target: string | null = null;
  try {
    target = await resolveLatestDownload();
  } catch (error) {
    console.error("Failed to resolve Nook download:", error);
  }

  if (!target) {
    return new Response("Download unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" }
    });
  }

  // No-store is load-bearing: a cached 302 would serve later clicks without
  // ever reaching this handler, silently dropping them from the funnel.
  return new Response(null, {
    status: 302,
    headers: { Location: target, "Cache-Control": "no-store" }
  });
}
