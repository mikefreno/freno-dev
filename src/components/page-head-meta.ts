/**
 * Pure metadata derivation for `PageHead`.
 *
 * Intentionally imports NOTHING from solid-js / @solidjs/router / @solidjs/meta
 * so it can be unit-tested in `bun:test` without spinning up the SolidJS
 * router + MetaProvider + DOM (which this repo does not configure). The
 * `PageHead` component is a thin render layer over this function.
 *
 * Rules:
 *  - `title` → `props.title + site.titleSuffix`
 *  - `canonical` → explicit `props.canonical` override wins; otherwise
 *    `https://${site.domain}${pathname}` where `pathname` is the *public*
 *    browser path. Because the subdomain prefix (`/lineage`, `/nessa`, …) is
 *    an internal-only rewrite (applied by `vercel.json` host rewrites or, in
 *    their absence, by `src/middleware.ts`), `useLocation()` reports the
 *    prefixed path (`/lineage/privacy`) and we strip the prefix back off so
 *    the canonical reflects the public URL (`https://lineage.freno.me/privacy`).
 *  - `ogImage` → explicit `props.ogImage` wins; otherwise `site.ogDefaultImage`.
 *  - `ogTitle` / `ogDescription` → explicit override wins; otherwise fall
 *    back to the base title (no suffix) / description (existing behavior).
 */
import type { Site } from "~/lib/site-context";

export interface PageHeadProps {
  title: string;
  description?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  canonical?: string;
}

/**
 * Fully-resolved metadata computed by {@link resolvePageHeadMeta}. `PageHead`
 * renders these verbatim. Kept as an exported type so call sites / tests can
 * assert against the exact values without a DOM render.
 */
export interface ResolvedPageHeadMeta {
  /** Page title with the active site's `titleSuffix` appended. */
  title: string;
  description?: string;
  /** Canonical absolute URL for the current route. */
  canonical: string;
  /** OpenGraph title (falls back to the page title without suffix). */
  ogTitle: string;
  /** OpenGraph description (falls back to `description`). */
  ogDescription?: string;
  /** OpenGraph image (defaults to the site's `ogDefaultImage`). */
  ogImage: string;
}

export function resolvePageHeadMeta(
  props: PageHeadProps,
  site: Site,
  pathname: string
): ResolvedPageHeadMeta {
  const title = `${props.title}${site.titleSuffix}`;
  /**
   * The canonical URL is the *public* browser URL, never the internal route
   * prefix. SolidStart's file router is host-blind, so subdomain routes live
   * under `src/routes/<prefix>/*` and are served either by `vercel.json` host
   * rewrites OR by `src/middleware.ts` (the in-app host rewrite). Both append
   * the prefix to the internal request path (`/privacy` → `/lineage/privacy`),
   * so `useLocation()` reports the prefixed path — which we strip back off so
   * the canonical stays `https://lineage.freno.me/privacy`.
   */
  const publicPath =
    site.baseRoutePrefix &&
    (pathname === site.baseRoutePrefix ||
      pathname.startsWith(site.baseRoutePrefix + "/"))
      ? pathname.slice(site.baseRoutePrefix.length) || "/"
      : pathname;
  const canonical = props.canonical ?? `https://${site.domain}${publicPath}`;
  const ogTitle = props.ogTitle ?? props.title;
  const ogDescription = props.ogDescription ?? props.description;
  const ogImage = props.ogImage ?? site.ogDefaultImage;

  return {
    title,
    description: props.description,
    canonical,
    ogTitle,
    ogDescription,
    ogImage
  };
}
