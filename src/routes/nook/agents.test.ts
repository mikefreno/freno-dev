/**
 * Regression test for the /agents roster (NOOK-336).
 *
 * The page mirrors the app's registry, `AgentSpec.all` in
 * the-nook/Sources/NookCore/Agents/AgentRegistry.swift. When Muse joined
 * the registry in 0.10.0 the page kept twelve entries and kept saying
 * "twelve", so a shipped agent was missing from the one page that lists
 * them. The registry lives in another repo, so the expected roster is
 * restated here; when an agent is added there, add it here and on the page.
 *
 * STATIC SOURCE AUDIT, the same pattern as the downloads regressions.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = readFileSync(join(import.meta.dir, "agents.tsx"), "utf8");

/** AgentSpec.all display names, in registry order. */
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
  "DeepSeek"
];

const NUMBER_WORDS = ["twelve", "thirteen", "fourteen", "fifteen"];

const entries = [...SOURCE.matchAll(/^\s{4}name: "([^"]+)",$/gm)].map((m) => m[1]);

describe("Nook /agents roster (NOOK-336)", () => {
  it("lists every registry agent, in registry order", () => {
    expect(entries).toEqual(REGISTRY);
  });

  it("states the same count everywhere it names one", () => {
    const word = NUMBER_WORDS[entries.length - 12];
    for (const other of NUMBER_WORDS.filter((w) => w !== word)) {
      expect(SOURCE.toLowerCase()).not.toContain(other);
    }
    expect(SOURCE).toContain(`all ${word}`);
    expect(SOURCE).toContain(`The ${entries.length} agents`);
    expect(SOURCE).toContain(`watches ${word} coding agents`);
  });
});
