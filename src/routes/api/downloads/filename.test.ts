/**
 * Regression test for the downloads proxy filename allowlist (NOOK-337).
 *
 * The v0.10.0 publish failed its CI enclosure check because Sparkle names
 * delta files after the app bundle ("Nook17-9.delta") while the DMG is named
 * "TheNook-*.dmg" — and "Nook" was missing from the allowlist, so every Nook
 * delta request 400'd with "Invalid file format" while the DMG passed.
 *
 * The route hits S3 and cannot be unit-tested under bun:test, so this is a
 * STATIC SOURCE AUDIT — the same pattern the downloads.test.ts regressions
 * use.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = readFileSync(
  join(import.meta.dir, "[filename].ts"),
  "utf8"
);

describe("Downloads proxy filename allowlist (NOOK-337)", () => {
  it("allows the Nook app-bundle prefix used by Sparkle delta names", () => {
    expect(SOURCE).toContain('"Nook"');
  });

  it("still allows every previously served prefix", () => {
    for (const prefix of ["Gaze", "InputHalo", "TheNook"]) {
      expect(SOURCE).toContain(`"${prefix}"`);
    }
  });

  it("still serves the extensions Sparkle fetches", () => {
    for (const ext of [".dmg", ".delta", ".zip"]) {
      expect(SOURCE).toContain(`"${ext}"`);
    }
  });
});
