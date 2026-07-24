/**
 * Unit tests for the generalized account-deletion-request email helpers
 * (see `misc.ts`).
 *
 * These are the pure, env-free helpers consumed by the
 * `misc.sendDeletionRequestEmail` tRPC mutation (re-exported from `misc.ts`).
 * Kept in a separate module so they can be exercised in `bun:test` without a
 * populated `.env` (which `~/env/server` requires at import time — un-runnable
 * in this worktree).
 *
 * Coverage:
 *  - `DELETION_PRODUCT_SCHEMA` accepts the two known products + rejects others.
 *  - `deletionCookieName` returns per-product distinct names; Lineage keeps
 *    the legacy `deletionRequestSent` for redirect backward-compat.
 *  - `deletionEmailContent` produces product-branded subject + operator +
 *    user HTML bodies; the requester email appears in the operator body and
 *    the account email appears in the user body; the 24h cancellation
 *    window instructions are present in the user body.
 */
import { describe, it, expect } from "bun:test";
import {
  DELETION_PRODUCT_SCHEMA,
  deletionCookieName,
  deletionEmailContent
} from "~/server/api/routers/deletion-email";

describe("DELETION_PRODUCT_SCHEMA", () => {
  it('accepts "lineage"', () => {
    expect(DELETION_PRODUCT_SCHEMA.safeParse("lineage").success).toBe(true);
  });

  it('accepts "nessa"', () => {
    expect(DELETION_PRODUCT_SCHEMA.safeParse("nessa").success).toBe(true);
  });

  it("rejects unknown products", () => {
    expect(DELETION_PRODUCT_SCHEMA.safeParse("gaze").success).toBe(false);
    expect(DELETION_PRODUCT_SCHEMA.safeParse("").success).toBe(false);
    expect(DELETION_PRODUCT_SCHEMA.safeParse(undefined).success).toBe(false);
  });
});

describe("deletionCookieName", () => {
  it("returns the legacy name for lineage (redirect backward-compat)", () => {
    expect(deletionCookieName("lineage")).toBe("deletionRequestSent");
  });

  it("returns a Nessa-specific name for nessa", () => {
    expect(deletionCookieName("nessa")).toBe("nessaDeletionRequestSent");
  });

  it("returns distinct names per product", () => {
    expect(deletionCookieName("lineage")).not.toBe(deletionCookieName("nessa"));
  });
});

describe("deletionEmailContent — Lineage", () => {
  const email = "player@example.com";
  const content = deletionEmailContent("lineage", email);

  it("uses the Lineage-branded subject", () => {
    expect(content.subject).toBe("Life and Lineage Acct Deletion");
  });

  it("operator body identifies the request + requester email", () => {
    expect(content.operatorHtml).toContain("Life and Lineage Account Deletion");
    expect(content.operatorHtml).toContain(email);
  });

  it("user body identifies the account to delete + 24h cancellation instructions", () => {
    expect(content.userHtml).toContain(email);
    expect(content.userHtml).toContain("Account to delete");
    expect(content.userHtml).toContain("michael@freno.me");
    expect(content.userHtml).toContain("24hrs");
  });
});

describe("deletionEmailContent — Nessa", () => {
  const email = "member@example.com";
  const content = deletionEmailContent("nessa", email);

  it("uses the Nessa-branded subject", () => {
    expect(content.subject).toBe("Nessa Acct Deletion");
  });

  it("operator body identifies the Nessa request + requester email", () => {
    expect(content.operatorHtml).toContain("Nessa Account Deletion");
    expect(content.operatorHtml).toContain(email);
  });

  it("user body identifies the account + mentions Nessa-specific cleanup", () => {
    expect(content.userHtml).toContain(email);
    expect(content.userHtml).toContain("Account to delete");
    expect(content.userHtml).toContain("michael@freno.me");
    expect(content.userHtml).toContain("24hrs");
    // Nessa-specific cleanup scope surfaced in the user-facing copy.
    expect(content.userHtml.toLowerCase()).toContain("memberships");
  });
});

describe("deletionEmailContent — branding isolation", () => {
  const email = "x@example.com";
  const lineage = deletionEmailContent("lineage", email);
  const nessa = deletionEmailContent("nessa", email);

  it("subjects differ per product", () => {
    expect(lineage.subject).not.toBe(nessa.subject);
  });

  it("Nessa body does not leak Lineage branding", () => {
    expect(nessa.userHtml).not.toContain("Life and Lineage");
    expect(nessa.operatorHtml).not.toContain("Life and Lineage");
  });

  it("Lineage body does not leak Nessa branding", () => {
    expect(lineage.userHtml).not.toContain("Nessa");
    expect(lineage.operatorHtml).not.toContain("Nessa");
  });
});
