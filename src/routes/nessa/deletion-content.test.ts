/**
 * Unit tests for the Nessa per-subdomain account-deletion page content
 * (task 11).
 *
 * Asserts against pure constants exported from `deletion-content.ts` — no
 * solid-js / router / DOM. Covers the task-11 acceptance matrix for the
 * Nessa deletion flow:
 *  - Product discriminator is `"nessa"` (selects Nessa-branded email).
 *  - Cooldown cookie name is Nessa-specific + matches the server-side
 *    `deletionCookieName("nessa")`.
 *  - PageHead base title + description.
 *  - (Assessment rationale documented in `deletion-content.ts`.)
 */
import { describe, it, expect } from "bun:test";
import {
  DELETION_PRODUCT_KEY,
  DELETION_COOKIE_NAME,
  DELETION_GRACE_PERIOD_LABEL,
  PAGE_META
} from "~/routes/nessa/deletion-content";
import {
  DELETION_PRODUCT_SCHEMA,
  deletionCookieName
} from "~/server/api/routers/deletion-email";

describe("Nessa deletion — assessment outcome", () => {
  it("defines a product discriminator (deletion flow IS implemented)", () => {
    // Nessa stores user data (nessa.ts: users, workouts, workoutPlans, … +
    // nessa-community.ts: clubs, clubMemberships). Per task 11 spec step 5,
    // a deletion flow IS needed — this page provides it.
    expect(typeof DELETION_PRODUCT_KEY).toBe("string");
  });
});

describe("Nessa deletion — product discriminator", () => {
  it("is \"nessa\" (selects Nessa-branded email)", () => {
    expect(DELETION_PRODUCT_KEY).toBe("nessa");
  });

  it("is accepted by the server-side product schema", () => {
    expect(DELETION_PRODUCT_SCHEMA.safeParse(DELETION_PRODUCT_KEY).success).toBe(
      true
    );
  });
});

describe("Nessa deletion — cooldown cookie", () => {
  it("uses a Nessa-specific cookie name (independent of Lineage cooldown)", () => {
    expect(DELETION_COOKIE_NAME).toBe("nessaDeletionRequestSent");
  });

  it("matches the server-side deletionCookieName(\"nessa\")", () => {
    expect(DELETION_COOKIE_NAME).toBe(
      deletionCookieName(DELETION_PRODUCT_KEY)
    );
  });

  it("does NOT collide with the Lineage cooldown cookie", () => {
    expect(DELETION_COOKIE_NAME).not.toBe("deletionRequestSent");
  });
});

describe("Nessa deletion — grace period label", () => {
  it("surfaces a human-readable 24-hour label in the copy", () => {
    expect(DELETION_GRACE_PERIOD_LABEL).toBe("24-hour");
  });
});

describe("Nessa deletion — PageHead inputs", () => {
  it("passes the base title (suffix is appended by PageHead)", () => {
    expect(PAGE_META.title).toBe("Account Deletion");
  });

  it("does not pre-bake the site suffix into the title", () => {
    expect(PAGE_META.title).not.toContain("|");
  });

  it("description mentions Nessa + data removal + grace period", () => {
    const desc = PAGE_META.description.toLowerCase();
    expect(desc).toContain("nessa");
    expect(desc).toContain("removed");
    expect(desc).toContain("24-hour");
  });
});
