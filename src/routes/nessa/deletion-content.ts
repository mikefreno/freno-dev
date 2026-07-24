/**
 * Pure content + metadata for the Nessa per-subdomain account-deletion page
 * (see `./deletion.tsx`).
 *
 * Mirrors the `lineage/deletion-content.ts` pattern: imports NOTHING from
 * solid-js / @solidjs/router / @solidjs/meta so the constants here can be
 * unit-tested in `bun:test` without spinning up the router / MetaProvider.
 *
 * Nessa deletion assessment:
 *  - Nessa DOES store user data. `src/server/api/routers/nessa.ts` defines
 *    per-user tables (`users`, `authProviders`, `workouts`, `workoutPlans`,
 *    `planExercises`, `planSets`, `routePoints`, `exerciseLibrary`) backed
 *    by a per-user Turso DB, and `nessa-community.ts` defines shared
 *    community tables (`clubs`, `clubMemberships`, …) keyed by `userId` /
 *    `ownerId`. Auth is Clerk. → A deletion flow IS needed.
 *  - Implemented here as the SAME email-request pattern Lineage uses: the
 *    requester submits their email via `DeletionForm`; the generalized
 *    `misc.sendDeletionRequestEmail` mutation sends a Nessa-branded email
 *    to michael@freno.me + the requester; Mike then manually drops the
 *    Nessa `users` row (+ cascades), the per-user Turso DB, and the user's
 *    community memberships within the 24h grace window. An authenticated
 *    self-delete via `nessa.deleteUser` + the Clerk Users API remains a
 *    follow-up (it requires Clerk backend secret wiring that is out of
 *    scope for the subdomain-routing feature); the email-request flow gives
 *    users a real, immediate deletion path today.
 *
 * Contracts:
 *  - `DELETION_PRODUCT_KEY = "nessa"` selects Nessa branding + the
 *    `nessaDeletionRequestSent` cooldown cookie (server-side
 *    `deletionCookieName("nessa")`).
 *  - `DELETION_COOKIE_NAME` MUST match `deletionCookieName("nessa")` so the
 *    client countdown reads the cookie the server actually sets.
 */
import type { PageHeadProps } from "~/components/page-head-meta";

/** Product discriminator forwarded to `misc.sendDeletionRequestEmail`. */
export const DELETION_PRODUCT_KEY = "nessa" as const;

/**
 * Cooldown cookie name — MUST match `deletionCookieName("nessa")` on the
 * server (`nessaDeletionRequestSent`).
 */
export const DELETION_COOKIE_NAME = "nessaDeletionRequestSent";

/** Human-readable grace-window copy interpolated into the page body. */
export const DELETION_GRACE_PERIOD_LABEL = "24-hour";

/** Base page title (site suffix appended by PageHead). */
export const PAGE_META: PageHeadProps = {
  title: "Account Deletion",
  description:
    "Request account deletion for Nessa. Your Nessa account, workout data, and community memberships are removed after a 24-hour grace period."
};
