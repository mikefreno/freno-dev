/**
 * Shared site definitions and host-to-site resolver.
 *
 * Pure module — intentionally imports NO env / server-only code — so it is
 * safe to import from both server and client (and from unit tests).
 *
 * This is the keystone of the subdomain-routing feature (task 01). Every
 * content task (05-11) consumes `SITE_CONFIG` metadata via `useSite()`,
 * and the server-side host detection in
 * `src/server/site-context-server.ts` builds on `resolveSiteFromHost`.
 */

export type SiteId = "main" | "nessa" | "lineage" | "gaze" | "inputhalo";

export interface Site {
  /** Canonical id, also serialized into `<html data-site>` and `window.__SITE__`. */
  id: SiteId;
  /** Subdomain label, e.g. `"nessa"`. Empty string for the main site. */
  subdomain: string;
  /** Fully-qualified domain, e.g. `"nessa.freno.me"`. `"freno.me"` for main. */
  domain: string;
  /**
   * Internal route prefix the vercel.json host rewrite targets. SolidStart
   * file-routing places subdomain pages under `src/routes/<prefix>/*`.
   * Empty string for main.
   */
  baseRoutePrefix: string;
  /** Human-friendly brand / product name. */
  displayName: string;
  /** Appended to page titles, e.g. `" | Nessa"`. */
  titleSuffix: string;
  /** Hex brand color used for theming accents / OG image backgrounds. */
  brandColor: string;
  /** Default OpenGraph image path (resolved against the site root). */
  ogDefaultImage: string;
  /** Favicon path for this site. */
  faviconPath: string;
}

export const SITE_CONFIG: Record<SiteId, Site> = {
  main: {
    id: "main",
    subdomain: "",
    domain: "freno.me",
    baseRoutePrefix: "",
    displayName: "Michael Freno",
    titleSuffix: " | Michael Freno",
    brandColor: "#89b4fa",
    ogDefaultImage: "/blueprint.jpg",
    faviconPath: "/favicon.ico"
  },
  nessa: {
    id: "nessa",
    subdomain: "nessa",
    domain: "nessa.freno.me",
    baseRoutePrefix: "/nessa",
    displayName: "Nessa",
    titleSuffix: " | Nessa",
    brandColor: "#cba6f7",
    ogDefaultImage: "/nessa/og-default.png",
    faviconPath: "/nessa/favicon.ico"
  },
  lineage: {
    id: "lineage",
    subdomain: "lineage",
    domain: "lineage.freno.me",
    baseRoutePrefix: "/lineage",
    displayName: "Life and Lineage",
    titleSuffix: " | Life and Lineage",
    brandColor: "#a6e3a1",
    ogDefaultImage: "/lineage/og-default.png",
    faviconPath: "/lineage/favicon.ico"
  },
  gaze: {
    id: "gaze",
    subdomain: "gaze",
    domain: "gaze.freno.me",
    baseRoutePrefix: "/gaze",
    displayName: "Gaze",
    titleSuffix: " | Gaze",
    brandColor: "#f9e2af",
    ogDefaultImage: "/gaze/og-default.png",
    faviconPath: "/gaze/favicon.ico"
  },
  inputhalo: {
    id: "inputhalo",
    subdomain: "inputhalo",
    domain: "inputhalo.freno.me",
    baseRoutePrefix: "/inputhalo",
    displayName: "InputHalo",
    titleSuffix: " | InputHalo",
    brandColor: "#f38ba8",
    ogDefaultImage: "/inputhalo/og-default.png",
    faviconPath: "/inputhalo/favicon.ico"
  }
};

/** Ordered subdomain sites used for host matching. */
const SUBDOMAIN_SITES: ReadonlyArray<Site> = [
  SITE_CONFIG.nessa,
  SITE_CONFIG.lineage,
  SITE_CONFIG.gaze,
  SITE_CONFIG.inputhalo
];

const BASE_DOMAIN = "freno.me";

/** Matches `<sub>.localhost` and `<sub>.localhost:<port>` (dev only). */
const DEV_HOST_RE = /^([a-z0-9-]+)\.localhost$/i;

export const MAIN_SITE: Site = SITE_CONFIG.main;

/**
 * Resolve a `Site` from a raw `Host` header value (or hostname).
 *
 * Handles:
 *  - exact product subdomains (`nessa.freno.me` → nessa)
 *  - `www.` prefix (`www.freno.me` → main)
 *  - the bare apex (`freno.me` → main)
 *  - port suffixes (`freno.me:3000` → main)
 *  - localhost dev (`localhost` / `localhost:3000` → main)
 *  - subdomain dev (`nessa.localhost` / `nessa.localhost:3000` → nessa)
 *  - unknown hosts / unknown subdomains → main (fail-safe default)
 *
 * Pure & synchronous — no I/O, no env access.
 */
export function resolveSiteFromHost(host: string | null | undefined): Site {
  if (!host) return MAIN_SITE;

  // Normalize: trim, lowercase, strip optional `:port` suffix.
  const normalized = host.trim().toLowerCase().replace(/:\d+$/, "");
  if (!normalized) return MAIN_SITE;

  // Strip a leading `www.` so `www.freno.me` behaves like `freno.me`.
  const withoutWww = normalized.replace(/^www\./, "");

  if (withoutWww === BASE_DOMAIN) return MAIN_SITE;

  // Exact subdomain.<base> match.
  for (const site of SUBDOMAIN_SITES) {
    if (withoutWww === `${site.subdomain}.${BASE_DOMAIN}`) return site;
  }

  // Dev pattern: <sub>.localhost[:port] (browsers resolve `*.localhost`).
  const devMatch = normalized.match(DEV_HOST_RE);
  if (devMatch) {
    const sub = devMatch[1]!.toLowerCase();
    for (const site of SUBDOMAIN_SITES) {
      if (sub === site.subdomain) return site;
    }
    // `localhost` alone or unknown `<x>.localhost` → main.
    return MAIN_SITE;
  }

  // Unknown `*.freno.me` (e.g. a future subdomain not yet configured) → main.
  if (withoutWww.endsWith(`.${BASE_DOMAIN}`)) return MAIN_SITE;

  // Anything else entirely (IPs, foreign hosts) → main as a safe default.
  return MAIN_SITE;
}

/**
 * Resolve a `Site` from a URL pathname by matching a known subdomain route
 * prefix (e.g. `/nessa/contact` → nessa, `/gaze/downloads` → gaze).
 *
 * Returns `null` when the path does not begin with a subdomain prefix so the
 * caller can distinguish "no match" from "main" and decide whether to fall
 * back to the host-based result.
 *
 * This is the dev-server safety net: on `localhost:3000/nessa/contact` the
 * Host header is `localhost` (→ main), but the URL path still carries the
 * subdomain prefix because vercel.json host rewrites do not run locally.
 * Without this fallback, `useSite()` returns `main` on every subdomain page
 * in dev, causing `<SubdomainHeader>` to render the main-site nav.
 *
 * In production the host rewrite strips the prefix, so the path is `/contact`
 * (no prefix) and this returns `null` — the host-based result already
 * resolved correctly.
 *
 * Pure & synchronous — no I/O, no env access.
 */
export function resolveSiteFromPath(
  pathname: string | null | undefined
): Site | null {
  if (!pathname) return null;
  for (const site of SUBDOMAIN_SITES) {
    const prefix = site.baseRoutePrefix; // e.g. "/nessa"
    // Exact prefix (`/nessa`) or prefix + `/` (`/nessa/contact`).
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return site;
    }
  }
  return null;
}

/**
 * Resolve the active site from a client `window.location`, used by the
 * SolidJS `SiteContext` provider during hydration. Server codepaths should
 * use `getSiteFromEvent` / `getSiteFromRequest` instead.
 *
 * When the hostname does not identify a subdomain (e.g. `localhost` in dev),
 * falls back to checking the URL pathname for a subdomain route prefix so
 * that `localhost:3000/nessa/contact` resolves to nessa.
 */
export function resolveSiteFromLocation(
  hostname: string | null | undefined,
  pathname?: string | null | undefined
): Site {
  const hostResult = resolveSiteFromHost(hostname);
  if (hostResult.id !== "main") return hostResult;
  return resolveSiteFromPath(pathname) ?? hostResult;
}
