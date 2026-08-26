/**
 * Shared site definitions and host-to-site resolver.
 *
 * Near-pure module — reads `import.meta.env.VITE_DOMAIN` (a Vite build-time
 * var available on both client and server) to derive `BASE_DOMAIN`, but
 * imports NO server-only code so it remains safe to import from client,
 * server, and unit tests (with a fallback when the env var is absent).
 *
 * This is the keystone of the subdomain-routing feature. Every
 * content module consumes `SITE_CONFIG` metadata via `useSite()`,
 * and the server-side host detection in
 * `src/server/site-context-server.ts` builds on `resolveSiteFromHost`.
 */

export type SiteId = "main" | "nessa" | "lineage" | "gaze" | "inputhalo" | "nook";

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
  /** Dark mode variant of the brand color (used when dark mode is active). */
  brandColorDark?: string;
  /** Default OpenGraph image path (resolved against the site root). */
  ogDefaultImage: string;
  /** Favicon path for this site. */
  faviconPath: string;
}

/**
 * Derive the base domain from `VITE_DOMAIN`.
 *
 * `VITE_DOMAIN` is `http://localhost:3000` in dev and `https://freno.me`
 * (or `.dev`) in prod. We extract the hostname so host matching works
 * against whichever apex the deployment uses. Falls back to `"freno.me"`
 * when the env var is absent (unit tests) or points at `localhost` (dev —
 * where subdomain host matching isn't used anyway; the path-prefix fallback
 * in `resolveSiteFromLocation` handles dev).
 */
function computeBaseDomain(): string {
  try {
    const v = (import.meta as { env?: Record<string, string | undefined> }).env
      ?.VITE_DOMAIN;
    if (!v) return "freno.me";
    const hostname = new URL(v).hostname;
    return hostname === "localhost" ? "freno.me" : hostname;
  } catch {
    return "freno.me";
  }
}

/** The apex hostname derived from `VITE_DOMAIN` (e.g. `"freno.me"`). */
export const BASE_DOMAIN = computeBaseDomain();

export const SITE_CONFIG: Record<SiteId, Site> = {
  main: {
    id: "main",
    subdomain: "",
    domain: BASE_DOMAIN,
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
    domain: `nessa.${BASE_DOMAIN}`,
    baseRoutePrefix: "/nessa",
    displayName: "Nessa",
    titleSuffix: " | Nessa",
    brandColor: "#527640",
    brandColorDark: "#6CA86C",
    ogDefaultImage: "/nessa/og-default.png",
    faviconPath: "/nessa/favicon/favicon.ico"
  },
  lineage: {
    id: "lineage",
    subdomain: "lineage",
    domain: `lineage.${BASE_DOMAIN}`,
    baseRoutePrefix: "/lineage",
    displayName: "Life and Lineage",
    titleSuffix: " | Life and Lineage",
    brandColor: "#a13536",
    ogDefaultImage: "/lineage/og-default.png",
    faviconPath: "/lineage/favicon/favicon.ico"
  },
  gaze: {
    id: "gaze",
    subdomain: "gaze",
    domain: `gaze.${BASE_DOMAIN}`,
    baseRoutePrefix: "/gaze",
    displayName: "Gaze",
    titleSuffix: " | Gaze",
    brandColor: "#002cff",
    ogDefaultImage: "/gaze/og-default.png",
    faviconPath: "/gaze/favicon/favicon.ico"
  },
  inputhalo: {
    id: "inputhalo",
    subdomain: "inputhalo",
    domain: `inputhalo.${BASE_DOMAIN}`,
    baseRoutePrefix: "/inputhalo",
    displayName: "InputHalo",
    titleSuffix: " | InputHalo",
    brandColor: "#41a5ff",
    ogDefaultImage: "/inputhalo/og-default.png",
    faviconPath: "/inputhalo/favicon/favicon.ico"
  },
  nook: {
    id: "nook",
    subdomain: "nook",
    domain: `nook.${BASE_DOMAIN}`,
    baseRoutePrefix: "/nook",
    displayName: "The Nook",
    titleSuffix: " | The Nook",
    brandColor: "#8b5cf6",
    brandColorDark: "#a78bfa",
    ogDefaultImage: "/nook/og-default.png",
    faviconPath: "/nook/favicon/favicon.ico"
  }
};

/** Ordered subdomain sites used for host matching. */
const SUBDOMAIN_SITES: ReadonlyArray<Site> = [
  SITE_CONFIG.nessa,
  SITE_CONFIG.lineage,
  SITE_CONFIG.gaze,
  SITE_CONFIG.inputhalo,
  SITE_CONFIG.nook
];

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
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
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

// ─────────────────────────────────────────────────────────────────────────
// URL builders — derive full URLs from VITE_DOMAIN (no ~/env/client import
// so this module stays safe for unit tests / pure content modules).
//─────────────────────────────────────────────────────────────────────────

/** Compute the site origin from VITE_DOMAIN (fallback for tests). */
const SITE_ORIGIN = (() => {
  try {
    const v = (import.meta as { env?: Record<string, string | undefined> }).env
      ?.VITE_DOMAIN;
    return v || "https://freno.me";
  } catch {
    return "https://freno.me";
  }
})();

/** True when VITE_DOMAIN points at localhost (dev server). */
function isDevOrigin(): boolean {
  try {
    return new URL(SITE_ORIGIN).hostname === "localhost";
  } catch {
    return false;
  }
}

/**
 * Build a full URL for a subdomain site.
 *
 * - Dev: path-based — `http://localhost:3000/nessa/contact`
 *   (the dev server has no host rewrite, so subdomains live under `/<sub>/...`)
 * - Prod: host-based — `https://nessa.freno.me/contact`
 */
export function buildSubdomainUrl(
  subdomain: string,
  path: string = "/"
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (isDevOrigin()) {
    const pathSuffix = normalizedPath === "/" ? "" : normalizedPath;
    return `${SITE_ORIGIN}/${subdomain}${pathSuffix}`;
  }
  try {
    const url = new URL(SITE_ORIGIN);
    return `${url.protocol}//${subdomain}.${url.hostname}${normalizedPath}`;
  } catch {
    return `https://${subdomain}.${BASE_DOMAIN}${normalizedPath}`;
  }
}

/**
 * Build a full URL for the main (apex) site.
 *
 * - Dev: `http://localhost:3000/contact`
 * - Prod: `https://freno.me/contact`
 */
export function buildMainSiteUrl(path: string = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_ORIGIN}${normalizedPath === "/" ? "" : normalizedPath}`;
}
