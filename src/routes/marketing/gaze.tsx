import { buildSubdomainUrl } from "~/lib/site-context";

/**
 * Legacy `/marketing/gaze` route — redirected to the new Gaze
 * subdomain landing page.
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
      Location: buildSubdomainUrl("gaze"),
      "Cache-Control": "public, max-age=86400"
    }
  });
}
