import { For, Show, createSignal, type JSX } from "solid-js";
import {
  ModuleCard,
  FakeCursor,
  IslandPill,
  AgentDotGrid,
  STATUS,
  ACCENT,
  CALM,
  CRITICAL,
  CARD_STROKE
} from "./IslandMock";
import { useDemoLoop } from "./useDemoLoop";
import { Glyph, WingCapsule, type GlyphName } from "./ModuleMocks";

/**
 * Live demos for the breakdowns added with the 0.6–0.10 feature set:
 * terminal replies, the volume mixer, Capture (module + Wings), and
 * floating actions. Same ink chrome and status palette as the originals.
 */

/* ── Reply lands in the agent's own terminal ──────────────────────── */

const REPLY = "yes — and run them";

export function TerminalReplyDemo() {
  const [typed, setTyped] = createSignal(0);
  const [phase, setPhase] = createSignal<
    "asking" | "typing" | "sent" | "working" | "jump"
  >("asking");

  useDemoLoop(10000, [
    [0, () => (setTyped(0), setPhase("asking"))],
    [900, () => setPhase("typing")],
    ...REPLY.split("").map(
      (_, i) => [1000 + i * 70, () => setTyped(i + 1)] as [number, () => void]
    ),
    [2900, () => setPhase("sent")],
    [3300, () => setPhase("working")],
    [6600, () => setPhase("jump")]
  ]);

  const delivered = () => phase() === "working" || phase() === "jump";
  const cursorPhase = () =>
    phase() === "sent" || phase() === "jump"
      ? ("press" as const)
      : phase() === "typing" || phase() === "asking"
        ? ("idle" as const)
        : ("live" as const);
  const cursorAt = () =>
    phase() === "jump" ? { x: 88, y: 14 } : { x: 88, y: 80 };

  return (
    <div class="mx-auto flex w-full max-w-[340px] flex-col gap-3">
      <ModuleCard class="relative">
        <div class="space-y-2 text-left">
          <div class="flex items-center gap-2">
            <span
              class="inline-block h-[7px] w-[7px] rounded-full transition-colors duration-500"
              style={{
                background: delivered() ? STATUS.running : STATUS.ready
              }}
            />
            <span class="text-[13px] font-semibold text-white">the-nook</span>
            <span class="font-mono text-[10px] text-white/40">main</span>
            <span
              class="ml-auto rounded-md px-2 py-0.5 text-[10px] font-semibold text-white/80 transition-colors duration-300"
              style={{
                background:
                  phase() === "jump" ? ACCENT : "rgba(255,255,255,0.08)"
              }}
            >
              Jump ↗
            </span>
          </div>
          <p class="text-[11px] leading-snug text-white/60">
            {delivered()
              ? "Running the test suite…"
              : "Done. Want me to update the tests too?"}
          </p>
          <div
            class="flex items-center gap-2 rounded-lg px-2 py-1.5"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <span class="min-h-[14px] flex-1 truncate font-mono text-[11px] text-white/85">
              {delivered() ? "" : REPLY.slice(0, typed())}
              <Show when={phase() === "typing"}>
                <span class="nook-caret">▍</span>
              </Show>
              <Show when={!typed() || delivered()}>
                <span class="text-white/30">Reply…</span>
              </Show>
            </span>
            <span
              class="rounded-md px-2 py-0.5 text-[10px] font-semibold text-white transition-transform duration-200"
              style={{
                background: ACCENT,
                transform: phase() === "sent" ? "scale(0.9)" : "scale(1)"
              }}
            >
              Send
            </span>
          </div>
        </div>
        <FakeCursor phase={cursorPhase()} at={cursorAt()} />
      </ModuleCard>

      {/* the terminal the session actually runs in */}
      <div
        class="overflow-hidden rounded-lg text-left transition-shadow duration-500"
        style={{
          background: "#16161a",
          "box-shadow":
            phase() === "jump"
              ? `0 0 0 2px ${ACCENT}, 0 8px 30px rgba(72,151,178,0.35)`
              : `inset 0 0 0 1px ${CARD_STROKE}`
        }}
      >
        <div class="flex items-center gap-1.5 px-2.5 py-1.5">
          <span class="h-2 w-2 rounded-full bg-[#ff5f57]" />
          <span class="h-2 w-2 rounded-full bg-[#febc2e]" />
          <span class="h-2 w-2 rounded-full bg-[#28c840]" />
          <span class="ml-2 font-mono text-[10px] text-white/40">
            tmux · the-nook:2
          </span>
          <span
            class="ml-auto text-[9px] font-semibold tracking-wide uppercase transition-opacity duration-300"
            style={{ color: ACCENT, opacity: phase() === "jump" ? 1 : 0 }}
          >
            focused
          </span>
        </div>
        <div class="space-y-0.5 px-2.5 pb-2.5 font-mono text-[10.5px] leading-relaxed">
          <p class="text-white/40">⏺ Updated 3 files</p>
          <p class="text-white/70">
            &gt;{" "}
            <span
              class="transition-opacity duration-300"
              style={{ opacity: delivered() ? 1 : 0 }}
            >
              {REPLY}
            </span>
          </p>
          <p
            class="transition-opacity duration-500"
            style={{ color: CALM, opacity: delivered() ? 1 : 0 }}
          >
            ⏺ Bash(swift test)
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Volume mixer: every app its own level and output ─────────────── */

interface MixerApp {
  name: string;
  color: string;
  glyph: string;
}

const MIXER_APPS: MixerApp[] = [
  { name: "Music", color: "#fa5c7c", glyph: "♫" },
  { name: "Browser", color: "#6EA7FF", glyph: "◎" },
  { name: "Meeting", color: "#6FB982", glyph: "●" },
  { name: "podcast-cli", color: "#E7A762", glyph: ">_" }
];

export function MixerDemo() {
  const [step, setStep] = createSignal(0);
  useDemoLoop(9600, [
    [0, () => setStep(0)],
    [1800, () => setStep(1)],
    [3800, () => setStep(2)],
    [5800, () => setStep(3)]
  ]);

  const level = (i: number) => {
    if (i === 0) return step() >= 3 ? 0.38 : 0.72;
    if (i === 1) return 0.55;
    if (i === 2) return 0.86;
    return 0.46;
  };
  const muted = (i: number) => i === 1 && step() >= 1;
  const route = (i: number) =>
    i === 0 && step() >= 2 ? "Headphones" : i === 2 ? "Display" : "Speakers";

  return (
    <ModuleCard class="mx-auto w-full max-w-[340px]">
      <div class="space-y-2.5 text-left">
        <div class="flex items-center">
          <span class="text-[11px] font-semibold text-white/50">
            Volume mixer
          </span>
          <span class="ml-auto font-mono text-[10px] text-white/40">
            out · Speakers
          </span>
        </div>
        <For each={MIXER_APPS}>
          {(app, i) => (
            <div class="flex items-center gap-2">
              <span
                class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] text-[8px] font-bold text-black/70"
                style={{ background: app.color }}
              >
                {app.glyph}
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="truncate text-[11px] font-semibold text-white/85">
                    {app.name}
                  </span>
                  <span
                    class="ml-auto shrink-0 rounded px-1.5 text-[9px] text-white/55 transition-colors duration-500"
                    style={{
                      background:
                        i() === 0 && step() === 2
                          ? `${ACCENT}55`
                          : "rgba(255,255,255,0.07)"
                    }}
                  >
                    {route(i())}
                  </span>
                </div>
                <div
                  class="relative mt-1 h-[5px] overflow-hidden rounded-full"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div
                    class="h-full rounded-full"
                    style={{
                      width: `${level(i()) * 100}%`,
                      background: muted(i()) ? "rgba(255,255,255,0.18)" : CALM,
                      transition: "width 0.9s cubic-bezier(0.22,1,0.36,1), background 0.3s"
                    }}
                  />
                  {/* live signal riding inside the level */}
                  <div
                    class="nook-meter absolute top-0 left-0 h-full rounded-full"
                    style={{
                      width: `${level(i()) * 100}%`,
                      background: "rgba(255,255,255,0.35)",
                      opacity: muted(i()) ? 0 : 1,
                      "animation-duration": `${0.5 + i() * 0.17}s`,
                      transition: "width 0.9s cubic-bezier(0.22,1,0.36,1), opacity 0.3s"
                    }}
                  />
                </div>
              </div>
              <span
                class="w-4 shrink-0 text-center text-[11px] transition-colors duration-300"
                style={{ color: muted(i()) ? CRITICAL : "rgba(255,255,255,0.4)" }}
              >
                {muted(i()) ? "✕" : "♪"}
              </span>
            </div>
          )}
        </For>
        <div class="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        <p class="text-[10px] text-white/40">
          {
            [
              "every app on its own fader",
              "browser muted — the rest keep playing",
              "music routed to headphones, meeting stays on the display",
              "music down, nothing else moved"
            ][step()]
          }
        </p>
      </div>
    </ModuleCard>
  );
}

/* ── Capture: the module, and the Wings while a recording runs ────── */

/** CapturePalette.recording and the NookPalette paper/ink pair. */
const RECORDING_RED = "rgb(242,69,69)";
const PAPER = "#f1ead9";
const INK = "#0d0d0f";

function CaptureChip(props: {
  glyph: GlyphName;
  label: string;
  menu?: boolean;
  pressed?: boolean;
}) {
  return (
    <span
      class="flex flex-1 items-center justify-center gap-1 rounded-full py-1.5 text-[11px] font-medium whitespace-nowrap text-white transition-transform duration-150"
      style={{
        background: props.pressed ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)",
        transform: props.pressed ? "scale(0.94)" : "scale(1)"
      }}
    >
      <Glyph name={props.glyph} size={11} />
      {props.label}
      <Show when={props.menu}>
        <Glyph name="chevron" size={8} class="opacity-50" />
      </Show>
    </span>
  );
}

/** CaptureAudioToggles: paper capsule when on, faint when off. */
function AudioToggles(props: { system: boolean; mic: boolean }) {
  const toggle = (on: boolean, glyph: GlyphName, label: string) => (
    <span
      class="flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-medium whitespace-nowrap transition-colors duration-300"
      style={{
        background: on ? PAPER : "rgba(255,255,255,0.08)",
        color: on ? INK : "rgba(255,255,255,0.7)"
      }}
    >
      <Glyph name={glyph} size={10} />
      {label}
    </span>
  );
  return (
    <div class="flex gap-1.5">
      {toggle(props.system, props.system ? "speaker" : "speakerOff", "System audio")}
      {toggle(props.mic, props.mic ? "mic" : "micOff", "Microphone")}
    </div>
  );
}

function RowLabel(props: { glyph: GlyphName; label: string }) {
  return (
    <p class="flex items-center gap-1 text-[11px] font-semibold text-white/50">
      <Glyph name={props.glyph} size={11} />
      {props.label}
    </p>
  );
}

export function CaptureDemo() {
  const [phase, setPhase] = createSignal<"idle" | "press" | "rec" | "paused" | "saved">("idle");
  const [secs, setSecs] = createSignal(0);
  const [mic, setMic] = createSignal(true);
  const [wingPress, setWingPress] = createSignal<"" | "mic" | "pause" | "stop">("");

  useDemoLoop(12400, [
    [0, () => (setPhase("idle"), setSecs(0), setMic(true), setWingPress(""))],
    [1500, () => setPhase("press")],
    [1800, () => setPhase("rec")],
    ...[1, 2, 3, 4, 5].map((s) => [1800 + s * 1000, () => setSecs(s)] as [number, () => void]),
    [4300, () => setWingPress("mic")],
    [4550, () => (setMic(false), setWingPress(""))],
    [7100, () => setWingPress("pause")],
    [7350, () => (setPhase("paused"), setWingPress(""))],
    [9000, () => setWingPress("stop")],
    [9250, () => (setPhase("saved"), setWingPress(""))]
  ]);

  const recording = () => phase() === "rec" || phase() === "paused";
  const paused = () => phase() === "paused";
  /* Island row is drawn at half size; Wing controls are as tall as it. */
  const wingWidth = 2 * 60 + 12;
  const cursor = () => {
    switch (wingPress()) {
      case "mic":
        return { phase: "press" as const, at: { x: 21.8, y: 7 } };
      case "pause":
        return { phase: "press" as const, at: { x: 78.2, y: 7 } };
      case "stop":
        return { phase: "press" as const, at: { x: 86.5, y: 7 } };
    }
    if (phase() === "idle" || phase() === "press")
      return { phase: phase() === "press" ? ("press" as const) : ("idle" as const), at: { x: 50, y: 58 } };
    if (phase() === "saved") return { phase: "live" as const, at: { x: 86.5, y: 7 } };
    return { phase: "idle" as const, at: { x: 21.8, y: 30 } };
  };

  return (
    <div class="relative mx-auto w-full max-w-[360px]">
      {/* the Compact island, flanked by the Wings while recording */}
      <div class="relative h-[30px]">
        <div
          class="absolute top-0 left-1/2 flex items-start"
          style={{ transform: "translateX(-50%) scale(0.5)", "transform-origin": "top center" }}
        >
          <div
            class="flex justify-end overflow-hidden transition-all duration-500"
            style={{ width: recording() ? `${wingWidth}px` : "0px", opacity: recording() ? 1 : 0 }}
          >
            <WingCapsule
              height={60}
              controls={[
                { glyph: "speaker" },
                { glyph: mic() ? "mic" : "micOff", on: mic(), pressed: wingPress() === "mic" }
              ]}
            />
            <span class="w-3 shrink-0" />
          </div>
          <IslandPill
            campfire="running"
            right={<AgentDotGrid states={["running", "ready", "running"]} />}
          />
          <div
            class="flex overflow-hidden transition-all duration-500"
            style={{ width: recording() ? `${wingWidth}px` : "0px", opacity: recording() ? 1 : 0 }}
          >
            <span class="w-3 shrink-0" />
            <WingCapsule
              height={60}
              controls={[
                { glyph: paused() ? "play" : "pause", pressed: wingPress() === "pause" },
                { glyph: "stop", pressed: wingPress() === "stop" }
              ]}
            />
          </div>
        </div>
      </div>

      {/* the Capture module */}
      <ModuleCard class="mt-5">
        <div class="min-h-[150px] text-left">
          <Show
            when={recording()}
            fallback={
              <div class="space-y-2.5">
                <div class="space-y-1.5">
                  <RowLabel glyph="viewfinder" label="Screenshot" />
                  <div class="flex gap-1.5">
                    <CaptureChip glyph="dashed" label="Area" />
                    <CaptureChip glyph="display" label="Screen" />
                    <CaptureChip glyph="window" label="App" menu />
                  </div>
                </div>
                <div class="space-y-1.5">
                  <RowLabel glyph="record" label="Record" />
                  <div class="flex gap-1.5">
                    <CaptureChip glyph="dashed" label="Area" />
                    <CaptureChip glyph="display" label="Screen" pressed={phase() === "press"} />
                    <CaptureChip glyph="window" label="App" menu />
                  </div>
                  <AudioToggles system mic={mic()} />
                </div>
                <Show when={phase() === "saved"}>
                  <div class="flex items-center gap-1.5 text-[10.5px]">
                    <Glyph name="film" size={11} class="text-white/50" />
                    <span class="min-w-0 flex-1 truncate text-white/85">
                      Screen Recording 2026-10-13 at 9.41.12.mov
                    </span>
                    <span class="shrink-0 text-white/50">Show in Finder</span>
                  </div>
                </Show>
              </div>
            }
          >
            <div class="space-y-2.5">
              <div class="flex items-center gap-2">
                <span
                  class="h-2 w-2 rounded-full transition-colors"
                  style={{ background: paused() ? "rgba(255,255,255,0.4)" : RECORDING_RED }}
                />
                <span
                  class="font-mono text-[22px] font-semibold transition-colors"
                  style={{ color: paused() ? "rgba(255,255,255,0.5)" : "white" }}
                >
                  0:0{secs()}
                </span>
                <span class="ml-auto font-mono text-[10px] font-medium text-white/50">
                  {paused() ? "Paused" : "Recording"}
                </span>
              </div>
              <div class="flex gap-2">
                <CaptureChip glyph={paused() ? "play" : "pause"} label={paused() ? "Resume" : "Pause"} />
                <CaptureChip glyph="stop" label="Stop" />
              </div>
              <AudioToggles system mic={mic()} />
            </div>
          </Show>
        </div>
      </ModuleCard>

      {/* cursor plotted on a fixed 360 px frame centered over the demo */}
      <div class="pointer-events-none absolute inset-y-0 left-1/2 w-[360px] -translate-x-1/2">
        <FakeCursor phase={cursor().phase} at={cursor().at} />
      </div>
    </div>
  );
}

/* ── Floating actions bloom around the open island ────────────────── */

/* Tiny monochrome glyphs for the action kinds the app offers. */
const GLYPH: Record<string, () => JSX.Element> = {
  leaf: () => (
    <path d="M3 13C3 7 7 3 13 3c0 6-4 10-10 10Zm0 0 6-6" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" />
  ),
  bolt: () => <path d="M9 1 3 9h4l-1 6 6-8H8l1-6Z" fill="currentColor" />,
  timer: () => (
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
      <circle cx="8" cy="9" r="5.5" />
      <path d="M8 9V6M6.5 1.5h3" />
    </g>
  ),
  speaker: () => (
    <g fill="currentColor">
      <path d="M2 6h3l4-3v10l-4-3H2Z" />
      <path d="M11 5.5a3.5 3.5 0 0 1 0 5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" />
    </g>
  ),
  shell: () => (
    <path d="m3 5 3 3-3 3m5 0h5" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" />
  ),
  stack: () => (
    <g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
      <path d="m8 2 6 3-6 3-6-3 6-3Z" />
      <path d="m2 8.5 6 3 6-3M2 11.5l6 3 6-3" />
    </g>
  ),
  link: () => (
    <path d="M7 9a3 3 0 0 0 4 0l2-2a3 3 0 0 0-4-4l-1 1m1 3a3 3 0 0 0-4 0l-2 2a3 3 0 0 0 4 4l1-1" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" />
  )
};

interface FloatAction {
  glyph: keyof typeof GLYPH;
  label: string;
  x: number;
  y: number;
}

/* Positions mirror the app's slots: Left ·1/·2, Right ·1/·2, Bottom ·1–3. */
const ACTIONS: FloatAction[] = [
  { glyph: "leaf", label: "Low Power Mode on", x: -128, y: -18 },
  { glyph: "bolt", label: "Top-up to 100%", x: -128, y: 26 },
  { glyph: "speaker", label: "Output → Headphones", x: 128, y: -18 },
  { glyph: "stack", label: "Shortcut: Focus Time", x: 128, y: 26 },
  { glyph: "timer", label: "Timer · 25 min", x: -50, y: 78 },
  { glyph: "shell", label: "$ make deploy", x: 0, y: 78 },
  { glyph: "link", label: "Opened dashboard", x: 50, y: 78 }
];

export function FloatingActionsDemo() {
  const [open, setOpen] = createSignal(false);
  const [pressed, setPressed] = createSignal(-1);
  const [lit, setLit] = createSignal<number[]>([]);

  useDemoLoop(9600, [
    [0, () => (setOpen(false), setPressed(-1), setLit([]))],
    [400, () => setOpen(true)],
    [2200, () => setPressed(0)],
    [2500, () => setLit([0])],
    [4000, () => setPressed(4)],
    [4300, () => setLit([0, 4])],
    [5800, () => setPressed(2)],
    [6100, () => setLit([0, 4, 2])],
    [8800, () => (setOpen(false), setPressed(-1))]
  ]);

  const lastLit = () => lit()[lit().length - 1];

  return (
    <div class="relative mx-auto flex h-[240px] w-full max-w-[340px] items-start justify-center pt-6">
      {/* the expanded island */}
      <div
        class="relative z-10 rounded-b-[18px] bg-black transition-all duration-500"
        style={{
          width: open() ? "190px" : "120px",
          height: open() ? "96px" : "26px",
          "transition-timing-function": "cubic-bezier(0.34,1.56,0.64,1)",
          "box-shadow": `inset 0 0 0 1px ${CARD_STROKE}`
        }}
      >
        <div
          class="space-y-1.5 p-3 transition-opacity duration-300"
          style={{ opacity: open() ? 1 : 0 }}
        >
          <div class="h-1.5 w-2/3 rounded bg-white/20" />
          <div class="h-1.5 w-1/2 rounded bg-white/10" />
          <div class="h-1.5 w-3/4 rounded" style={{ background: `${CALM}66` }} />
        </div>
        <For each={ACTIONS}>
          {(a, i) => (
            <span
              class="absolute flex h-8 w-8 items-center justify-center rounded-full transition-all"
              style={{
                left: "50%",
                top: "50%",
                transform: open()
                  ? `translate(calc(-50% + ${a.x}px), calc(-50% + ${a.y - 6}px)) scale(${pressed() === i() ? 0.82 : 1})`
                  : "translate(-50%, -50%) scale(0.2)",
                opacity: open() ? 1 : 0,
                background: lit().includes(i()) ? ACCENT : "#1c1c20",
                color: lit().includes(i()) ? "white" : "rgba(255,255,255,0.7)",
                "box-shadow": `inset 0 0 0 1px rgba(255,255,255,0.12), 0 4px 14px rgba(0,0,0,0.5)`,
                "transition-duration": "520ms",
                "transition-delay": open() ? `${i() * 45}ms` : `${(6 - i()) * 25}ms`,
                "transition-timing-function": "cubic-bezier(0.34,1.56,0.64,1)"
              }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16">
                {GLYPH[a.glyph]()}
              </svg>
            </span>
          )}
        </For>
      </div>

      {/* what the last press did */}
      <div
        class="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-semibold whitespace-nowrap text-white transition-all duration-300"
        style={{
          background: "rgba(72,151,178,0.22)",
          opacity: lastLit() !== undefined && open() ? 1 : 0
        }}
      >
        {lastLit() !== undefined ? ACTIONS[lastLit()].label : " "}
      </div>
    </div>
  );
}
