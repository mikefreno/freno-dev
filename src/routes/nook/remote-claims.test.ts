/**
 * NOOK-1038 restores remote marketing for Tailscale and authorized known hosts,
 * per Mike's correction. FRE-323's blanket removal is no longer the contract;
 * one-click setup is a supported scoped claim, not a promise for any SSH box.
 * FRE-359's separate decision against agent coverage counts is unchanged.
 * Static source audit, like agents.test.ts; browser checks cover rendered layout.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "../../..");
const AUDITED = [
  "src/routes/nook/index.tsx",
  "src/routes/nook/agents.tsx",
  "src/routes/nook/faq.tsx",
  "src/components/nook/FeatureCollage.tsx",
  "src/components/nook/FeatureBreakdowns.tsx",
  "src/components/nook/IslandExtras.tsx"
];

function copyOf(file: string): string {
  return readFileSync(join(ROOT, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("remote marketing reflects the supported setup (NOOK-1038)", () => {
  it("fills the collage's missing sixth grid slot with host-labelled remote sessions", () => {
    const collage = copyOf("src/components/nook/FeatureCollage.tsx");
    // The hero spans two columns; four regular cards fill the other slots.
    expect(collage.match(/<CollageCell\b/g)).toHaveLength(4);
    expect(collage).toContain('kicker="Remote"');
    expect(collage).toContain(
      "One-click setup for Tailscale and authorized known hosts"
    );
    expect(collage).toContain('host="build-box"');
    expect(collage).toContain('host="gpu-rig"');
  });

  it("restores the detailed setup section with both discovery sources", () => {
    const breakdowns = copyOf("src/components/nook/FeatureBreakdowns.tsx");
    expect(breakdowns).toContain('kicker="Remote"');
    expect(breakdowns).toContain('title="Set up remote agents in one click"');
    expect(breakdowns).toContain(
      "Tailscale peer or an authorized host from your SSH config"
    );
    expect(breakdowns).toContain("<RemoteHostDemo />");
  });

  it("demonstrates setup progressing to Live and a host-labelled session", () => {
    const demos = copyOf("src/components/nook/MoreDemos.tsx");
    for (const label of [
      "connecting",
      "pushing the hook binary",
      "configuring agents",
      "checking the host can reach this Mac",
      "Live",
      "Set up"
    ])
      expect(demos).toContain(label);
    expect(demos).toContain('host="gpu-rig"');
  });

  for (const file of AUDITED) {
    it(`${file} makes no blanket authorization or agent-coverage promise`, () => {
      const copy = copyOf(file).toLowerCase();
      for (const phrase of [
        "Any SSH box",
        "Works across every hooked agent, local or remote",
        "no SSH authorization needed"
      ])
        expect(copy).not.toContain(phrase.toLowerCase());
    });
  }

  it("records the current decision without deleting the historical copy", () => {
    for (const file of [
      "marketing/drafts/remote-ssh/copy.md",
      "marketing/drafts/remote-ssh/rationale.md",
      "marketing/positioning.md"
    ]) {
      const text = readFileSync(join(ROOT, file), "utf8");
      expect(text).toContain("NOOK-1038");
      expect(text).toContain("Tailscale and authorized known hosts");
    }
    expect(
      readFileSync(join(ROOT, "marketing/drafts/remote-ssh/copy.md"), "utf8")
    ).toContain("Any SSH box, one click away");
  });
});

describe("agent coverage count stays off the page (FRE-359 verdict B)", () => {
  for (const file of AUDITED) {
    it(`${file} states no coverage count`, () => {
      const copy = copyOf(file);
      for (const phrase of [
        "all thirteen",
        "thirteen coding agents",
        "13 agents",
        "every coding agent",
        "Supported agents"
      ])
        expect(copy.toLowerCase()).not.toContain(phrase.toLowerCase());
    });
  }

  it("/agents titles the table Agent coverage", () => {
    expect(copyOf("src/routes/nook/agents.tsx")).toContain("Agent coverage");
  });
});
