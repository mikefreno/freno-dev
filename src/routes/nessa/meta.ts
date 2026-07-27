/**
 * Deterministic `PageHead` metadata for the Nessa landing page.
 *
 * Pure module — imports NOTHING from solid-js / @solidjs/router / @solidjs/meta —
 * so the landing-page metadata can be unit-tested in `bun:test` without
 * spinning up the router / MetaProvider / DOM, mirroring the
 * `page-head-meta.ts` / `nav-config.ts` testability pattern.
 *
 * Nessa is positioned as a privacy-first fitness app
 * (per `~/code/Nessa/plans/2026-03-16-marketing-strategy-launch-positioning.md`).
 * The description still mentions community features (clubs, challenges) because
 * those are real free-tier capabilities, but it now leads with the product's
 * actual purpose: fitness tracking.
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
  title: "Home",
  description:
    "Nessa is the fitness app that puts you first. Track running, cycling, swimming and more; compete on free segment leaderboards; and connect with friends through clubs, community challenges, and a social feed — all while keeping your data on your device.",
  ogTitle: "Nessa — The fitness app that puts you first",
  ogDescription:
    "A privacy-first fitness app with segment leaderboards free forever, social clubs, community challenges, Apple Watch support, and affordable premium tiers."
};
