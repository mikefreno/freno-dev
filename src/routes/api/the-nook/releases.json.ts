import type { APIEvent } from "@solidjs/start/server";
import { collectReleases } from "./_releases";
import { error } from "./_lib";

/**
 * GET /api/the-nook/releases.json
 *
 * The release list behind The Nook's Settings > Changelog tab, newest first:
 * `{ releases: [{ version, build, date, sections: [{ title, bullets }] }] }`.
 *
 * Same source as /changelog — the Sparkle appcast plus the checked-in archive
 * of releases older than its retention — so the app and the website tell one
 * story. Section titles and ISO dates instead of HTML keep the client from
 * parsing markup it would only take apart again.
 *
 * Five-minute cache, in step with the appcast route. An unreadable appcast is
 * a 503 rather than an archived-only 200: the app keeps the newest release in
 * its own bundle and falls back to it, which beats showing stale notes as if
 * they were current.
 */
export async function GET(_event: APIEvent) {
  try {
    const releases = await collectReleases();
    return new Response(JSON.stringify({ releases }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300"
      }
    });
  } catch (err) {
    console.error("Failed to build the Nook release list:", err);
    return error("Release list unavailable", 503);
  }
}
