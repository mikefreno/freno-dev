/**
 * SiteContext — SolidJS provider exposing the active `Site` to the component
 * tree (keystone).
 *
 * Resolution strategy:
 *  - Server (SSR): reads the module-level value bound by `setServerSite()`,
 *    which `entry-server.tsx` calls per-request via `getSiteFromEvent(event)`.
 *  - Client (hydration): reads the SSR-injected `window.__SITE__` id (written
 *    into the document shell by `entry-server.tsx`) so the post-hydration
 *    value matches the `data-site` attribute on `<html>`. Falls back to
 *    `resolveSiteFromLocation(window.location.hostname, window.location.pathname)`
 *    if the injected id is missing — the pathname fallback covers localhost
 *    dev where the host is `localhost` but the URL still carries a subdomain
 *    prefix (`/nessa/contact`).
 *
 * NOTE on race-safety: SSR of a personal site is single-render-per-request in
 * practice; the module-level holder is adequate here. Server functions that
 * need authoritative per-request site resolution MUST use
 * `getSiteFromEvent` / `getSiteFromRequest` directly rather than reading
 * the provider — do not rely on `useSite()` for authorization decisions.
 */
import {
  createContext,
  useContext,
  onMount,
  createSignal,
  type Accessor,
  type ParentComponent
} from "solid-js";
import { isServer } from "solid-js/web";
import {
  resolveSiteFromHost,
  resolveSiteFromLocation,
  resolveSiteFromPath,
  SITE_CONFIG,
  MAIN_SITE,
  type Site,
  type SiteId
} from "~/lib/site-context";

// ── SSR binding ──────────────────────────────────────────────────────────
let serverSite: Site = MAIN_SITE;

/**
 * SSR-only. Called by `entry-server.tsx` immediately before rendering so the
 * component tree reads the correct site during the initial SSR pass.
 */
export function setServerSite(site: Site): void {
  if (!isServer) return;
  serverSite = site;
}

// ── Client hydration data ────────────────────────────────────────────────
declare global {
  interface Window {
    __SITE__?: SiteId;
  }
}

/** Resolve the client-side active site, preferring the SSR-injected id. */
export function resolveClientSite(): Site {
  if (typeof window === "undefined") return MAIN_SITE;
  const injected = window.__SITE__;
  if (injected && SITE_CONFIG[injected]) return SITE_CONFIG[injected];
  // Fall back to hostname + URL-path prefix. On localhost (dev) the host is
  // `localhost` (→ main) but the path carries the subdomain prefix
  // (`/nessa/contact` → nessa), so we must consider both.
  return resolveSiteFromLocation(
    window.location.hostname,
    window.location.pathname
  );
}

// ── Context ──────────────────────────────────────────────────────────────
const SiteContext = createContext<Accessor<Site>>(() => MAIN_SITE);

export const SiteProvider: ParentComponent = (props) => {
  const initial: Site = isServer ? serverSite : resolveClientSite();
  const [site, setSite] = createSignal<Site>(initial);

  // Reconcile after mount: covers the rare case where the injected id was
  // unavailable during the synchronous init or the host changed via
  // client-side navigation.
  onMount(() => {
    const resolved = resolveClientSite();
    if (resolved.id !== site().id) setSite(resolved);
  });

  return (
    <SiteContext.Provider value={site}>{props.children}</SiteContext.Provider>
  );
};

/**
 * Access the active `Site` config anywhere in the tree.
 *
 * Returns an accessor (`() => Site`) consistent with the rest of the app's
 * context / signal conventions. Use it for branding (PageHead titleSuffix,
 * brand color, OG image, favicon), per-site navigation, and canonical URLs.
 *
 * @example
 * ```tsx
 * const site = useSite();
 * return <Title>{`Blog${site().titleSuffix}`}</Title>;
 * ```
 */
export function useSite(): Accessor<Site> {
  return useContext(SiteContext);
}

export { SITE_CONFIG, MAIN_SITE };
export type { Site, SiteId };
export { resolveSiteFromHost, resolveSiteFromLocation, resolveSiteFromPath };
