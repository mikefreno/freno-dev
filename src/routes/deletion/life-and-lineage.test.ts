/**
 * Regression test for the legacy `/deletion/life-and-lineage` route.
 *
 * The route was converted from a rendered page into a 308 permanent redirect
 * to `lineage.freno.me/deletion`. Because the route file is a SolidStart
 * server module, this is a STATIC SOURCE AUDIT (same pattern as the
 * `misc.test.ts` regression tests) asserting:
 *  - The route exports a `GET` handler (API-route redirect, not a page).
 *  - The response status is 308 (permanent).
 *  - The `Location` header derives from the centralized
 *    `LEGACY_DELETION_REDIRECT_TARGET` constant (not a hardcoded literal), so
 *    the unit test in `deletion-content.test.ts` is the single source of
 *    truth for the destination.
 *  - No page component / DeletionForm import remains (the form moved to
 *    `src/routes/lineage/deletion.tsx`).
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = readFileSync(
  join(import.meta.dir, "life-and-lineage.tsx"),
  "utf8"
);

describe("Legacy /deletion/life-and-lineage — redirect", () => {
  it("is a GET handler (API-route redirect, not a rendered page)", () => {
    expect(SOURCE).toContain("export function GET()");
    expect(SOURCE).not.toContain("export default function");
  });

  it("responds with a 308 permanent redirect", () => {
    expect(SOURCE).toContain("status: 308");
  });

  it("derives the Location from the centralized constant", () => {
    expect(SOURCE).toContain("LEGACY_DELETION_REDIRECT_TARGET");
    // The constant is imported from the lineage deletion-content module.
    expect(SOURCE).toContain("~/routes/lineage/deletion-content");
  });

  it("no longer ships a page component / DeletionForm", () => {
    expect(SOURCE).not.toContain("DeletionForm");
    expect(SOURCE).not.toContain("PageHead");
  });
});
