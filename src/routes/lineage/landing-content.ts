/**
 * Pure content + metadata for the Lineage subdomain landing page.
 *
 * Intentionally imports NOTHING from solid-js / @solidjs/router / @solidjs/meta
 * so the constant set here can be unit-tested in `bun:test` without spinning
 * up the SolidJS router / MetaProvider — mirroring the pattern established by
 * `page-head-meta.ts` and `nav-config.ts`.
 *
 * The render layer (`./index.tsx`) is a thin JSX consumer of these values:
 * keeping them externalized means the acceptance matrix (App Store URL,
 * Google Play → subdomain `/downloads` link, feature highlight copy, PageHead
 * title/description) is asserted against in `landing-content.test.ts` without
 * a DOM render.
 *
 * Contracts encoded here:
 *  - `APP_STORE_URL` is the canonical App Store link the marketing page has
 *    always surfaced (kept stable across the migration).
 *  - `DOWNLOADS_HREF` is the **public browser path** on the lineage subdomain
 *    (`/downloads`), NOT the internal vercel-rewritten prefix `/lineage/downloads`.
 *    This matches the canonical-URL rule and the nav-config rule
 *    from the spec: vercel.json maps `lineage.freno.me/downloads` →
 *    `/lineage/downloads` server-side while the browser sees `/downloads`.
 *    Task 11 will create the matching `src/routes/lineage/downloads.tsx`.
 *  - `PAGE_META` is consumed verbatim by `<PageHead>`; the per-site title
 *    suffix (` | Life and Lineage`) is appended automatically by
 *    `resolvePageHeadMeta`, so the `title` here is the BASE title
 *    only — do NOT include the suffix.
 */

import { buildSubdomainUrl } from "~/lib/site-context";

/** Apple App Store link — surfaced unchanged from the legacy marketing page. */
export const APP_STORE_URL =
  "https://apps.apple.com/us/app/life-and-lineage/id6737252442";

/**
 * Public browser path to the per-subdomain downloads page.
 * Subdomain-relative: renders `lineage.freno.me/downloads` in the browser.
 */
export const DOWNLOADS_HREF = "/downloads";

/** App icon asset, served from the site root (shared with the main site). */
export const APP_ICON_SRC = "/LineageIcon.png";

/** Google Play badge asset (shared with the main site's downloads page). */
export const GOOGLE_PLAY_BADGE_SRC = "/google-play-badge.png";

/** Screenshot / game-art assets used in the enhanced marketing content. */
export const SCREENSHOT_ASSETS = {
  home: "/lineage-home.png",
  shops: "/lineage-shops.png",
  preview: "/lineage-preview.mp4"
} as const;

/** Base page title (site suffix appended by PageHead). */
export const PAGE_META = {
  title: "Life and Lineage",
  description:
    "A dark fantasy adventure mobile game. Download Life and Lineage on the App Store and Google Play."
} as const;

/**
 * Feature highlights surfaced in the enhanced marketing section.
 *
 * Each entry is `{ title, description }` so the renderer can present them
 * in a uniform grid; the test asserts the full set is present so the
 * acceptance criteria ("dark fantasy adventure, mobile game, remote saves,
 * PvP") is verified structurally.
 */
export interface LineageFeature {
  title: string;
  description: string;
}

export const FEATURES: readonly LineageFeature[] = [
  {
    title: "Dark Fantasy Adventure",
    description:
      "Carve your legend through a grim, atmospheric world steeped in dark fantasy."
  },
  {
    title: "Built for Mobile",
    description:
      "Jump in anywhere — designed ground-up for quick sessions on iOS and Android."
  },
  {
    title: "Remote Saves",
    description:
      "Your lineage follows you across devices with cloud-backed character saves."
  },
  {
    title: "PvP Combat",
    description:
      "Test your build against other lineages in head-to-head PvP showdowns."
  }
];

/**
 * Canonical absolute URL the legacy `/marketing/life-and-lineage` route
 * 308-redirects to (see `src/routes/marketing/life-and-lineage.ts`). Kept here
 * so tests can assert the redirect target without importing the route module
 * (which would pull in the server runtime).
 */
export const LEGACY_REDIRECT_TARGET = buildSubdomainUrl("lineage");
