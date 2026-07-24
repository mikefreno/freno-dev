import { Title, Meta, Link } from "@solidjs/meta";
import { useLocation } from "@solidjs/router";
import { useSite } from "~/context/SiteContext";
import {
  resolvePageHeadMeta,
  type PageHeadProps
} from "~/components/page-head-meta";

// Re-export the pure types + resolver so existing imports
// (`import { PageHead } from "~/components/PageHead"`) plus any consumer that
// wants the meta helper resolve from a single module path.
export {
  resolvePageHeadMeta,
  type PageHeadProps,
  type ResolvedPageHeadMeta
} from "~/components/page-head-meta";

/**
 * PageHead component for consistent page metadata across the application.
 *
 * Site-aware: reads `useSite()` for the per-site title suffix,
 * canonical domain, and default OpenGraph image, so the same component
 * renders `" | Michael Freno"` / `" | Nessa"` / … depending on the active
 * subdomain. Canonical URLs are auto-derived from the site domain + the
 * current router pathname unless an explicit `canonical` override is given.
 *
 * The actual derivation lives in the pure `resolvePageHeadMeta` helper (see
 * `~/components/page-head-meta.ts`) so it can be unit-tested without a DOM.
 *
 * @example
 * ```tsx
 * <PageHead
 *   title="Blog"
 *   description="Technical blog posts about web development"
 *   ogImage="https://example.com/og-image.jpg"
 * />
 * ```
 */
export default function PageHead(props: PageHeadProps) {
  const site = useSite();
  const location = useLocation();

  const meta = () => resolvePageHeadMeta(props, site(), location.pathname);

  return (
    <>
      <Title>{meta().title}</Title>
      {meta().description && (
        <Meta name="description" content={meta().description} />
      )}
      <Link rel="canonical" href={meta().canonical} />

      {/* Open Graph / Social Media Tags */}
      <Meta property="og:title" content={meta().ogTitle} />
      {meta().ogDescription && (
        <Meta property="og:description" content={meta().ogDescription} />
      )}
      <Meta property="og:image" content={meta().ogImage} />
    </>
  );
}

// Named export for consistency
export { PageHead };
