/**
 * Unit tests for the Nessa landing page metadata.
 *
 * Mirrors the `page-head-meta.ts` testability pattern — `nessa/meta.ts` is a
 * pure module (no solid-js / @solidjs/router / @solidjs/meta imports) so
 * `bun:test` can resolve it. Asserts the metadata matches Nessa's actual
 * product positioning as a privacy-first fitness app
 * (per `~/code/Nessa/plans/2026-03-16-marketing-strategy-launch-positioning.md`).
 */
import { describe, it, expect } from "bun:test";
import { resolvePageHeadMeta } from "~/components/page-head-meta";
import { SITE_CONFIG } from "~/lib/site-context";
import { NESSA_LANDING_META } from "./meta";

describe("Nessa landing page — PageHead metadata", () => {
  it("title composes to 'Nessa | Nessa' (base title + nessa titleSuffix)", () => {
    const meta = resolvePageHeadMeta(
      NESSA_LANDING_META,
      SITE_CONFIG.nessa,
      "/"
    );
    expect(meta.title).toBe("Nessa | Nessa");
  });

  it("title contains the substring 'Nessa'", () => {
    const meta = resolvePageHeadMeta(
      NESSA_LANDING_META,
      SITE_CONFIG.nessa,
      "/"
    );
    expect(meta.title).toContain("Nessa");
  });

  it("canonical is https://nessa.freno.me/ for the landing route", () => {
    const meta = resolvePageHeadMeta(
      NESSA_LANDING_META,
      SITE_CONFIG.nessa,
      "/"
    );
    expect(meta.canonical).toBe("https://nessa.freno.me/");
  });

  it("ogImage falls back to the nessa site default", () => {
    const meta = resolvePageHeadMeta(
      NESSA_LANDING_META,
      SITE_CONFIG.nessa,
      "/"
    );
    expect(meta.ogImage).toBe(SITE_CONFIG.nessa.ogDefaultImage);
  });

  it("ogTitle uses the explicit marketing copy, not the bare title", () => {
    const meta = resolvePageHeadMeta(
      NESSA_LANDING_META,
      SITE_CONFIG.nessa,
      "/"
    );
    expect(meta.ogTitle).toBe(NESSA_LANDING_META.ogTitle);
    expect(meta.ogTitle).not.toBe("Nessa");
  });

  it("description positions Nessa as a fitness app with community features", () => {
    const meta = resolvePageHeadMeta(
      NESSA_LANDING_META,
      SITE_CONFIG.nessa,
      "/"
    );
    expect(meta.description).toBe(NESSA_LANDING_META.description);
    expect(meta.description?.toLowerCase()).toContain("fitness");
    expect(meta.description?.toLowerCase()).toContain("segment");
    expect(meta.description?.toLowerCase()).toContain("community");
    expect(meta.description?.toLowerCase()).toContain("challenges");
  });

  it("ogDescription mentions free leaderboards and affordable pricing", () => {
    const meta = resolvePageHeadMeta(
      NESSA_LANDING_META,
      SITE_CONFIG.nessa,
      "/"
    );
    expect(meta.ogDescription?.toLowerCase()).toContain("leaderboards");
    expect(meta.ogDescription?.toLowerCase()).toContain("affordable");
  });
});
