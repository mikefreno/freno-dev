/**
 * Pure helpers for the generalized account-deletion-request email flow
 * (see `misc.ts`).
 *
 * Extracted from `src/server/api/routers/misc.ts` so they can be unit-tested
 * in `bun:test` WITHOUT importing `~/env/server` (which validates ~30 secrets
 * at import time and is therefore un-runnable in a worktree without a
 * populated `.env`). This mirrors the `page-head-meta.ts` / `nav-config.ts`
 * testability pattern.
 *
 * `misc.ts` re-exports these for convenience; the deletion tRPC mutation
 * consumes them directly.
 */
import { z } from "zod";

/**
 * Product whose account is being deleted. Drives email branding + the
 * cooldown cookie name so per-product cooldowns don't interfere.
 */
export const DELETION_PRODUCT_SCHEMA = z.enum(["lineage", "nessa"]);
export type DeletionProduct = z.infer<typeof DELETION_PRODUCT_SCHEMA>;

/**
 * Cooldown cookie name for a given product. Lineage keeps the legacy
 * `deletionRequestSent` name so an in-flight cooldown from the old
 * `/deletion/life-and-lineage` route is honored across the 308 redirect
 * (no forced re-send). Nessa uses a distinct name so its cooldown is
 * independent.
 */
export function deletionCookieName(product: DeletionProduct): string {
  return product === "nessa"
    ? "nessaDeletionRequestSent"
    : "deletionRequestSent";
}

/** Branded copy for the deletion-request emails (operator + user-facing). */
export interface DeletionEmailContent {
  /** Email subject line (shared by operator + user emails). */
  subject: string;
  /** HTML body sent to michael@freno.me (the operator). */
  operatorHtml: string;
  /** HTML body sent to the requester (the user). */
  userHtml: string;
}

/**
 * Build the product-branded deletion-request email content.
 *
 * The operator email identifies the request name + requester email; the user
 * email identifies the account being deleted + the 24h cancellation window.
 * The `product` discriminator switches branding between Lineage (the original
 * flow) and Nessa (Nessa stores user data in its own Turso DB).
 *
 * `email` is interpolated verbatim into the HTML bodies. It has already been
 * validated as a well-formed email by the tRPC input schema, and Sendinblue
 * renders HTML bodies, so the value is not re-escaped here — matching the
 * original Lineage implementation's behavior to avoid regressing the existing
 * flow's email formatting.
 */
export function deletionEmailContent(
  product: DeletionProduct,
  email: string
): DeletionEmailContent {
  if (product === "nessa") {
    return {
      subject: "Nessa Acct Deletion",
      operatorHtml: `<html><head></head><body><div>Request Name: Nessa Account Deletion</div><div>Request Email: ${email}</div></body></html>`,
      userHtml: `<html><head></head><body><div>Request Name: Nessa Account Deletion</div><div>Account to delete: ${email}</div><div>You can email michael@freno.me in the next 24hrs to cancel the deletion, email with subject line "Account Deletion Cancellation". Your Nessa account row, workout / plan data, and community memberships will be removed.</div></body></html>`
    };
  }
  return {
    subject: "Life and Lineage Acct Deletion",
    operatorHtml: `<html><head></head><body><div>Request Name: Life and Lineage Account Deletion</div><div>Request Email: ${email}</div></body></html>`,
    userHtml: `<html><head></head><body><div>Request Name: Life and Lineage Account Deletion</div><div>Account to delete: ${email}</div><div>You can email michael@freno.me in the next 24hrs to cancel the deletion, email with subject line "Account Deletion Cancellation"</div></body></html>`
  };
}
