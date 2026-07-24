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
 *    `https://${site.domain}${pathname}`. The pathname is the *browser* path
 *    (from `useLocation`), which is correct because vercel.json host rewrites
 *    target internal route prefixes (`/nessa`, `/lineage`, …) while leaving
 *    the public URL intact — so `nessa.freno.me/contact` reports pathname
 *    `/contact`, and the canonical is `https://nessa.freno.me/contact`.
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
  const canonical = props.canonical ?? `https://${site.domain}${pathname}`;
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
