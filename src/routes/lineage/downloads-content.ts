/**
 * Pure content + metadata for the Lineage per-subdomain downloads page
 * (task 11).
 *
 * Mirrors the `landing-content.ts` / `page-head-meta.ts` / `nav-config.ts`
 * pattern: imports NOTHING from solid-js / @solidjs/router / @solidjs/meta so
 * the constants here can be unit-tested in `bun:test` without spinning up the
 * router / MetaProvider — and so the acceptance matrix (asset key, App Store
 * URL, PageHead inputs) is asserted against structurally without a DOM render.
 *
 * The render layer (`./downloads.tsx`) is a thin JSX consumer of these
 * values; keeping them externalized means changes to the download target /
 * store link surface as test failures rather than silent regressions.
 *
 * Cross-task contracts encoded here:
 *  - `LINEAGE_DOWNLOAD_ASSET` is the tRPC `downloads.getDownloadUrl` asset key
 *    (`"lineage"`) → resolves to `Life and Lineage.apk` in
 *    `src/server/api/routers/downloads.ts`. It MUST match the key used by the
 *    unified `freno.me/downloads` page so the APK served is byte-identical
 *    from both origins (single S3 source of truth).
 *  - `LINEAGE_APP_STORE_URL` is the canonical App Store link — kept identical
 *    to the value surfaced on the landing page (`landing-content.ts`) and the
 *    unified downloads page, so the store front is consistent across origins.
 *  - `LINEAGE_DOWNLOADS_META` is consumed verbatim by `<PageHead>`; the
 *    per-site title suffix (` | Life and Lineage`) is appended automatically
 *    by `resolvePageHeadMeta` (task 02), so `title` here is the BASE title
 *    only — do NOT include the suffix.
 */
import type { PageHeadProps } from "~/components/page-head-meta";

/**
 * tRPC `downloads.getDownloadUrl` asset key for the Lineage Android APK.
 *
 * Maps to `Life and Lineage.apk` in the downloads router's `assets` table.
 * Shared with the unified `freno.me/downloads` page (no separate asset path).
 */
export const LINEAGE_DOWNLOAD_ASSET = "lineage" as const;

/**
 * Android download CTA copy.
 *
 * Kept in sync with the unified downloads page's Lineage section so the
 * button label is consistent across origins.
 */
export const LINEAGE_APK_BUTTON_LABEL = "download.apk";

/**
 * Apple App Store link — identical to `APP_STORE_URL` in `landing-content.ts`
 * (single source of truth: the canonical Life and Lineage App Store URL).
 */
export const LINEAGE_APP_STORE_URL =
  "https://apps.apple.com/us/app/life-and-lineage/id6737252442";

/**
 * Public browser path back to the Lineage landing page (subdomain-relative).
 *
 * vercel.json rewrites `lineage.freno.me/` → the internal `/lineage/` route
 * prefix while leaving the browser URL clean (task 02 canonical rule).
 */
export const LINEAGE_HOME_HREF = "/";

/** Base page title (site suffix appended by PageHead). */
export const PAGE_META: PageHeadProps = {
  title: "Downloads",
  description:
    "Download Life and Lineage — Android APK or on the App Store for iOS. A dark fantasy adventure mobile game."
};
