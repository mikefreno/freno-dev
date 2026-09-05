import { For, type JSX } from "solid-js";

/**
 * Pixel-art campfire sprite, faithful to the app's CampfireFrames: a 14×14
 * grid where the log base never moves and only the flame and sparks animate.
 * `state` picks the frame set and cadence — idle simmers, running dances,
 * ready exhales, error pulses dead embers.
 */

const FIRE_PALETTE: Record<string, string> = {
  o: "#e7873a",
  y: "#ffce70",
  w: "#ffffff",
  b: "#8b5a2b",
  d: "#5a3a1b",
  s: "#ffd166",
  r: "#c43a30",
  R: "#f25240",
  x: "#ff7864",
  m: "rgba(255,255,255,0.5)",
  k: "rgba(255,255,255,0.26)",
  e: "#a8582a",
  E: "#d87636",
  B: "#4890fc",
  L: "#92c7ff",
  C: "#e9f8ff",
  S: "#bfe0ff"
};

interface CampfireFrame {
  rows: string[];
}

const IDLE_FRAMES: CampfireFrame[] = [
  {
    rows: [
      "..............",
      "..............",
      "..............",
      "..............",
      "..............",
      "..............",
      "..............",
      ".....oyo......",
      "....oyyyo.....",
      "..dddeeeeeEd..",
      "..dbbbbbbbbd..",
      "..............",
      "..............",
      ".............."
    ]
  },
  {
    rows: [
      "..............",
      "..............",
      ".........k....",
      "..............",
      "..............",
      "..............",
      "..............",
      "......oyo.....",
      "....oyyyo.....",
      "..dddEEEEEEd..",
      "..dbbbbbbbbd..",
      "..............",
      "..............",
      ".............."
    ]
  }
];

const RUN_FRAMES: CampfireFrame[] = [
  {
    rows: [
      "..............",
      "..............",
      ".....s.yy.....",
      ".....oyyo.....",
      "....oywwyo....",
      "...oyywwyyo...",
      "...oyywwyyo...",
      "...oyywwyyo...",
      "....oywwyo....",
      "..dddddddddd..",
      "..dbbbbbbbbd..",
      "..............",
      "..............",
      ".............."
    ]
  },
  {
    rows: [
      "..............",
      ".....s........",
      ".....yy.......",
      ".....oyyo.....",
      "....oywwyo....",
      "...oyywwyyo...",
      "...oyywwyyo...",
      "...oyywwyyo...",
      "....oywwyo....",
      "..dddddddddd..",
      "..dbbbbbbbbd..",
      "..............",
      "..............",
      ".............."
    ]
  }
];

const READY_FRAMES: CampfireFrame[] = [
  {
    rows: [
      "..............",
      "..............",
      "..............",
      "..............",
      "..............",
      "......yy......",
      ".....oyyo.....",
      "....oyyyyo....",
      "....oyyyyo....",
      "..dddyyyyyyd..",
      "..dbbbbbbbbd..",
      "..............",
      "..............",
      ".............."
    ]
  },
  {
    rows: [
      "..............",
      "..............",
      "..............",
      "..............",
      "........m.....",
      ".....yy.......",
      ".....oyyo.....",
      "....oyyyyo....",
      "....oyyyyo....",
      "..dddyyyyyyd..",
      "..dbbbbbbbbd..",
      "..............",
      "..............",
      ".............."
    ]
  }
];

/* App CampfireFrames.ques0-5: cool blue flame, tip dips, sparks spit. */
const QUES_FRAMES: CampfireFrame[] = [
  {
    rows: [
      "..............",
      "..............",
      ".....S.LL.....",
      ".....BLLB.....",
      "....BLCCLB....",
      "...BLLCCLLB...",
      "...BLLCCLLB...",
      "...BLLCCLLB...",
      "....BLCCLB....",
      "..dddccccccd..",
      "..dbbbbbbbbd..",
      "..............",
      "..............",
      ".............."
    ]
  },
  {
    rows: [
      "..............",
      ".....S........",
      ".....LL.......",
      ".....BLLB.....",
      "....BLCCLB....",
      "...BLLCCLLB...",
      "...BLLCCLLB...",
      "...BLLCCLLB...",
      "....BLCCLB....",
      "..dddccccccd..",
      "..dbbbbbbbbd..",
      "..............",
      "..............",
      ".............."
    ]
  },
  {
    rows: [
      "..............",
      ".....S........",
      "......LL......",
      ".....BLLB.....",
      "....BLCCLB....",
      "...BLLCCLLB...",
      "...BLLCCLLB...",
      "...BLLCCLLB...",
      "....BLCCLB....",
      "..dddccccccd..",
      "..dbbbbbbbbd..",
      "..............",
      "..............",
      ".............."
    ]
  },
  {
    rows: [
      ".....S........",
      "..............",
      "......LL......",
      ".....BLLB.....",
      "....BLCCLB....",
      "...BLLCCLLB...",
      "...BLLCCLLB...",
      "...BLLCCLLB...",
      "....BLCCLB....",
      "..dddccccccd..",
      "..dbbbbbbbbd..",
      "..............",
      "..............",
      ".............."
    ]
  },
  {
    rows: [
      ".....S........",
      "..............",
      ".......LL.....",
      ".....BLLB.....",
      "....BLCCLB....",
      "...BLLCCLLB...",
      "...BLLCCLLB...",
      "...BLLCCLLB...",
      "....BLCCLB....",
      "..dddccccccd..",
      "..dbbbbbbbbd..",
      "..............",
      "..............",
      ".............."
    ]
  },
  {
    rows: [
      "........S.....",
      "..............",
      ".......LL.....",
      ".....BLLB.....",
      "....BLCCLB....",
      "...BLLCCLLB...",
      "...BLLCCLLB...",
      "...BLLCCLLB...",
      "....BLCCLB....",
      "..dddccccccd..",
      "..dbbbbbbbbd..",
      "..............",
      "..............",
      ".............."
    ]
  }
];

const ERROR_FRAMES: CampfireFrame[] = [
  {
    rows: [
      "..............",
      "..............",
      "..............",
      "..............",
      "..............",
      "..............",
      "..............",
      "..............",
      "..............",
      "..dddrrrrrrd..",
      "..dbbbbbbbbd..",
      "..............",
      "..............",
      ".............."
    ]
  },
  {
    rows: [
      "........x.....",
      "..............",
      ".....x........",
      "..............",
      "..............",
      "..............",
      "..............",
      "..............",
      "..............",
      "..dddRRRRRRd..",
      "..dbbbbbbbbd..",
      "..............",
      "..............",
      ".............."
    ]
  }
];

export type CampfireState = "idle" | "running" | "ready" | "question" | "error";

const STATE_FRAMES: Record<CampfireState, CampfireFrame[]> = {
  idle: IDLE_FRAMES,
  running: RUN_FRAMES,
  ready: READY_FRAMES,
  question: QUES_FRAMES,
  error: ERROR_FRAMES
};

const STATE_FPS: Record<CampfireState, number> = {
  idle: 2,
  running: 9,
  ready: 4,
  question: 4.5,
  error: 4
};

export function Campfire(props: { state: CampfireState; pixel?: number }) {
  const pixel = () => props.pixel ?? 3;
  return (
    <div
      class="animate-campfire grid"
      style={{
        "grid-template-columns": `repeat(14, ${pixel()}px)`,
        /* One full cycle: every frame exactly one frame-interval long. */
        "--campfire-duration": `${(1000 * STATE_FRAMES[props.state].length) / STATE_FPS[props.state] / 1000}s`
      }}
    >
      {/* Slot phase lives in the keyframes per layer (campfire-slot-N-x);
          delay-offset layers blank a wrap frame under WebKit. */}
      <For each={STATE_FRAMES[props.state]}>
        {(frame, i) => {
          const n = STATE_FRAMES[props.state].length;
          const phase = String.fromCharCode(97 + (i() % 26));
          return (
            <div
              class="campfire-frame col-span-full row-start-1"
              style={{ "--slot-kf": `campfire-slot-${n}-${phase}` }}
            >
              <For each={frame.rows}>
                {(row) => (
                  <div class="flex" style={{ height: `${pixel()}px` }}>
                    <For each={row.split("")}>
                      {(ch) => (
                        <span
                          class="inline-block"
                          style={{
                            width: `${pixel()}px`,
                            height: `${pixel()}px`,
                            background:
                              ch === "." ? "transparent" : FIRE_PALETTE[ch]
                          }}
                        />
                      )}
                    </For>
                  </div>
                )}
              </For>
            </div>
          );
        }}
      </For>
    </div>
  );
}
