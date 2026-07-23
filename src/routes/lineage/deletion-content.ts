/**
 * Pure content + metadata for the Lineage per-subdomain account-deletion page
 * (task 11).
 *
 * Imports NOTHING from solid-js / @solidjs/router / @solidjs/meta so the
 * constants here can be unit-tested in `bun:test` without spinning up the
 * router / MetaProvider, mirroring the `landing-content.ts` /
 * `downloads-content.ts` pattern.
 *
 * Cross-task contracts encoded here:
 *  - `DELETION_PRODUCT_KEY` is the `product` discriminator passed to the
 *    generalized `misc.sendDeletionRequestEmail` mutation
 *    (`src/server/api/routers/misc.ts`) so the email copy + cooldown cookie
 *    are Lineage-branded. The legacy mutation default is also `"lineage"`,
 *    so the migrated page is backward-compatible with any in-flight cooldown.
 *  - `DELETION_COOKIE_NAME` is the cooldown cookie read/written by
 *    `DeletionForm` — kept as the original `deletionRequestSent` name so
 *    installed cooldown state from the legacy `/deletion/life-and-lineage`
 *    route is honored across the 308 redirect (no forced re-send).
 *  - `DELETION_GRACE_PERIOD_MS` mirrors `LINEAGE_CONFIG.DELETION_GRACE_PERIOD_MS`
 *    (24h) — the window during which a user may email michael@freno.me to
 *    cancel the deletion before the central account row + per-user Turso DB
 *    are dropped. Surfaced here as a pure constant so the page copy + tests
 *    can assert the grace window without importing the server-side config
 *    module (which validates ~30 secrets at import time).
 *  - `LEGACY_DELETION_REDIRECT_TARGET` is the canonical absolute URL the
 *    legacy `/deletion/life-and-lineage` route 308-redirects to.
 */
import type { PageHeadProps } from "~/components/page-head-meta";

/**
 * Product discriminator for the generalized `sendDeletionRequestEmail`
 * mutation. The Lineage flow is the original / default product.
 */
export const DELETION_PRODUCT_KEY = "lineage" as const;

/**
 * Cooldown cookie name for the Lineage deletion request.
 *
 * Kept identical to the legacy cookie so an in-flight cooldown survives the
 * `/deletion/life-and-lineage` → `lineage.freno.me/deletion` redirect.
 */
export const DELETION_COOKIE_NAME = "deletionRequestSent";

/**
 * Grace period (ms) during which a Lineage account deletion can be cancelled
 * by emailing michael@freno.me. Mirrors
 * `LINEAGE_CONFIG.DELETION_GRACE_PERIOD_MS` (24h).
 */
export const DELETION_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

/**
 * Human-readable grace-window copy interpolated into the deletion page body.
 */
export const DELETION_GRACE_PERIOD_LABEL = "24-hour";

/** Base page title (site suffix appended by PageHead). */
export const PAGE_META: PageHeadProps = {
  title: "Account Deletion",
  description:
    "Request account deletion for Life and Lineage. All account data and remote saves are removed after a 24-hour grace period."
};

/**
 * Canonical absolute URL the legacy `/deletion/life-and-lineage` route
 * 308-redirects to (task 11). Kept here so tests can assert the redirect
 * target without importing the route module (which would pull the server
 * runtime).
 */
export const LEGACY_DELETION_REDIRECT_TARGET =
  "https://lineage.freno.me/deletion";
