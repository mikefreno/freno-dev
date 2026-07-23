/**
 * Unit tests for the Lineage per-subdomain account-deletion page content
 * (task 11).
 *
 * Asserts against pure constants exported from `deletion-content.ts` — no
 * solid-js / router / DOM. Covers the task-11 acceptance matrix:
 *  - Product discriminator is `"lineage"` (selects Lineage-branded email).
 *  - Cooldown cookie name is the legacy `deletionRequestSent` so an in-flight
 *    cooldown survives the `/deletion/life-and-lineage` → subdomain redirect.
 *  - Cookie name matches the server-side `deletionCookieName("lineage")`.
 *  - Grace-period label + value mirror `LINEAGE_CONFIG.DELETION_GRACE_PERIOD_MS`.
 *  - Legacy redirect target points at the lineage subdomain deletion URL.
 */
import { describe, it, expect } from "bun:test";
import {
  DELETION_PRODUCT_KEY,
  DELETION_COOKIE_NAME,
  DELETION_GRACE_PERIOD_MS,
  DELETION_GRACE_PERIOD_LABEL,
  PAGE_META,
  LEGACY_DELETION_REDIRECT_TARGET
} from "~/routes/lineage/deletion-content";
import {
  DELETION_PRODUCT_SCHEMA,
  deletionCookieName
} from "~/server/api/routers/deletion-email";

describe("Lineage deletion — product discriminator", () => {
  it("is \"lineage\" (selects Lineage-branded email)", () => {
    expect(DELETION_PRODUCT_KEY).toBe("lineage");
  });

  it("is accepted by the server-side product schema", () => {
    expect(DELETION_PRODUCT_SCHEMA.safeParse(DELETION_PRODUCT_KEY).success).toBe(
      true
    );
  });
});

describe("Lineage deletion — cooldown cookie", () => {
  it("uses the legacy cookie name for redirect backward-compat", () => {
    // An in-flight cooldown from the old /deletion/life-and-lineage route
    // MUST be honored across the 308 redirect — keep the legacy cookie name.
    expect(DELETION_COOKIE_NAME).toBe("deletionRequestSent");
  });

  it("matches the server-side deletionCookieName(\"lineage\")", () => {
    expect(DELETION_COOKIE_NAME).toBe(
      deletionCookieName(DELETION_PRODUCT_KEY)
    );
  });
});

describe("Lineage deletion — grace period", () => {
  it("mirrors LINEAGE_CONFIG.DELETION_GRACE_PERIOD_MS (24h)", () => {
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    expect(DELETION_GRACE_PERIOD_MS).toBe(TWENTY_FOUR_HOURS_MS);
  });

  it("surfaces a human-readable 24-hour label in the copy", () => {
    expect(DELETION_GRACE_PERIOD_LABEL).toBe("24-hour");
  });
});

describe("Lineage deletion — PageHead inputs", () => {
  it("passes the base title (suffix is appended by PageHead)", () => {
    expect(PAGE_META.title).toBe("Account Deletion");
  });

  it("does not pre-bake the site suffix into the title", () => {
    expect(PAGE_META.title).not.toContain("|");
  });

  it("description mentions the grace period + account data removal", () => {
    const desc = PAGE_META.description.toLowerCase();
    expect(desc).toContain("24-hour");
    expect(desc).toContain("life and lineage");
  });
});

describe("Lineage deletion — legacy redirect target", () => {
  it("points at the lineage subdomain deletion URL", () => {
    expect(LEGACY_DELETION_REDIRECT_TARGET).toBe(
      "https://lineage.freno.me/deletion"
    );
  });

  it("is an absolute https URL", () => {
    expect(LEGACY_DELETION_REDIRECT_TARGET.startsWith("https://")).toBe(true);
  });

  it("does not reference the legacy /deletion/life-and-lineage path", () => {
    expect(LEGACY_DELETION_REDIRECT_TARGET).not.toContain(
      "deletion/life-and-lineage"
    );
  });
});
