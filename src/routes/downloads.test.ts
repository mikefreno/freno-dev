/**
 * Regression test for the unified `freno.me/downloads` page (task 11).
 *
 * Task 11's acceptance criteria require that the unified downloads page is
 * UNCHANGED — it keeps listing all five products (InputHalo, Gaze, Life and
 * Lineage, Cork, Shapes with Abigail) with the original asset keys + store
 * links. Because the page is a SolidJS component (DOM render not configured
 * under `bun:test`), this is a STATIC SOURCE AUDIT — the same pattern the
 * p8-001 / p8-008 `misc.test.ts` regression tests use.
 *
 * Audits `src/routes/downloads.tsx` for:
 *  - All five product labels present (no removal / rename).
 *  - The Lineage APK asset key (`"lineage"`) is still wired to the download
 *    button — the per-subdomain `lineage.freno.me/downloads` page MUST serve
 *    the byte-identical APK, which requires the same S3 asset key.
 *  - The Life and Lineage App Store link is intact.
 *  - No accidental deletion of the other products' sections.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = readFileSync(join(import.meta.dir, "downloads.tsx"), "utf8");

describe("Unified downloads page — product list (regression)", () => {
  it("renders all five product sections", () => {
    // The unified page is intentionally ordered by date of initial release.
    expect(SOURCE).toContain("InputHalo");
    expect(SOURCE).toContain("Gaze");
    expect(SOURCE).toContain("Life and Lineage");
    expect(SOURCE).toContain("Cork");
    expect(SOURCE).toContain("Shapes with Abigail");
  });

  it("does not trim the Five-products comment / ordering note", () => {
    expect(SOURCE).toContain("Ordered by date of initial release");
  });
});

describe("Unified downloads page — Lineage section (byte-identical APK)", () => {
  it("still wires the Lineage APK button to the \"lineage\" tRPC asset key", () => {
    // Same asset key the per-subdomain lineage/downloads page uses → both
    // origins serve the byte-identical S3 object (`Life and Lineage.apk`).
    expect(SOURCE).toContain('download("lineage")');
  });

  it("still links to the Life and Lineage App Store URL", () => {
    expect(SOURCE).toContain(
      "https://apps.apple.com/us/app/life-and-lineage/id6737252442"
    );
  });

  it("does not redirect Lineage downloads away to the subdomain", () => {
    // The unified page keeps an inline APK download — it must NOT delegate to
    // lineage.freno.me/downloads (that would be a regression of the unified
    // "one page lists everything" UX).
    expect(SOURCE).not.toContain("lineage.freno.me");
  });
});
