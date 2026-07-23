/**
 * Unit tests for the Nessa landing page metadata (task 07).
 *
 * Asserts the task-spec unit criterion: "PageHead on nessa site produces
 * correct title suffix and canonical." Mirrors the `page-head-meta.ts`
 * testability pattern — `nessa/meta.ts` is a pure module (no solid-js /
 * @solidjs/router / @solidjs/meta imports) so `bun:test` can resolve it.
 *
 * The resolved values are produced by the (task-02) `resolvePageHeadMeta`
 * helper over `NESSA_LANDING_META` + `SITE_CONFIG.nessa` + the browser
 * pathname `/` — exactly what `<PageHead>` emits on `nessa.freno.me/`.
 */
import { describe, it, expect } from "bun:test";
import { resolvePageHeadMeta } from "~/components/page-head-meta";
import { SITE_CONFIG } from "~/lib/site-context";
import { NESSA_LANDING_META } from "./meta";

describe("Nessa landing page — PageHead metadata", () => {
  it("title composes to 'Nessa | Nessa' (base title + nessa titleSuffix)", () => {
    const meta = resolvePageHeadMeta(NESSA_LANDING_META, SITE_CONFIG.nessa, "/");
    expect(meta.title).toBe("Nessa | Nessa");
  });

  it("title contains the substring 'Nessa'", () => {
    const meta = resolvePageHeadMeta(NESSA_LANDING_META, SITE_CONFIG.nessa, "/");
    expect(meta.title).toContain("Nessa");
  });

  it("canonical is https://nessa.freno.me/ for the landing route", () => {
    const meta = resolvePageHeadMeta(NESSA_LANDING_META, SITE_CONFIG.nessa, "/");
    expect(meta.canonical).toBe("https://nessa.freno.me/");
  });

  it("ogImage falls back to the nessa site default", () => {
    const meta = resolvePageHeadMeta(NESSA_LANDING_META, SITE_CONFIG.nessa, "/");
    expect(meta.ogImage).toBe(SITE_CONFIG.nessa.ogDefaultImage);
  });

  it("ogTitle uses the explicit marketing copy, not the bare title", () => {
    const meta = resolvePageHeadMeta(NESSA_LANDING_META, SITE_CONFIG.nessa, "/");
    expect(meta.ogTitle).toBe(NESSA_LANDING_META.ogTitle);
    expect(meta.ogTitle).not.toBe("Nessa");
  });

  it("description mentions community capabilities", () => {
    const meta = resolvePageHeadMeta(NESSA_LANDING_META, SITE_CONFIG.nessa, "/");
    expect(meta.description).toBe(NESSA_LANDING_META.description);
    expect(meta.description?.toLowerCase()).toContain("community");
    expect(meta.description?.toLowerCase()).toContain("challenges");
  });
});
