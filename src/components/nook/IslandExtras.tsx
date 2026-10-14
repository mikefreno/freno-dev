import {
  For,
  Index,
  Show,
  createSignal,
  onCleanup,
  onMount,
  type JSX
} from "solid-js";
import {
  ModuleCard,
  STATUS,
  ACCENT,
  CALM,
  WARM,
  CRITICAL,
  CARD_FILL,
  CARD_STROKE
} from "./IslandMock";
import { CollageCell, InkStage } from "./FeatureCollage";
import { useDemoLoop } from "./useDemoLoop";
import { Glyph, TimerTapeMock, TIMER_ORANGE, type GlyphName } from "./ModuleMocks";

/**
 * "Everything else": a bento of small live tiles for the modules that do
 * not get a full breakdown, headed by a two-way marquee naming the rest.
 */

/** Steady tick for tiles that animate continuously rather than in steps. */
function useTick(everyMs: number) {
  const [tick, setTick] = createSignal(0);
  onMount(() => {
    const interval = setInterval(() => setTick((t) => t + 1), everyMs);
    onCleanup(() => clearInterval(interval));
  });
  return tick;
}

/** A compact black island strip for tiles that show a slot reading. */
function MiniPill(props: { children: JSX.Element; class?: string }) {
  return (
    <div
      class={`mx-auto flex h-[26px] items-center justify-center gap-2 rounded-b-[11px] bg-black px-3 ${props.class ?? ""}`}
      style={{ "box-shadow": `inset 0 0 0 1px ${CARD_STROKE}` }}
    >
      {props.children}
    </div>
  );
}

/* ── Now Playing + the waveform slot ─────────────────────────────── */

function NowPlayingMock() {
  return (
    <div class="flex w-full max-w-[420px] flex-col items-center gap-4 px-3 sm:flex-row sm:items-center">
      <ModuleCard class="w-full flex-1">
        <div class="flex items-center gap-3 text-left">
          <div
            class="nook-art h-12 w-12 shrink-0 rounded-lg"
            style={{
              background:
                "conic-gradient(from 210deg, #fa5c7c, #6EA7FF, #6FB982, #E7A762, #fa5c7c)"
            }}
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-[12px] font-semibold text-white">
              Night Drive
            </p>
            <p class="truncate text-[10px] text-white/50">
              Synthwave Radio · Browser
            </p>
            <div
              class="mt-2 h-[3px] overflow-hidden rounded-full"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <div
                class="nook-progress h-full rounded-full"
                style={{ background: "rgba(255,255,255,0.75)" }}
              />
            </div>
          </div>
        </div>
        <div class="mt-2.5 flex justify-center gap-5 text-[12px] text-white/70">
          <span>⏮</span>
          <span class="text-white">⏸</span>
          <span>⏭</span>
        </div>
      </ModuleCard>
      <div class="flex flex-col items-center gap-1.5">
        <MiniPill>
          <span class="flex h-[14px] items-center gap-[2px]">
            <For each={[0, 1, 2, 3, 4, 5]}>
              {(i) => (
                <span
                  class="nook-wave w-[2.5px] rounded-full"
                  style={{
                    background: "#fa5c7c",
                    "animation-delay": `${i * -0.13}s`,
                    "animation-duration": `${0.7 + (i % 3) * 0.18}s`
                  }}
                />
              )}
            </For>
          </span>
        </MiniPill>
        <span class="text-[9px] text-white/40">waveform slot</span>
      </div>
    </div>
  );
}

/* ── Timers: the module's face — readout over the tick tape ──────── */

/** TimerService.format: m:ss, rounding up like the app. */
function clock(seconds: number) {
  const s = Math.ceil(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The face's capsule control: 26 px, mono 11, white 8 %. */
function TimerPill(props: { glyph?: GlyphName; label?: string }) {
  return (
    <span class="flex h-[26px] flex-1 items-center justify-center gap-1 rounded-full bg-white/[0.08] font-mono text-[11px] font-medium whitespace-nowrap text-white">
      <Show when={props.glyph}>
        <Glyph name={props.glyph!} size={10} />
      </Show>
      {props.label}
    </span>
  );
}

/*
 * A 3:00 lead timer drains (in fast-forward), rings with its tape pulsing,
 * and a 25:00 Focus timer keeps running in the stacked row beneath.
 */
const LEAD_SECONDS = 180;
const LEAD_MS = 9000;
const TIMER_PERIOD = 14000;

function TimersMock() {
  const tick = useTick(50);
  const t = () => (tick() * 50) % TIMER_PERIOD;
  const leadLeft = () => Math.max(0, 1 - t() / LEAD_MS);
  const ringing = () => t() >= LEAD_MS;
  const focusLeft = () => 0.64 - (t() / TIMER_PERIOD) * 0.06;
  return (
    <ModuleCard class="w-full max-w-[260px]">
      <div class="flex flex-col items-center gap-1">
        <div class="flex h-[34px] items-center">
          <Show
            when={ringing()}
            fallback={
              <span class="font-mono text-[30px] font-semibold text-white tabular-nums">
                {clock(leadLeft() * LEAD_SECONDS)}
              </span>
            }
          >
            <span
              class="flex items-center gap-1.5 font-mono text-[22px] font-semibold"
              style={{ color: TIMER_ORANGE }}
            >
              <Glyph
                name="bell"
                size={18}
                style={{ animation: "nook-pulse 1s ease-in-out infinite" }}
              />
              Time's up
            </span>
          </Show>
        </div>
        <div class={ringing() ? "nook-tape-ring" : ""}>
          <TimerTapeMock remaining={ringing() ? 1 : leadLeft()} width={232} height={32} />
        </div>
        <p class="font-mono text-[9px] font-medium text-white/50">
          {ringing() ? "3:00 timer" : "Remaining of 3:00"}
        </p>
        <div class="flex w-full gap-2 pt-1">
          <Show
            when={ringing()}
            fallback={
              <>
                <TimerPill glyph="pause" label="Pause" />
                <TimerPill glyph="xmark" label="Cancel" />
              </>
            }
          >
            <TimerPill glyph="plus" label="1 min" />
            <TimerPill glyph="restart" label="Restart" />
            <TimerPill glyph="xmark" label="Dismiss" />
          </Show>
        </div>
        {/* a further timer: readout, slim tape, icon controls */}
        <div class="mt-1.5 flex h-6 w-full items-center gap-2 rounded-full bg-white/[0.05] px-2.5 font-mono text-[11px] font-medium text-white">
          <span class="w-11 tabular-nums">{clock(focusLeft() * 1500)}</span>
          <div class="min-w-0 flex-1">
            <TimerTapeMock remaining={focusLeft()} width={110} height={12} />
          </div>
          <Glyph name="pause" size={9} />
          <Glyph name="xmark" size={9} />
        </div>
        <div class="mt-1.5 flex w-full gap-1.5">
          <For each={["1m", "5m", "10m", "25m"]}>{(m) => <TimerPill label={m} />}</For>
        </div>
      </div>
    </ModuleCard>
  );
}

/* ── Weather: saved places rotate through the slot ───────────────── */

type Sky = "sun" | "cloud" | "rain";

function SkyGlyph(props: { sky: Sky; size?: number }) {
  const s = () => props.size ?? 14;
  return (
    <svg width={s()} height={s()} viewBox="0 0 16 16">
      <Show when={props.sky === "sun"}>
        <circle cx="8" cy="8" r="3.4" fill="#FFD23F" />
        <g stroke="#FFD23F" stroke-width="1.3" stroke-linecap="round">
          <path d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M3.2 12.8l1.1-1.1M11.7 4.3l1.1-1.1" />
        </g>
      </Show>
      <Show when={props.sky !== "sun"}>
        <path
          d="M4.5 11.5a3 3 0 0 1 .3-6 4 4 0 0 1 7.6 1.2 2.4 2.4 0 0 1-.4 4.8Z"
          fill="rgba(255,255,255,0.8)"
        />
      </Show>
      <Show when={props.sky === "rain"}>
        <path
          d="M6 13l-.6 1.6M9 13l-.6 1.6M12 13l-.6 1.6"
          stroke={CALM}
          stroke-width="1.2"
          stroke-linecap="round"
        />
      </Show>
    </svg>
  );
}

const PLACES: { place: string; temp: number; sky: Sky; hourly: [Sky, number][] }[] = [
  {
    place: "Portland",
    temp: 13,
    sky: "rain",
    hourly: [["rain", 13], ["rain", 13], ["cloud", 14], ["cloud", 15], ["sun", 16], ["sun", 15]]
  },
  {
    place: "Lisbon",
    temp: 24,
    sky: "sun",
    hourly: [["sun", 24], ["sun", 25], ["sun", 26], ["cloud", 25], ["cloud", 23], ["sun", 21]]
  }
];

function WeatherMock() {
  const [i, setI] = createSignal(0);
  useDemoLoop(7000, [
    [0, () => setI(0)],
    [3500, () => setI(1)]
  ]);
  const p = () => PLACES[i()];
  return (
    <div class="flex w-full max-w-[260px] flex-col items-center gap-3">
      <MiniPill class="h-[34px] flex-col gap-0 px-4">
        <SkyGlyph sky={p().sky} size={12} />
        <span class="font-mono text-[11px] leading-none font-bold text-white">
          {p().temp}°
        </span>
      </MiniPill>
      <ModuleCard class="w-full">
        <div class="text-left">
          <div class="mb-2 flex items-baseline">
            <span class="text-[11px] font-semibold text-white">{p().place}</span>
            <span class="ml-auto text-[9px] text-white/40">
              {i() + 1} of {PLACES.length}
            </span>
          </div>
          <div class="flex justify-between">
            <Index each={p().hourly}>
              {(h, hour) => (
                <div class="flex flex-col items-center gap-1">
                  <span class="text-[8px] text-white/40">
                    {hour === 0 ? "Now" : `${(13 + hour) % 24}`}
                  </span>
                  <SkyGlyph sky={h()[0]} size={12} />
                  <span class="font-mono text-[10px] text-white/85">
                    {h()[1]}°
                  </span>
                </div>
              )}
            </Index>
          </div>
        </div>
      </ModuleCard>
    </div>
  );
}

/* ── Interceptions: volume & brightness peek below the island ────── */

const PEEKS = [
  { kind: "volume", label: "Speakers", from: 0.35, to: 0.7 },
  { kind: "bright", label: "Built-in display", from: 0.6, to: 1 },
  { kind: "xdr", label: "Extra brightness", from: 1, to: 1.3 },
  { kind: "bright", label: "External display", from: 0.3, to: 0.65 }
] as const;

function InterceptionMock() {
  const [peek, setPeek] = createSignal(0);
  const [level, setLevel] = createSignal<number>(PEEKS[0].from);
  const [shown, setShown] = createSignal(false);
  const steps: [number, () => void][] = [];
  PEEKS.forEach((pk, n) => {
    const base = n * 2600;
    steps.push([base, () => (setPeek(n), setLevel(pk.from), setShown(true))]);
    for (let k = 1; k <= 4; k++) {
      steps.push([
        base + 250 + k * 280,
        () => setLevel(pk.from + ((pk.to - pk.from) * k) / 4)
      ]);
    }
    steps.push([base + 2300, () => setShown(false)]);
  });
  useDemoLoop(PEEKS.length * 2600, steps);

  const pk = () => PEEKS[peek()];
  const xdr = () => level() > 1;
  return (
    <div class="flex w-full max-w-[360px] flex-col items-center">
      <div
        class="relative overflow-hidden rounded-b-[16px] bg-black transition-all duration-300"
        style={{
          width: shown() ? "300px" : "200px",
          height: shown() ? "68px" : "26px",
          "transition-timing-function": "cubic-bezier(0.34,1.56,0.64,1)",
          "box-shadow": `inset 0 0 0 1px ${CARD_STROKE}`
        }}
      >
        <div
          class="absolute inset-x-0 bottom-0 flex items-center gap-2.5 px-4 pb-3 transition-opacity duration-200"
          style={{ opacity: shown() ? 1 : 0 }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            style={{ color: xdr() ? "#FFD23F" : "white" }}
          >
            <Show
              when={pk().kind === "volume"}
              fallback={
                <g fill="currentColor" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
                  <circle cx="8" cy="8" r="3" stroke="none" />
                  <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" fill="none" />
                </g>
              }
            >
              <path d="M2 6h3l4-3v10l-4-3H2Z" fill="currentColor" />
              <path d="M11 5.5a3.5 3.5 0 0 1 0 5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" />
            </Show>
          </svg>
          <div class="flex-1">
            <p class="mb-1 text-left text-[9px] text-white/50">{pk().label}</p>
            <div
              class="relative h-[6px] rounded-full"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              <div
                class="h-full rounded-full"
                style={{
                  width: `${Math.min(level(), 1) * (pk().kind === "xdr" ? 76.9 : 100)}%`,
                  background: "white",
                  transition: "width 0.2s ease-out"
                }}
              />
              <Show when={pk().kind === "xdr"}>
                <span
                  class="absolute top-[-3px] h-[12px] w-px bg-white/50"
                  style={{ left: "76.9%" }}
                />
                <div
                  class="absolute top-0 h-full rounded-r-full"
                  style={{
                    left: "76.9%",
                    width: `${Math.max(0, level() - 1) * 76.9}%`,
                    background: "#FFD23F",
                    "box-shadow": "0 0 10px 2px rgba(255,210,63,0.6)",
                    transition: "width 0.2s ease-out"
                  }}
                />
              </Show>
            </div>
          </div>
          <span class="w-9 text-right font-mono text-[10px] text-white/80">
            {Math.round(level() * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Network: speed test on demand + identity rows ───────────────── */

function NetworkMock() {
  const [down, setDown] = createSignal(0);
  const [up, setUp] = createSignal(0);
  const [running, setRunning] = createSignal(false);
  const steps: [number, () => void][] = [
    [0, () => (setDown(0), setUp(0), setRunning(false))],
    [1200, () => setRunning(true)]
  ];
  for (let k = 1; k <= 12; k++) {
    steps.push([1200 + k * 120, () => setDown(Math.round((842 * k) / 12))]);
    steps.push([2800 + k * 90, () => setUp(Math.round((96 * k) / 12))]);
  }
  steps.push([4000, () => setRunning(false)]);
  useDemoLoop(8400, steps);

  return (
    <ModuleCard class="w-full max-w-[260px]">
      <div class="space-y-2 text-left">
        <div class="flex items-end gap-3">
          <div>
            <p class="text-[8px] font-semibold text-white/40">DOWN</p>
            <p class="font-mono text-[16px] font-semibold text-white">
              {down()}
              <span class="ml-0.5 text-[9px] text-white/50">Mbps</span>
            </p>
          </div>
          <div>
            <p class="text-[8px] font-semibold text-white/40">UP</p>
            <p class="font-mono text-[16px] font-semibold text-white">
              {up()}
              <span class="ml-0.5 text-[9px] text-white/50">Mbps</span>
            </p>
          </div>
          <span
            class="ml-auto rounded-md px-2 py-0.5 text-[10px] font-semibold text-white"
            style={{ background: running() ? "rgba(255,255,255,0.1)" : ACCENT }}
          >
            {running() ? "testing…" : "Run"}
          </span>
        </div>
        <div class="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        <For
          each={[
            ["Public IP", "203.0.113.42"],
            ["ISP", "Example Fiber · AS64500"],
            ["DNS", "1.1.1.1"]
          ]}
        >
          {([k, v]) => (
            <div class="flex items-center gap-2 text-[10px]">
              <span class="w-14 text-white/40">{k}</span>
              <span class="truncate font-mono text-white/80">{v}</span>
              <span class="ml-auto text-white/30">⧉</span>
            </div>
          )}
        </For>
        <span
          class="inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold"
          style={{ background: "rgba(110,167,255,0.18)", color: "#9cc3ff" }}
        >
          VPN · default route
        </span>
      </div>
    </ModuleCard>
  );
}

/* ── Disk: throughput trace, capacity, SMART ─────────────────────── */

function DiskMock() {
  const tick = useTick(450);
  const sample = (n: number, k: number) => {
    const x = Math.sin(n * 0.9 + k * 2.1) * 0.5 + Math.sin(n * 0.37 + k) * 0.5;
    return Math.max(0.05, Math.min(1, 0.45 + x * 0.45));
  };
  const path = (k: number) => {
    const pts = Array.from({ length: 24 }, (_, i) => {
      const v = sample(tick() + i, k) * (k === 0 ? 1 : 0.45);
      return `${(i / 23) * 200},${40 - v * 36}`;
    });
    return `M${pts.join(" L")}`;
  };
  const read = () => Math.round(sample(tick() + 23, 0) * 900);
  const write = () => Math.round(sample(tick() + 23, 1) * 0.45 * 900);
  return (
    <ModuleCard class="w-full max-w-[260px]">
      <div class="space-y-2 text-left">
        <div class="flex items-baseline gap-3 font-mono text-[11px]">
          <span style={{ color: CALM }}>R {read()} MB/s</span>
          <span style={{ color: WARM }}>W {write()} MB/s</span>
        </div>
        <svg viewBox="0 0 200 42" class="h-[42px] w-full" preserveAspectRatio="none">
          <path d={path(0)} fill="none" stroke={CALM} stroke-width="1.5" />
          <path d={path(1)} fill="none" stroke={WARM} stroke-width="1.5" />
        </svg>
        <div class="flex items-center text-[10px]">
          <span class="text-white/70">Macintosh HD</span>
          <span class="ml-auto text-white/45">612 GB free of 1 TB</span>
        </div>
        <div
          class="h-[5px] overflow-hidden rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div class="h-full rounded-full" style={{ width: "39%", background: CALM }} />
        </div>
        <span
          class="inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold"
          style={{ background: "rgba(111,185,130,0.18)", color: STATUS.ready }}
        >
          SMART · Verified
        </span>
      </div>
    </ModuleCard>
  );
}

/* ── Keep Awake: four ways to hold off sleep ─────────────────────── */

const AWAKE_MODES = [
  { label: "1 hour", note: "awake for 59:12 more" },
  { label: "On power", note: "awake while plugged in" },
  { label: "Lid closed", note: "keeps running with the lid shut" },
  { label: "Agents", note: "awake only while agents work" }
];

function KeepAwakeMock() {
  const [mode, setMode] = createSignal(0);
  useDemoLoop(
    9600,
    AWAKE_MODES.map((_, n) => [n * 2400, () => setMode(n)] as [number, () => void])
  );
  return (
    <ModuleCard class="w-full max-w-[260px]">
      <div class="flex flex-col items-center gap-2.5">
        <svg width="40" height="40" viewBox="0 0 40 40" class="overflow-visible">
          <g class="nook-steam" stroke="rgba(255,255,255,0.5)" stroke-width="1.6" fill="none" stroke-linecap="round">
            <path d="M15 12c-2-3 2-4 0-7" />
            <path d="M21 12c-2-3 2-4 0-7" style={{ "animation-delay": "-0.6s" }} />
          </g>
          <path d="M8 15h22v9a9 9 0 0 1-9 9h-4a9 9 0 0 1-9-9Z" fill={WARM} />
          <path d="M30 18h2a4 4 0 0 1 0 8h-2" stroke={WARM} stroke-width="2.4" fill="none" />
        </svg>
        <div class="grid w-full grid-cols-2 gap-1.5">
          <For each={AWAKE_MODES}>
            {(m, n) => (
              <span
                class="rounded-md py-1 text-center text-[10px] font-semibold transition-colors duration-300"
                style={{
                  background: mode() === n() ? ACCENT : CARD_FILL,
                  color: mode() === n() ? "white" : "rgba(255,255,255,0.55)",
                  "box-shadow": `inset 0 0 0 1px ${CARD_STROKE}`
                }}
              >
                {m.label}
              </span>
            )}
          </For>
        </div>
        <p class="text-[10px] text-white/45">{AWAKE_MODES[mode()].note}</p>
      </div>
    </ModuleCard>
  );
}

/* ── Approval modes: Auto · Yolo · Verify ────────────────────────── */

const MODES = [
  { name: "Auto", note: "follows each agent's own settings", card: "asks", tint: "rgba(234,179,8,0.10)" },
  { name: "Yolo", note: "gated tools pass straight through", card: "passed", tint: "rgba(111,185,130,0.12)" },
  { name: "Verify", note: "every gated tool waits for you", card: "held", tint: "rgba(229,72,77,0.12)" }
];

function ApprovalModesMock() {
  const [mode, setMode] = createSignal(0);
  useDemoLoop(8400, [
    [0, () => setMode(0)],
    [2800, () => setMode(1)],
    [5600, () => setMode(2)]
  ]);
  const m = () => MODES[mode()];
  return (
    <div class="w-full max-w-[260px] space-y-2.5">
      <div
        class="relative flex rounded-lg p-0.5"
        style={{ background: CARD_FILL, "box-shadow": `inset 0 0 0 1px ${CARD_STROKE}` }}
      >
        <span
          class="absolute top-0.5 bottom-0.5 rounded-md transition-all duration-300"
          style={{
            left: `calc(${mode() * 33.333}% + 2px)`,
            width: "calc(33.333% - 4px)",
            background: ACCENT
          }}
        />
        <For each={MODES}>
          {(x, n) => (
            <span
              class="relative z-10 flex-1 py-1 text-center text-[11px] font-semibold transition-colors"
              style={{ color: mode() === n() ? "white" : "rgba(255,255,255,0.55)" }}
            >
              {x.name}
            </span>
          )}
        </For>
      </div>
      <div
        class="rounded-[10px] p-2.5 text-left transition-colors duration-500"
        style={{ background: m().tint }}
      >
        <div class="flex items-center gap-1.5">
          <span class="text-[12px] font-medium text-white">Bash</span>
          <span class="truncate font-mono text-[10px] text-white/50">
            rm -rf build/
          </span>
          <span
            class="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            {m().card}
          </span>
        </div>
      </div>
      <p class="text-center text-[10px] text-white/45">{m().note}</p>
    </div>
  );
}

/* ── Lock Screen: counts without unlocking ───────────────────────── */

function LockScreenMock() {
  const [counts, setCounts] = createSignal({ working: 3, waiting: 0 });
  useDemoLoop(7200, [
    [0, () => setCounts({ working: 3, waiting: 0 })],
    [2400, () => setCounts({ working: 2, waiting: 1 })],
    [4800, () => setCounts({ working: 1, waiting: 0 })]
  ]);
  return (
    <div
      class="relative h-[150px] w-full max-w-[260px] overflow-hidden rounded-xl"
      style={{
        background: "radial-gradient(120% 90% at 30% 10%, #2b4a6b 0%, #191b2e 55%, #0d0d0f 100%)"
      }}
    >
      <div
        class="absolute top-0 left-1/2 flex h-[22px] -translate-x-1/2 items-center gap-2 rounded-b-[9px] bg-black px-2.5"
      >
        <span class="flex items-center gap-1">
          <span class="h-[6px] w-[6px] rounded-[1.5px]" style={{ background: STATUS.running }} />
          <span class="font-mono text-[9px] font-semibold text-white/90">{counts().working}</span>
        </span>
        <span class="w-6" />
        <span class="flex items-center gap-1">
          <span
            class="h-[6px] w-[6px] rounded-[1.5px] transition-colors"
            style={{ background: counts().waiting ? STATUS.attention : STATUS.idle }}
          />
          <span class="font-mono text-[9px] font-semibold text-white/90">{counts().waiting}</span>
        </span>
      </div>
      <div class="flex h-full flex-col items-center justify-center pt-4">
        <p class="text-[34px] leading-tight font-semibold tracking-tight text-white/90">
          9:41
        </p>
        <span class="mt-2 h-5 w-5 rounded-full border border-white/30" />
      </div>
    </div>
  );
}

/* ── Layout: the mosaic reflows ──────────────────────────────────── */

type Box = [l: number, t: number, w: number, h: number];
const LAYOUTS: Box[][] = [
  [[0, 0, 66, 58], [68, 0, 32, 58], [0, 62, 32, 38], [34, 62, 32, 38], [68, 62, 32, 38]],
  [[0, 0, 32, 100], [34, 0, 66, 40], [34, 44, 32, 56], [68, 44, 32, 26], [68, 74, 32, 26]],
  [[0, 0, 49, 48], [51, 0, 49, 48], [0, 52, 100, 22], [0, 78, 49, 22], [51, 78, 49, 22]]
];
const TILE_COLORS = [CALM, STATUS.ready, WARM, "#fa5c7c", "rgba(255,255,255,0.5)"];

function LayoutMock() {
  const [n, setN] = createSignal(0);
  useDemoLoop(7500, [
    [0, () => setN(0)],
    [2500, () => setN(1)],
    [5000, () => setN(2)]
  ]);
  return (
    <div
      class="relative h-[130px] w-full max-w-[240px] rounded-[12px] bg-black p-2"
      style={{ "box-shadow": `inset 0 0 0 1px ${CARD_STROKE}` }}
    >
      <div class="relative h-full w-full">
        <For each={TILE_COLORS}>
          {(color, i) => {
            const b = () => LAYOUTS[n()][i()];
            return (
              <div
                class="absolute rounded-md"
                style={{
                  left: `${b()[0]}%`,
                  top: `${b()[1]}%`,
                  width: `${b()[2]}%`,
                  height: `${b()[3]}%`,
                  background: CARD_FILL,
                  "box-shadow": `inset 0 0 0 1px ${CARD_STROKE}, inset 3px 0 0 ${color}`,
                  transition: "all 0.7s cubic-bezier(0.34,1.3,0.64,1)"
                }}
              />
            );
          }}
        </For>
      </div>
    </div>
  );
}

/* ── Marquee ─────────────────────────────────────────────────────── */

const CHIPS_A = [
  "13 agents",
  "Custom agents",
  "Six chiptunes",
  "Focus-aware slots",
  "Per-app output routing",
  "Low Power Mode toggle",
  "Reminders",
  "Battery health",
  "Energy flow in watts",
  "Thermal charge protection",
  "Top-up charging",
  "Memory by process"
];
const CHIPS_B = [
  "Jump to the terminal",
  "tmux · iTerm2 · kitty",
  "Markdown replies",
  "Tailscale hosts",
  "One-click SSH setup",
  "iPhone widgets",
  "Watch-face widgets",
  "Screenshots to clipboard",
  "System audio + mic",
  "Hourly forecast",
  "External display brightness",
  "Lid-closed keep-awake"
];

function MarqueeRow(props: { chips: string[]; reverse?: boolean }) {
  return (
    <div class="nook-marquee">
      <div class={`nook-marquee-track ${props.reverse ? "reverse" : ""}`}>
        <For each={[...props.chips, ...props.chips]}>
          {(chip, i) => (
            <span
              aria-hidden={i() >= props.chips.length ? "true" : undefined}
              class="border-overlay0 bg-surface0 text-subtext0 rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap"
            >
              {chip}
            </span>
          )}
        </For>
      </div>
    </div>
  );
}

export default function IslandExtras() {
  return (
    <section class="bg-base relative z-20 py-16" id="island-extras">
      <div class="px-4 md:px-8">
        <p class="text-subtext1 mb-2 text-center text-xs font-semibold tracking-[0.18em] uppercase">
          And everything else
        </p>
        <h2 class="text-text mb-3 text-center text-3xl font-bold">
          One island instead of a menu bar full of utilities
        </h2>
        <p class="text-subtext0 mx-auto mb-10 max-w-2xl text-center leading-relaxed">
          Every module below lives in the same notch, arranged however you
          like, under the same one-time license.
        </p>
      </div>

      <div class="mb-12 space-y-3">
        <MarqueeRow chips={CHIPS_A} />
        <MarqueeRow chips={CHIPS_B} reverse />
      </div>

      <div class="mx-auto grid max-w-5xl grid-cols-1 gap-5 px-4 md:grid-cols-3 md:px-8">
        <CollageCell
          class="md:col-span-2"
          kicker="Now Playing"
          title="Music in the notch"
          body="Track, source, and transport controls in a module. Sources without artwork, like some browsers, get a live waveform in the slot instead."
        >
          <InkStage class="h-full w-full items-center">
            <NowPlayingMock />
          </InkStage>
        </CollageCell>

        <CollageCell
          kicker="Timers"
          title="Timers that stack"
          body="A readout over a tick tape that drains with a soft crest. Run several at once; finished timers ring and hold the island open until you dismiss them."
        >
          <InkStage class="h-full w-full items-center px-3">
            <TimersMock />
          </InkStage>
        </CollageCell>

        <CollageCell
          kicker="Weather"
          title="The sky, in the slot"
          body="Saved places with hourly and daily forecasts. The compact slot stacks the sky over the temperature."
        >
          <InkStage class="h-full w-full items-center px-3">
            <WeatherMock />
          </InkStage>
        </CollageCell>

        <CollageCell
          class="md:col-span-2"
          kicker="Interceptions"
          title="Volume and brightness, under the notch"
          body="An optional takeover of the system HUD: levels peek out below the island. Extra brightness spends an XDR panel's HDR headroom past the usual maximum, and external displays get real brightness control."
        >
          <InkStage class="h-full w-full items-center">
            <div class="flex min-h-[110px] w-full justify-center pt-2">
              <InterceptionMock />
            </div>
          </InkStage>
        </CollageCell>

        <CollageCell
          kicker="Approval modes"
          title="One stance for every agent"
          body="Auto follows each agent's own settings, Yolo waves gated tools through, and Verify holds every one until you decide."
        >
          <InkStage class="h-full w-full items-center px-3">
            <ApprovalModesMock />
          </InkStage>
        </CollageCell>

        <CollageCell
          kicker="Network"
          title="Know your connection"
          body="Public IP, ISP, gateway, and DNS one click from your clipboard. VPN routes get flagged, and a speed test is always a click away."
        >
          <InkStage class="h-full w-full items-center px-3">
            <NetworkMock />
          </InkStage>
        </CollageCell>

        <CollageCell
          kicker="Disks"
          title="Storage, measured"
          body="Live read and write throughput, capacity that matches Finder, and SMART health for your drives."
        >
          <InkStage class="h-full w-full items-center px-3">
            <DiskMock />
          </InkStage>
        </CollageCell>

        <CollageCell
          kicker="Keep Awake"
          title="Sleep when you say"
          body="Stay awake for a set time, while plugged in, with the lid closed, or only while your agents are working."
        >
          <InkStage class="h-full w-full items-center px-3">
            <KeepAwakeMock />
          </InkStage>
        </CollageCell>

        <CollageCell
          kicker="Lock Screen"
          title="Visible while locked"
          body="The island stays on your Lock Screen, so you can see how many agents are working or waiting without unlocking."
        >
          <InkStage class="h-full w-full items-center px-3">
            <LockScreenMock />
          </InkStage>
        </CollageCell>

        <CollageCell
          kicker="Layout"
          title="Panels you shape"
          body="Drag and resize modules in the mosaic editor, pick a density, and let slot rankings switch with your Focus mode."
        >
          <InkStage class="h-full w-full items-center px-3">
            <LayoutMock />
          </InkStage>
        </CollageCell>
      </div>
    </section>
  );
}
