import type { APIEvent } from "@solidjs/start/server";
import { getRequestIP } from "vinxi/http";
import {
  logVisit,
  enrichAnalyticsEntry,
  flushAnalytics
} from "~/server/analytics";
import { parseUtm } from "~/server/utm";
import { downloadPath } from "~/lib/download-asset";

/**
 * Record one download event under the canonical path `/api/downloads/<asset>`.
 *
 * Every download door funnels through here so the analytics page has a single
 * label per asset to group on: the tRPC click proxy, the S3 file route that
 * serves Sparkle updates, and the Nook door.
 *
 * Best-effort by design — a failed analytics write must never block a
 * download. Flushed rather than merely buffered: a download is low-volume and
 * the 30s batch timer is not guaranteed to survive the response on serverless.
 *
 * `event.request` is expected to be a Fetch `Request` (true for Vinxi route
 * handlers and browser tRPC calls). A server-side `createCaller` hands over a
 * Node request, whose headers have no `get` — that throw is swallowed below,
 * so such a click is not recorded. No server-side caller downloads today.
 */
export async function trackDownload(
  event: APIEvent,
  asset: string
): Promise<void> {
  const { request } = event;

  try {
    const referrer =
      request.headers.get("referer") ?? request.headers.get("referrer");
    const forwarded = request.headers.get("x-forwarded-for");

    await logVisit(
      enrichAnalyticsEntry({
        path: downloadPath(asset),
        method: "GET",
        referrer,
        userAgent: request.headers.get("user-agent"),
        ipAddress:
          getRequestIP(event.nativeEvent) ??
          (forwarded ? forwarded.split(",")[0]!.trim() : null),
        // The click carries its own tags when a campaign links straight at the
        // door; otherwise the landing page's tags ride along in the referer.
        ...parseUtm(request.url, referrer),
        // Edge header country, overridable with ?c= for manual verification.
        country:
          new URL(request.url).searchParams.get("c") ??
          request.headers.get("x-vercel-ip-country") ??
          request.headers.get("cf-ipcountry")
      })
    );
    await flushAnalytics();
  } catch (error) {
    console.error(`Failed to log download of ${asset}:`, error);
  }
}
