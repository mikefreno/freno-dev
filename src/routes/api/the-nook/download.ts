import type { APIEvent } from "@solidjs/start/server";
import { getRequestIP } from "vinxi/http";
import { logVisit, enrichAnalyticsEntry, flushAnalytics } from "~/server/analytics";
import { parseUtm } from "~/server/utm";
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
 * VisitorAnalytics under the path below, which is what `topApiCalls`
 * already surfaces.
 *
 * Country is read from the edge headers Vercel/Cloudflare set; the
 * analytics buffer carries a `country` column that nothing populated
 * until now. `?c=` is accepted as an override for previews and manual
 * verification.
 *
 * ONLY the handler is exported here: Vinxi's route tree-shake deletes
 * exported declarations that are not in the router's `pick=` list, so a
 * helper exported from this file would be removed while `GET` still
 * referenced it. All resolution helpers live in `./_download.ts`.
 */

function firstHeader(request: Request, ...names: string[]): string | null {
  for (const name of names) {
    const value = request.headers.get(name);
    if (value) return value;
  }
  return null;
}

export async function GET(event: APIEvent): Promise<Response> {
  const { request } = event;
  const url = new URL(request.url);

  const forwarded = firstHeader(request, "x-forwarded-for");
  const ipAddress =
    getRequestIP(event.nativeEvent) ??
    (forwarded ? forwarded.split(",")[0]!.trim() : null);

  // Best-effort: a failed analytics write must never block a download.
  // Flushed (not merely buffered) because a download click is low-volume and
  // the batch timer is not guaranteed to survive the response on serverless.
  try {
    const referrer = firstHeader(request, "referer", "referrer");
    await logVisit(
      enrichAnalyticsEntry({
        path: "/api/the-nook/download",
        method: "GET",
        referrer,
        userAgent: firstHeader(request, "user-agent"),
        ipAddress,
        // The click carries its own tags when a campaign links straight here;
        // otherwise the landing page's tags ride along in the referer.
        ...parseUtm(request.url, referrer),
        country:
          url.searchParams.get("c") ??
          firstHeader(request, "x-vercel-ip-country", "cf-ipcountry")
      })
    );
    await flushAnalytics();
  } catch (error) {
    console.error("Failed to log download click:", error);
  }

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
