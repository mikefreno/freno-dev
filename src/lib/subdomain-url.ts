/**
 * Env-aware helpers for building site URLs from `VITE_DOMAIN`.
 *
 * These are re-exported from `~/lib/site-context.ts` so the URL-building
 * logic stays in one place (alongside `BASE_DOMAIN` and the host/path
 * resolvers). Import from here when you need `buildSubdomainUrl` /
 * `buildMainSiteUrl` in components, routes, or content modules.
 *
 * **Why a separate entry point:** `site-context.ts` is a near-pure module
 * that reads `import.meta.env.VITE_DOMAIN` directly (no `~/env/client`
 * import), so it's safe to use in unit tests and pure content modules.
 * Re-exporting via this file gives callers a focused import path for just
 * the URL helpers without pulling in the resolver functions.
 *
 * **Dev vs prod behavior:**
 *  - Dev (`VITE_DOMAIN=http://localhost:3000`): path-based —
 *    `http://localhost:3000/nessa/contact` (the dev server has no host rewrite)
 *  - Prod (`VITE_DOMAIN=https://freno.me`): host-based —
 *    `https://nessa.freno.me/contact`
 *
 * Use these instead of hardcoding `freno.me` anywhere a URL is emitted.
 * Email addresses (`michael@freno.me`) and email display names are
 * brand-level constants and should NOT use this module.
 */
export {
  buildSubdomainUrl,
  buildMainSiteUrl,
  BASE_DOMAIN as getBaseDomain
} from "./site-context";
