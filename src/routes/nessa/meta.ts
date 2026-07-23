/**
 * Deterministic `PageHead` metadata for the Nessa landing page (task 07).
 *
 * Pure module — imports NOTHING from solid-js / @solidjs/router / @solidjs/meta —
 * so the landing-page metadata can be unit-tested in `bun:test` without
 * spinning up the router / MetaProvider / DOM, mirroring the
 * `page-head-meta.ts` / `nav-config.ts` testability pattern.
 *
 * `index.tsx` imports `NESSA_LANDING_META` and feeds it to `<PageHead …/>`;
 * `meta.test.ts` asserts the *resolved* title / canonical / OG values against
 * the site-aware `resolvePageHeadMeta` helper (task 02) for the `nessa` site.
 *
 * Nessa-specific metadata contract:
 *  - `<title>` resolves to `"Nessa | Nessa"` (props.title + nessa.titleSuffix).
 *  - canonical resolves to `https://nessa.freno.me/` (auto-derived from
 *    `site.domain` + the browser pathname `/` — the vercel.json host rewrite
 *    targets the internal `/nessa` prefix but leaves the public URL clean).
 *  - `og:image` falls back to the site's `ogDefaultImage` (`/nessa/og-default.png`).
 *  - description emphasizes Nessa's community capabilities (clubs, challenges,
 *    social feed, events) — derived from `nessaCommunityRouter`, not fabricated.
 */
import type { PageHeadProps } from "~/components/page-head-meta";

/**
 * PageHead props for the Nessa landing page.
 *
 * `title` is intentionally `"Nessa"` so the site-aware suffix composes into
 * `"Nessa | Nessa"`. An explicit `ogTitle` is provided so the OG card reads
 * as a clean brand title rather than the bare `"Nessa"` (which would be the
 * no-suffix fallback) — this matches the marketing-copy intent of the card.
 */
export const NESSA_LANDING_META: PageHeadProps = {
  title: "Nessa",
  description:
    "Nessa is a community platform for building clubs, running challenges, sharing in a social feed, and organizing events.",
  ogTitle: "Nessa — Build community. Run challenges. Stay connected.",
  ogDescription:
    "Nessa brings clubs, challenges, social posts, and events together in one community platform."
};
