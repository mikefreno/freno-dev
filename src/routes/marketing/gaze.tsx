/**
 * Legacy `/marketing/gaze` route — redirected (task 05) to the new Gaze
 * subdomain landing page at `gaze.freno.me`.
 *
 * Kept as a permanent 308 redirect so existing inbound links keep resolving
 * to the canonical Gaze marketing home.
 *
 * Implemented as a thrown `Response` (rather than `@solidjs/router`'s
 * `redirect()`) because the target is a *cross-origin* absolute URL; throwing
 * a `Response` from a SolidStart page component propagates as the actual HTTP
 * response, with no router base-path rewriting.
 */
export default function GazeMarketingRedirect(): never {
  throw new Response(null, {
    status: 308,
    headers: {
      Location: "https://gaze.freno.me",
      "Cache-Control": "public, max-age=86400"
    }
  });
}
