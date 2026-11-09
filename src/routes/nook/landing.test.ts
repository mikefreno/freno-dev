import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const landingCopy = [
  "src/routes/nook/index.tsx",
  ...[
    "FeatureCollage",
    "FeatureBreakdowns",
    "IslandExtras",
    "PhoneBeta",
    "MoreDemos",
    "UtilityDemos"
  ].map((name) => `src/components/nook/${name}.tsx`)
]
  .map(read)
  .join("\n");

// Like remote-claims.test.ts, this pins an editorial decision, not a tone score.
describe("Nook landing copy (NOOK-1037)", () => {
  for (const phrase of [
    "Your fleet, in your pocket",
    "Timers that stack",
    "Volume and brightness, under the notch",
    "The sky, in the slot",
    "Storage, measured",
    "Wall power, on your terms",
    "Fans that answer to you, not the scheduler",
    "Your whole fleet, in one pixel strip",
    "A hearth that tells the truth",
    "A lens that stays asleep",
    "Your buttons, orbiting the island",
    "Silence it or max it",
    "Sleep when you say",
    "Panels you shape"
  ]) {
    it(`replaces “${phrase}”`, () => {
      expect(landingCopy).not.toContain(phrase);
    });
  }
});

// Source anatomy checks supplement the rendered browser checks.
const demos = read("src/components/nook/UtilityDemos.tsx");

describe("current utility demo anatomy (NOOK-1037)", () => {
  it("shows the three calendar slot states and calendar-colored agenda rows", () => {
    for (const text of ["ON AIR", "Work", "Thu, Nov 12", "Join meeting"])
      expect(demos).toContain(text);
    expect(demos).toMatch(/>\s*IN\s*</);
  });

  it("shows the power circuit and current battery controls", () => {
    for (const text of [
      "System draw",
      "Adapter",
      "Mac",
      "Overheat protection",
      "Charges past the limit; off on unplug"
    ])
      expect(demos).toContain(text);
    expect(demos).not.toContain("the pack stays young longer");
  });

  it("shows master routing, app percentages, pin and hide controls", () => {
    for (const text of [
      "System sounds",
      "Microphone",
      "Output volume",
      "Pin app",
      "Hide app",
      "Default"
    ])
      expect(demos).toContain(text);
  });
});
