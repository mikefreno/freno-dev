/**
 * Regression test for the /agents roster (NOOK-336) and its coverage wording
 * (FRE-359).
 *
 * The page mirrors the app's registry, `AgentSpec.all` in
 * the-nook/Sources/NookCore/Agents/AgentRegistry.swift. When Muse joined
 * the registry in 0.10.0 the page kept twelve entries and kept saying
 * "twelve", so a shipped agent was missing from the one page that lists
 * them. The registry lives in another repo, so the expected roster is
 * restated here; when an agent is added there, add it here and on the page.
 *
 * FRE-359 verdict B: the page no longer states a count or claims coverage
 * ("all thirteen", "every coding agent The Nook supports"). The page still
 * lists 13 of the registry's 18 rows — the table is hand-mirrored and its
 * regeneration is its own ticket — so the roster check here is a subset
 * check in registry order, not an equality check.
 *
 * STATIC SOURCE AUDIT, the same pattern as the downloads regressions.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = readFileSync(join(import.meta.dir, "agents.tsx"), "utf8");

/** User-facing copy only: comments are not copy and may name the old wording. */
const COPY = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** AgentSpec.all display names, in registry order (18 rows). @ The-Nook f4258034, 2026-10-29 */
const REGISTRY = [
  "Claude Code",
  "Codex",
  "OpenCode",
  "Pi",
  "Oh My Pi",
  "Muse",
  "Hermes",
  "OpenClaw",
  "Z.ai (ZCode)",
  "Gemini CLI",
  "Cline",
  "Qwen Code",
  "DeepSeek",
  "Kimi",
  "GitHub Copilot CLI",
  "Crush",
  "Cursor",
  "Amp"
];

const NUMBER_WORDS = ["twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen"];

const entries = [...SOURCE.matchAll(/^\s{4}name: "([^"]+)",$/gm)].map((m) => m[1]);

/** The page's rows are a subset of the registry, in registry order. */
function subsetInOrder(page: string[], registry: string[]): boolean {
  let cursor = 0;
  for (const name of page) {
    const at = registry.indexOf(name, cursor);
    if (at === -1) return false;
    cursor = at + 1;
  }
  return true;
}

describe("Nook /agents roster (NOOK-336)", () => {
  it("lists only registry agents, in registry order", () => {
    expect(entries.length).toBeGreaterThan(0);
    expect(subsetInOrder(entries, REGISTRY)).toBe(true);
  });

  it("lists each agent at most once", () => {
    expect(new Set(entries).size).toBe(entries.length);
  });
});

describe("Nook /agents coverage wording (FRE-359)", () => {
  it("states no agent count anywhere on the page", () => {
    for (const word of NUMBER_WORDS) {
      expect(COPY.toLowerCase()).not.toContain(word);
    }
    // A bare numeral count ("13 agents", "The 13") is just as precise and just
    // as unverified; the page must not state one in any form.
    expect(COPY).not.toMatch(/\b\d{1,2} agents\b/);
    expect(COPY).not.toMatch(/\ball \d{1,2}\b/);
  });

  it("makes no completeness claim over the agent set", () => {
    for (const banned of [
      "every coding agent",
      "the agents the nook supports",
      "agents the nook supports",
      "supported agents"
    ]) {
      expect(COPY.toLowerCase()).not.toContain(banned);
    }
  });
});
