// @refresh reload
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * In-app host-based subdomain path rewrite.
 *
 * ## Why this exists
 *
 * `vercel.json` declares host `rewrites` that map each subdomain onto its
 * internal `src/routes/<prefix>/*` file route (e.g.
 * `lineage.freno.me/privacy` → `/lineage/privacy`). When Vercel builds with
 * the Nitro `vercel` preset, however, it emits a Build Output API
 * `.vercel/output/config.json` with a `routes` array — and per Vercel's
 * contract, **a `routes` array in `config.json` fully replaces
 * `vercel.json` `rewrites`/`redirects`/`headers`**. The host rewrites were
 * therefore silently never applied, which is why subdomain-only routes
 * (`/privacy`, `/deletion`) 404'd on production while routes that also
 * exist at the root (`/`, `/contact`, `/downloads`) appeared to work (they
 * were actually served by the root route, not the subdomain-branded one).
 *
 * ## What this does
 *
 * This middleware (registered via `app.config.ts` → `middleware`) runs as
 * an H3 `onRequest` hook BEFORE the SolidStart file router matches the path.
 * For a request whose `Host` resolves to a subdomain `Site`, it prefixes the
 * request URL with the site's `baseRoutePrefix` — e.g. `/privacy` on
 * `lineage.freno.me` becomes `/lineage/privacy` internally, exactly as the
 * `vercel.json` rewrite intended — so the file router resolves the correct
 * subdomain route file (`src/routes/lineage/privacy.tsx`).
 *
 * The browser URL is untouched (this is an internal rewrite, not a
 * redirect). `useLocation()` will report the prefixed internal path; the
 * canonical-URL derivation in `src/components/page-head-meta.ts` strips the
 * prefix so the public canonical stays `https://lineage.freno.me/privacy`.
 *
 * ## Scope / skip conditions
 *
 *  - Main site / unknown host → no rewrite (no prefix to add).
 *  - `/api/*` → shared API pool (already routed correctly on all hosts; the
 *    `vercel.json` `/api/(.*)` rules are pure pass-throughs, so no prefix).
 *  - Paths already carrying a subdomain prefix (dev path-based URLs like
 *    `localhost:3000/lineage/privacy`, or a request already rewritten) → no
 *    double-prefix.
 *  - `/_build/*` build assets → served statically, not routed.
 *
 * ## Dev vs prod
 *
 * In dev, the Host is usually `localhost` (→ main → no rewrite); subdomain
 * pages are reached via their path prefix (`localhost:3000/lineage/privacy`)
 * which the skip-condition above leaves untouched. Dev subdomains reached
 * via `lineage.localhost:3000/privacy` (browsers resolve `*.localhost`) ARE
 * rewritten, keeping dev and prod behavior consistent.
 */
import { resolveSiteFromHost } from "~/lib/site-context";

/**
 * Minimal H3-event shape this middleware touches. Avoids importing
 * `vinxi/http` (a type-only subpath that some environments can't resolve) —
 * the real H3Event satisfies this structure at runtime.
 */
interface RewriteEvent {
  node?: {
    req?: {
      url?: string;
      originalUrl?: string;
      headers?: { host?: string };
    };
  };
  _path?: string;
}

export default {
  onRequest(event: RewriteEvent) {
    const req = event?.node?.req;
    if (!req?.headers) return;

    const site = resolveSiteFromHost(req.headers.host);
    // No prefix to add for the main site / unknown host.
    if (!site.baseRoutePrefix) return;

    const url = req.url || "/";
    // Shared API pool — pass through unchanged on every host.
    if (url === "/api" || url.startsWith("/api/")) return;
    // Already prefixed (dev path-based URLs, or a request already rewritten).
    if (
      url === site.baseRoutePrefix ||
      url.startsWith(site.baseRoutePrefix + "/")
    ) {
      return;
    }
    // Static build assets are served as files, not via the router.
    if (url.startsWith("/_build/")) return;

    // Internal rewrite: /privacy → /lineage/privacy (browser URL unchanged).
    // H3's toWebRequest derives the URL from `originalUrl ?? event.path`, so
    // we must set originalUrl too (not just _path/req.url) or the SolidStart
    // router keeps seeing the unprefixed browser path.
    const rewritten = site.baseRoutePrefix + url;
    req.originalUrl = rewritten;
    req.url = rewritten;
    event._path = rewritten;
  }
};
