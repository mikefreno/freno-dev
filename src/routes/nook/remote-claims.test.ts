/**
 * Regression test for the removed remote / SSH claims and the removed agent
 * count (FRE-323, FRE-359 verdict B).
 *
 * FRE-323 took the remote story off the site because it was unverified and
 * demo-gated (FRE-315, FRE-320, FRE-322 §3 correction 4): the "one click
 * installs the nook-hook" flow is app-UI-only, needs a hand-edited
 * `~/.ssh/config` for any host not already in ssh config or on the tailnet,
 * needs a one-time `ssh-copy-id` because the app runs ssh with
 * `BatchMode=yes`, and has no manual fallback for minting the per-host
 * credential. FRE-359 verdict B removed the coverage count for the same
 * reason: the /agents table lists 13 of the registry's 18 rows.
 *
 * The copy was not thrown away — it is parked in
 * `marketing/drafts/remote-ssh/` with the restore gate, and this test asserts
 * it is still there so nobody deletes the parked story as stale. It goes back
 * on the site only when the one-click install ships and is recorded.
 *
 * STATIC SOURCE AUDIT, the same pattern as `agents.test.ts` and
 * `downloads.test.ts` (SolidJS does not render under `bun:test`).
 *
 * Deliberate exceptions, not audited here — both were weighed with the Chief
 * of Staff at the go/no-go and left in place on purpose:
 *  - `src/routes/nook/agents.tsx` Muse row: "This Mac only — remote hosts skip
 *    it" is a limitation disclosure, not a capability claim.
 *  - `src/components/nook/IslandExtras.tsx` "Tailscale hosts" chip: adjacent to
 *    the removed remote story, but tailnet host lookup does exist. Raised on
 *    FRE-323 rather than widened into this correction.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "../../..");

/** Shipped page and component source. Tests and drafts may quote the old copy. */
const AUDITED = [
  "src/routes/nook/index.tsx",
  "src/routes/nook/agents.tsx",
  "src/routes/nook/faq.tsx",
  "src/components/nook/FeatureCollage.tsx",
  "src/components/nook/FeatureBreakdowns.tsx",
  "src/components/nook/IslandExtras.tsx"
];

/** Every sentence FRE-323 ordered off the site. */
const BANNED_REMOTE_CLAIMS = [
  "Agents on other machines",
  "one click installs the nook-hook",
  "Any SSH box",
  "Works across every hooked agent, local or remote",
  "Remote sessions are ordinary rows",
  "One-click SSH setup",
  "remote machines over SSH",
  "this Mac or remote machines"
];

/** FRE-359 verdict B: no count, no coverage claim, in any form. */
const BANNED_COVERAGE = [
  "all thirteen",
  "thirteen coding agents",
  "13 agents",
  "every coding agent",
  "Supported agents"
];

/** User-facing copy only: comments are not copy and may name the old wording. */
function copyOf(file: string): string {
  return readFileSync(join(ROOT, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("remote claims stay off the site (FRE-323)", () => {
  for (const file of AUDITED) {
    it(`${file} does not restore a removed remote sentence`, () => {
      const copy = copyOf(file);
      for (const phrase of BANNED_REMOTE_CLAIMS) {
        expect(copy.toLowerCase()).not.toContain(phrase.toLowerCase());
      }
    });
  }

  it("/agents no longer offers remote sessions", () => {
    const copy = copyOf("src/routes/nook/agents.tsx");
    expect(copy).not.toContain("remote sessions report into the same grid");
    expect(copy).not.toContain("on this Mac or on remote");
  });

  it("the parked copy still exists, so restoring the story is a revert and not a rewrite", () => {
    const parked = readFileSync(join(ROOT, "marketing/drafts/remote-ssh/copy.md"), "utf8");
    for (const phrase of ["Agents on other machines", "Any SSH box, one click away"]) {
      expect(parked).toContain(phrase);
    }
    expect(readFileSync(join(ROOT, "marketing/drafts/remote-ssh/rationale.md"), "utf8")).toContain(
      "FRE-320"
    );
  });
});

describe("agent coverage count stays off the page (FRE-359 verdict B)", () => {
  for (const file of AUDITED) {
    it(`${file} states no coverage count`, () => {
      const copy = copyOf(file);
      for (const phrase of BANNED_COVERAGE) {
        expect(copy.toLowerCase()).not.toContain(phrase.toLowerCase());
      }
    });
  }

  it("/agents titles the table Agent coverage", () => {
    expect(copyOf("src/routes/nook/agents.tsx")).toContain("Agent coverage");
  });
});
