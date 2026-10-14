import {
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  type JSX
} from "solid-js";
import {
  IslandPill,
  AgentDotGrid,
  CALM,
  WARM,
  ACCENT,
  CRITICAL,
  ModuleCard,
  FakeCursor
} from "./IslandMock";
import { Campfire, type CampfireState } from "./Campfire";
import {
  ApprovalCardMock,
  SessionRowMock,
  Glyph,
  CLAUDE,
  CODEX
} from "./ModuleMocks";
import { useDemoLoop } from "./useDemoLoop";
import {
  TerminalReplyDemo,
  MixerDemo,
  CaptureDemo,
  FloatingActionsDemo
} from "./MoreDemos";

/**
 * Detailed feature breakdowns: alternating copy + live-demo sections.
 * Each demo stages the real interaction loop: attention flares, approval
 * resolves, fans throttle, the charge ceiling holds, meetings surface,
 * the camera wakes, a remote host goes live. Newer demos live in
 * MoreDemos.tsx; app-anatomy pieces in ModuleMocks.tsx.
 */

/* Scroll-triggered reveal: adds `in` once the element crosses 25%. */
function useReveal() {
  const [el, setEl] = createSignal<HTMLDivElement>();
  onMount(() => {
    const node = el();
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.classList.add("in");
            observer.disconnect();
          }
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(node);
    onCleanup(() => observer.disconnect());
  });
  return [setEl, el] as const;
}

function BreakdownSection(props: {
  kicker: string;
  title: string;
  body: string;
  bullets: string[];
  reversed?: boolean;
  children: JSX.Element;
}) {
  const [ref] = useReveal();
  return (
    <div
      ref={ref}
      class="reveal grid grid-cols-1 items-center gap-10 md:grid-cols-2"
    >
      <div class={props.reversed ? "md:order-2" : ""}>
        <p class="text-subtext1 mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
          {props.kicker}
        </p>
        <h3 class="text-text mb-3 text-2xl font-bold tracking-tight">
          {props.title}
        </h3>
        <p class="text-subtext0 mb-5 leading-relaxed">{props.body}</p>
        <ul class="space-y-2.5">
          <For each={props.bullets}>
            {(bullet) => (
              <li class="text-subtext1 flex gap-2.5 text-sm">
                <span
                  class="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-[2px]"
                  style={{ background: ACCENT }}
                />
                {bullet}
              </li>
            )}
          </For>
        </ul>
      </div>
      <div
        class={`rounded-2xl p-6 md:p-8 ${props.reversed ? "md:order-1" : ""}`}
        style={{
          background:
            "radial-gradient(70% 90% at 50% 0%, rgba(72,151,178,0.12) 0%, transparent 70%) #0d0d0f"
        }}
      >
        {props.children}
      </div>
    </div>
  );
}

/* ── Demo 1: the fleet loop — attention flares, then resolves ─────── */

function FleetDemo() {
  const [phase, setPhase] = createSignal<"watch" | "flare" | "resolve">(
    "watch"
  );
  onMount(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const loop = () => {
      setPhase("watch");
      timers.push(setTimeout(() => setPhase("flare"), 3200));
      timers.push(setTimeout(() => setPhase("resolve"), 6400));
    };
    loop();
    const interval = setInterval(loop, 9600);
    onCleanup(() => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    });
  });

  const states = () => {
    switch (phase()) {
      case "watch":
        return ["running", "running", "ready", "running", "idle"] as const;
      case "flare":
        return ["running", "attention", "ready", "running", "idle"] as const;
      case "resolve":
        return ["running", "ready", "ready", "running", "idle"] as const;
    }
  };

  return (
    <div class="flex flex-col items-center gap-4">
      <IslandPill
        campfire={phase() === "flare" ? "question" : "running"}
        right={<AgentDotGrid states={states().slice(0, 4) as never} />}
      />
      <div
        class="rounded-xl px-4 py-3 text-center shadow-lg transition-all duration-500"
        style={{
          background:
            phase() === "flare"
              ? "rgba(231,167,98,0.12)"
              : "rgba(255,255,255,0.055)",
          "box-shadow": "inset 0 0 0 1px rgba(255,255,255,0.07)",
          transform:
            phase() === "flare"
              ? "translateY(0) scale(1)"
              : "translateY(6px) scale(0.98)",
          opacity: phase() === "watch" ? 0.55 : 1
        }}
      >
        <p class="text-[13px] font-semibold text-white">
          {phase() === "flare"
            ? "Codex needs your input"
            : phase() === "resolve"
              ? "Answer delivered — agents back to work"
              : "Fleet running calmly"}
        </p>
        <p class="mt-0.5 text-[11px] text-white/50">
          {phase() === "flare" ? "question · in the island now" : "\u00a0"}
        </p>
      </div>
    </div>
  );
}

/* ── Demo 2: an approval surfaces the island; Allow resumes the run ── */

function ApprovalDemo() {
  const [phase, setPhase] = createSignal<"calm" | "ask" | "press" | "resumed">("calm");
  useDemoLoop(10400, [
    [0, () => setPhase("calm")],
    [1400, () => setPhase("ask")],
    [4600, () => setPhase("press")],
    [4950, () => setPhase("resumed")],
    [8800, () => setPhase("calm")]
  ]);
  const asking = () => phase() === "ask" || phase() === "press";
  const open = () => phase() !== "calm";
  return (
    <div class="relative flex h-[390px] flex-col items-center gap-3">
      <IslandPill
        campfire={asking() ? "question" : "running"}
        right={
          <AgentDotGrid
            states={asking() ? ["attention", "running", "ready"] : ["running", "running", "ready"]}
          />
        }
      />
      {/* the island opens: approval pinned above the session rows */}
      <div
        class="w-full max-w-[380px] overflow-hidden rounded-[14px] bg-black transition-all duration-700"
        style={{
          "max-height": open() ? "320px" : "0px",
          opacity: open() ? 1 : 0,
          transform: open() ? "translateY(0)" : "translateY(-8px)"
        }}
      >
        <div class="p-2.5">
          <div
            class="grid transition-all duration-500"
            style={{ "grid-template-rows": asking() ? "1fr" : "0fr", opacity: asking() ? 1 : 0 }}
          >
            <div class="overflow-hidden">
              <div class="pb-1.5">
                <ApprovalCardMock
                  agent={CLAUDE}
                  title="the-nook · harden the bridge"
                  tool="Bash"
                  input="swift test --filter Bridge"
                  pressed={phase() === "press" ? "allow" : undefined}
                />
              </div>
            </div>
          </div>
          <div class="space-y-1.5">
            <SessionRowMock
              title="the-nook · main"
              prompt="harden the bridge"
              state={
                asking()
                  ? "Approve Bash — swift test --filter Bridge?"
                  : "Running swift test --filter Bridge…"
              }
              status={asking() ? "attention" : "running"}
              agent={CLAUDE}
              origin="iTerm2"
              age="6m"
            />
            <SessionRowMock
              title="site · nook-334"
              prompt="match the mocks to the app"
              state="Reading ModuleMocks.tsx…"
              status="running"
              agent={CODEX}
              origin="kitty-tmux"
              age="2m"
            />
          </div>
        </div>
      </div>
      <div class="pointer-events-none absolute inset-y-0 left-1/2 w-[380px] -translate-x-1/2">
        <FakeCursor
          phase={phase() === "press" ? "press" : asking() ? "idle" : "live"}
          at={{ x: 9.5, y: 41 }}
          exit={{ x: 30, y: 70 }}
        />
      </div>
    </div>
  );
}

/* ── Demo 3: fans throttle up under load, then back down ──────────── */

/* Spark pool: deterministic pseudo-random, count gated by fan speed. */
const sparkRand = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const SPARKS = Array.from({ length: 20 }, (_, i) => ({
  sx: `${Math.round(10 + sparkRand(i, 1) * 26)}px`,
  sy: `${Math.round(18 + sparkRand(i, 2) * 30)}px`,
  sd: `${(0.4 + sparkRand(i, 3) * 0.25).toFixed(2)}s`,
  sdel: `${(sparkRand(i, 4) * 1.2).toFixed(2)}s`,
  size: sparkRand(i, 5) > 0.5 ? 3 : 2
}));

function FansDemo() {
  const [rpm, setRpm] = createSignal(1270);
  const [maxed, setMaxed] = createSignal(false);
  onMount(() => {
    let frame = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const ramp = (target: number, durationMs: number) => {
      cancelAnimationFrame(frame);
      const start = rpm();
      const startTime = performance.now();
      const step = (now: number) => {
        const t = Math.min((now - startTime) / durationMs, 1);
        setRpm(Math.round(start + (target - start) * t));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };
    const loop = () => {
      setMaxed(true);
      ramp(5960, 1200);
      timers.push(
        setTimeout(() => {
          setMaxed(false);
          ramp(1270, 1600);
        }, 5200)
      );
    };
    loop();
    const interval = setInterval(loop, 10400);
    onCleanup(() => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
      cancelAnimationFrame(frame);
    });
  });

  const fans = () => [
    { rpm: rpm(), frac: rpm() / 6000 },
    { rpm: Math.round(rpm() * 0.96), frac: (rpm() * 0.96) / 6000 }
  ];

  const shakeIntensity = () =>
    Math.max(0, Math.min(1, (rpm() - 2500) / (6000 - 2500)));
  /* 5 sparks when the shake starts, ~20 at max speed. */
  const sparkCount = () =>
    shakeIntensity() > 0 ? 5 + Math.floor(shakeIntensity() * 15) : 0;
  return (
    <div class="relative mx-auto w-full max-w-[320px]">
      <ModuleCard
        class="fan-card-shake relative z-10"
        style={{
          "--fan-amp": `${(shakeIntensity() * 2.6).toFixed(2)}deg`,
          "--fan-speed": `${(0.4 - shakeIntensity() * 0.28).toFixed(3)}s`
        }}
      >
        <div class="space-y-3 text-left">
          <For each={fans()}>
            {(f, i) => (
              <div class="flex items-center gap-3">
                <span class="text-[10px] font-medium text-white/50">
                  Fan {i() + 1}
                </span>
                <div
                  class="h-1 flex-1 overflow-hidden rounded-full"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div
                    class="h-full rounded-full"
                    style={{
                      width: `${Math.min(f.frac, 1) * 100}%`,
                      background: maxed() ? CRITICAL : CALM,
                      transition: "width 0.2s linear, background 0.4s"
                    }}
                  />
                </div>
                <span
                  class="font-mono text-white"
                  style={{ "font-size": "13px", "font-weight": 500 }}
                >
                  {Math.round(f.rpm)}
                </span>
                <span class="text-[9px] font-semibold text-white/50">RPM</span>
              </div>
            )}
          </For>
          <div class="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div class="flex items-center gap-2">
            <span
              class="rounded-md px-2 py-0.5 text-[11px] font-bold transition-colors"
              style={{ color: maxed() ? CRITICAL : "rgba(255,255,255,0.7)" }}
            >
              {maxed() ? "MAX" : "Auto"}
            </span>
            <span class="text-[10px] text-white/40">
              {maxed() ? "cooling session active" : "curve in control"}
            </span>
          </div>
        </div>
      </ModuleCard>
      <div
        class="pointer-events-none absolute z-0"
        style={{
          right: "6px",
          bottom: "-2px",
          opacity: sparkCount() > 0 ? "1" : "0",
          transition: "opacity 0.3s"
        }}
      >
        <For each={SPARKS.slice(0, sparkCount())}>
          {(s) => (
            <span
              class="fan-spark"
              style={{
                width: `${s.size}px`,
                height: `${s.size}px`,
                "--sx": s.sx,
                "--sy": s.sy,
                "--sd": s.sd,
                "--sdel": s.sdel
              }}
            />
          )}
        </For>
      </div>
    </div>
  );
}

/* ── Demo 4: the charge ceiling holds, top-up overrules ───── */

function BatteryDemo() {
  const [level, setLevel] = createSignal(62);
  const [phase, setPhase] = createSignal<"charge" | "held" | "topup">("charge");
  onMount(() => {
    let frame = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const ramp = (target: number, durationMs: number) => {
      cancelAnimationFrame(frame);
      const start = level();
      const startTime = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - startTime) / durationMs, 1);
        setLevel(start + (target - start) * t);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const loop = () => {
      setLevel(62);
      setPhase("charge");
      ramp(80, 2600);
      timers.push(setTimeout(() => setPhase("held"), 2800));
      timers.push(
        setTimeout(() => {
          setPhase("topup");
          ramp(100, 2600);
        }, 5200)
      );
    };
    loop();
    const interval = setInterval(loop, 9600);
    onCleanup(() => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
      cancelAnimationFrame(frame);
    });
  });

  const pct = () => Math.round(level());
  const watts = () => (phase() === "held" ? null : pct() >= 100 ? 9 : 38);
  const subline = () =>
    phase() === "held"
      ? "charging paused — at the limit"
      : pct() >= 100
        ? "topped up — re-arms on unplug"
        : phase() === "topup"
          ? `${watts()} W · top-up past the limit`
          : `${watts()} W · ${Math.max(1, Math.round((100 - pct()) * 1.5))} min to full`;
  return (
    <ModuleCard class="mx-auto w-full max-w-[320px]">
      <div class="space-y-3 text-left">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-semibold tracking-wide text-white/40 uppercase">
            Battery
          </span>
          <span
            class="ml-auto rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold transition-transform duration-300"
            style={{
              color: "rgba(255,255,255,0.75)",
              background: "rgba(255,255,255,0.08)",
              transform: phase() === "held" ? "scale(1.12)" : "scale(1)"
            }}
          >
            Limit 80%
          </span>
        </div>
        <div class="flex items-baseline gap-1.5">
          <span class="font-mono text-[22px] font-semibold text-white">
            {pct()}%
          </span>
          <span class="text-[11px] text-white/50">{subline()}</span>
        </div>
        <div
          class="relative h-[6px] overflow-hidden rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div
            class="h-full rounded-full"
            style={{
              width: `${pct()}%`,
              background: pct() > 80 ? WARM : CALM,
              transition: "background 0.4s"
            }}
          />
          <span
            class="absolute top-0 h-full w-px"
            style={{ left: "80%", background: "rgba(255,255,255,0.5)" }}
          />
        </div>
        <div
          class="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-500"
          style={{
            background:
              phase() === "topup" ? "rgba(110,167,255,0.10)" : "transparent"
          }}
        >
          <div class="flex-1">
            <p class="text-[11px] font-semibold text-white/85">Top-up mode</p>
            <p class="text-[9px] text-white/40">
              charge past the limit while plugged in
            </p>
          </div>
          <span
            class="relative inline-flex h-[16px] w-[30px] items-center rounded-full transition-colors duration-300"
            style={{
              background:
                phase() === "topup" ? ACCENT : "rgba(255,255,255,0.15)"
            }}
          >
            <span
              class="absolute h-[12px] w-[12px] rounded-full bg-white transition-all duration-300"
              style={{ left: phase() === "topup" ? "16px" : "2px" }}
            />
          </span>
        </div>
        <div class="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div class="flex items-center gap-2">
          <svg
            width="10"
            height="13"
            viewBox="0 0 10 13"
            style={{
              animation: watts()
                ? "nook-pulse 1.1s ease-in-out infinite"
                : "none",
              opacity: watts() ? 1 : 0.3
            }}
          >
            <path
              d="M6.2 0 0.8 7h2.6l-1 5.2L7.8 5.4H5l1.2-5.4z"
              fill="#FFD23F"
            />
          </svg>
          <span class="text-[10px] text-white/50">
            {phase() === "held"
              ? "holding — the pack stays young longer"
              : phase() === "topup"
                ? "topping up — re-arms when you unplug"
                : "on the way to the ceiling"}
          </span>
        </div>
      </div>
    </ModuleCard>
  );
}

/* ── Demo 5: the slot counts down, then opens the day ──────── */

const WEEK_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_EVENTS = [
  { time: "09:30–09:45", title: "Standup", loc: "Daily", meeting: true },
  { time: "15:30–16:00", title: "Design review", loc: "4th floor", meeting: false }
];

function CalendarDemo() {
  const [mins, setMins] = createSignal(14);
  const [today, setToday] = createSignal(new Date());
  onMount(() => {
    setToday(new Date());
    const interval = setInterval(
      () => setMins((m) => (m <= 0 ? 14 : m - 1)),
      900
    );
    onCleanup(() => clearInterval(interval));
  });
  const imminent = () => mins() <= 5;
  const dialDays = () => {
    const base = today();
    return [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((off) => {
      const d = new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate() + off
      );
      return {
        letter: WEEK_LETTERS[d.getDay()],
        num: d.getDate(),
        today: off === 0,
        past: off < 0,
        dots: (d.getDate() * 7 + d.getDay() * 3) % 4
      };
    });
  };
  return (
    /* Fixed height: the day panel expands into reserved space, never
       shifts the page (matters most on mobile's stacked layout). */
    <div class="flex h-[316px] flex-col items-center gap-4">
      <IslandPill
        campfire="running"
        right={
                    <div class="flex items-center gap-1">
            <svg width="10" height="8" viewBox="0 0 12 9" class="shrink-0">
              <path
                d="M0 2A1.4 1.4 0 0 1 1.4 0.6h5.6A1.4 1.4 0 0 1 8.4 2v5A1.4 1.4 0 0 1 7 8.4H1.4A1.4 1.4 0 0 1 0 7z M12 2.6 9 4.5l3 1.9z"
                fill="rgba(255,255,255,0.75)"
              />
            </svg>
            <span
              class="whitespace-nowrap font-mono text-[9.5px] font-semibold text-white/90"
              style={{ color: imminent() ? "#ff9e42" : "rgba(255,255,255,0.9)" }}
            >
              {mins() === 0 ? "now" : `${mins()}m`}
            </span>
          </div>
        }
      />
      {/* the island opening onto the day panel */}
      <div
        class="w-full max-w-[380px] overflow-hidden rounded-[14px] bg-black transition-all duration-700"
        style={{
          "max-height": imminent() ? "240px" : "0px",
          opacity: imminent() ? 1 : 0,
          transform: imminent() ? "translateY(0)" : "translateY(-8px)"
        }}
      >
        <div class="px-4 pt-3 pb-3 text-left">
          <div class="mb-2 flex items-center">
            <span class="text-[11px] font-semibold text-white/50">
              Calendar
            </span>
            <span class="ml-auto flex h-4 w-4 items-center justify-center text-[12px] font-semibold text-white/50">
              +
            </span>
          </div>
          <div class="mb-2 flex gap-1">
            <For each={dialDays()}>
              {(d) => (
                <div
                  class="flex flex-1 flex-col items-center gap-[3px]"
                  style={{ opacity: d.today ? 1 : d.past ? 0.55 : 0.8 }}
                >
                  <span class="text-[8px] font-semibold text-white/45">
                    {d.letter}
                  </span>
                  <span
                    class="flex h-[20px] w-[20px] items-center justify-center rounded-full text-[10px]"
                    style={{
                      background: d.today
                        ? "rgb(255,158,66)"
                        : "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.95)",
                      "font-weight": d.today ? 700 : 500
                    }}
                  >
                    {d.num}
                  </span>
                  <span class="flex h-[4px] gap-[2px]">
                    <For each={Array.from({ length: Math.min(d.dots, 3) })}>
                      {() => (
                        <span
                          class="rounded-full"
                          style={{
                            width: "3.5px",
                            height: "3.5px",
                            background: d.today
                              ? "rgb(255,158,66)"
                              : "rgba(255,255,255,0.55)"
                          }}
                        />
                      )}
                    </For>
                  </span>
                </div>
              )}
            </For>
          </div>
          <div
            class="mb-1 h-px"
            style={{ background: "rgba(255,255,255,0.06)" }}
          />
          <For each={DAY_EVENTS}>
            {(ev) => (
              <div
                class="flex items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors duration-500"
                style={{
                  background:
                    ev.meeting && imminent()
                      ? "rgba(72,151,178,0.16)"
                      : "transparent"
                }}
              >
                <div>
                  <p class="font-mono text-[10px] text-white/45">{ev.time}</p>
                  <p class="text-[11px] font-semibold text-white">{ev.title}</p>
                  {ev.loc && <p class="text-[10px] text-white/35">{ev.loc}</p>}
                </div>
                {ev.meeting && (
                  <span
                    class="ml-auto rounded-md px-2 py-0.5 text-[10px] font-semibold text-white transition-colors duration-500"
                    style={{
                      background: imminent() ? ACCENT : "rgba(255,255,255,0.10)"
                    }}
                  >
                    Open
                  </span>
                )}
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

/* ── Demo 6: the lens only wakes for a click ──────────────── */

function CameraDemo() {
  const [phase, setPhase] = createSignal<"idle" | "press" | "live">("idle");
  let videoRef: HTMLVideoElement | undefined;
  onMount(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const loop = () => {
      setPhase("idle");
      timers.push(setTimeout(() => setPhase("press"), 2600));
      timers.push(setTimeout(() => setPhase("live"), 3000));
    };
    loop();
    const interval = setInterval(loop, 8800);
    onCleanup(() => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    });
  });
  createEffect(() => {
    if (phase() === "live" && videoRef) {
      videoRef.currentTime = 0;
      // play() rejects with AbortError when interrupted by pause() (the loop
      // resetting to "idle") or when the browser pauses background media to
      // save power. Swallow it — the rejection is expected, not a failure.
      void videoRef.play().catch(() => {});
    } else {
      videoRef?.pause();
    }
  });
  return (
    <ModuleCard class="relative mx-auto w-full max-w-[300px]">
      <div class="space-y-2.5 text-left">
        <div class="flex items-center">
          <span class="text-[11px] font-semibold text-white/50">Camera</span>
          <span
            class="ml-auto rounded-md px-2 py-0.5 text-[10px] text-white/60 transition-opacity duration-300"
            style={{
              background: "rgba(255,255,255,0.06)",
              opacity: phase() === "live" ? 1 : 0
            }}
          >
            FaceTime HD Camera ▾
          </span>
        </div>
        <div class="relative h-[120px] overflow-hidden rounded-lg">
          {/* inert dashed start button */}
          <div
            class="absolute inset-0 flex flex-col items-center justify-center gap-2 transition-all duration-500"
            style={{
              border: "1px dashed rgba(255,255,255,0.14)",
              "border-radius": "8px",
              opacity: phase() === "live" ? 0 : 1,
              transform: phase() === "press" ? "scale(0.96)" : "scale(1)"
            }}
          >
            <svg width="18" height="14" viewBox="0 0 18 14">
              <path
                d="M2 2.8A1.8 1.8 0 0 1 3.8 1h2.2l1 1.4h4.2A1.8 1.8 0 0 1 13 4.2v6.6a1.8 1.8 0 0 1-1.8 1.8H3.8A1.8 1.8 0 0 1 2 10.8z"
                fill="rgba(255,255,255,0.5)"
              />
              <circle cx="7.5" cy="7.4" r="2.6" fill="rgba(0,0,0,0.35)" />
            </svg>
            <span class="text-[12px] font-semibold text-white/80">
              Start camera
            </span>
          </div>
                    {/* live preview */}
          <video
            ref={videoRef}
            src="/nook/cam-recording.mp4"
            muted
            playsinline
            preload="metadata"
            onEnded={() => setPhase("idle")}
            class="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
            style={{ opacity: phase() === "live" ? 1 : 0 }}
          />
          <FakeCursor phase={phase()} at={{ x: 50, y: 50 }} />
        </div>
        <p class="text-[10px] text-white/40">
          {phase() === "live"
            ? "live — stops the moment you leave the panel"
            : "inert — the lens stays dark until you click"}
        </p>
      </div>
    </ModuleCard>
  );
}

/* ── Demo 7: Settings ▸ Remote hosts — one click to Live ──────────── */

/** RemoteMirror's progress steps, in order. */
const SETUP_STEPS = [
  "connecting",
  "pushing the hook binary",
  "configuring agents",
  "checking the host can reach this Mac"
];

function RemoteHostDemo() {
  /* -1 not set up · 0…3 setting up · 4 live */
  const [step, setStep] = createSignal(-1);
  const [pressed, setPressed] = createSignal(false);
  useDemoLoop(11000, [
    [0, () => (setStep(-1), setPressed(false))],
    [1400, () => setPressed(true)],
    [1700, () => (setPressed(false), setStep(0))],
    [2700, () => setStep(1)],
    [3700, () => setStep(2)],
    [4700, () => setStep(3)],
    [5800, () => setStep(4)]
  ]);
  const live = () => step() === 4;
  const working = () => step() >= 0 && step() < 4;
  const chip = () =>
    live()
      ? { color: "rgb(48,209,88)", label: "Live" }
      : working()
        ? { color: "rgba(255,255,255,0.55)", label: "Setting up" }
        : { color: "rgba(255,255,255,0.35)", label: "Not set up" };

  return (
    <div class="relative mx-auto w-full max-w-[360px] space-y-3">
      {/* the host's card in Settings ▸ Agents ▸ Remote hosts */}
      <ModuleCard>
        <div class="space-y-2 text-left">
          <div class="flex items-center gap-2.5">
            <div class="min-w-0 flex-1">
              <p class="text-[13px] font-semibold text-white">gpu-rig</p>
              <p class="truncate text-[11px] text-white/45">tailnet peer</p>
            </div>
            <Show when={working()}>
              <span class="h-3 w-3 animate-spin rounded-full border-[1.5px] border-white/25 border-t-white/80" />
            </Show>
            <span class="flex items-center gap-1.5 text-[10.5px] font-medium text-white/85">
              <span
                class="h-[7px] w-[7px] rounded-full transition-colors duration-300"
                style={{ background: chip().color }}
              />
              {chip().label}
            </span>
            <Show
              when={live()}
              fallback={
                <span
                  class="rounded-md px-2.5 py-1 text-[11px] font-semibold text-white transition-all duration-200"
                  style={{
                    background: ACCENT,
                    opacity: working() ? 0 : 1,
                    transform: pressed() ? "scale(0.92)" : "scale(1)"
                  }}
                >
                  Set up
                </span>
              }
            >
              <Glyph name="refresh" size={11} class="text-white/50" />
              <span class="rounded-md bg-white/10 px-2 py-1 text-[11px] font-semibold text-[#ff6961]">
                Remove
              </span>
            </Show>
          </div>
          <p class="h-4 text-[11px] text-white/50">
            {working() ? SETUP_STEPS[step()] : " "}
          </p>
        </div>
      </ModuleCard>

      {/* its agents arrive as ordinary rows, the machine named in the chip */}
      <div
        class="transition-all duration-500"
        style={{
          opacity: live() ? 1 : 0,
          transform: live() ? "translateY(0)" : "translateY(6px)"
        }}
      >
        <SessionRowMock
          title="trainer · fp16"
          prompt="benchmark fp16"
          state="Running python bench.py…"
          status="running"
          agent={CODEX}
          host="gpu-rig"
          origin="iTerm2"
          age="now"
        />
      </div>
      <FakeCursor
        phase={pressed() ? "press" : step() === -1 ? "idle" : "live"}
        at={{ x: 88, y: 16 }}
      />
    </div>
  );
}

/* ── Demo 8: campfire states ───────────────────────────────────────── */

function CampfireDemo() {
  const states: CampfireState[] = [
    "running",
    "question",
    "ready",
    "idle",
    "error"
  ];
  const labels = [
    "fleet running",
    "pending question",
    "ready to review",
    "all quiet",
    "something failed"
  ];
  return (
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-5">
      <For each={states}>
        {(state, i) => (
          <div class="flex flex-col items-center gap-2.5">
            <div
              class="flex h-16 w-16 items-center justify-center rounded-xl"
              style={{ background: "rgba(255,255,255,0.055)" }}
            >
              <Campfire state={state} pixel={3} />
            </div>
            <p class="text-center text-[11px] font-medium text-white/60">
              {labels[i()]}
            </p>
          </div>
        )}
      </For>
    </div>
  );
}

export default function FeatureBreakdowns() {
  return (
    <div class="space-y-24">
      <BreakdownSection
        kicker="The island"
        title="Your whole fleet, in one pixel strip"
        body="Every session, every agent, one square each. The pill never wraps, never grows — an arriving question flashes the fire and swaps the slot, then hands the notch back."
        bullets={[
          "13 agents: Claude Code, Codex, Gemini CLI, OpenCode, Pi, Muse, and more",
          "Custom agents: your own coding agent can wire itself in from the published contract",
          "Slot rankings — you choose which data earns the notch",
          "You don't need a notch — external displays get the same island, floating top-center"
        ]}
      >
        <FleetDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Approvals"
        title="Answer from the island — or your phone"
        body="A gated tool call surfaces the island: the fire turns to a question, the card pins above your sessions, and the row says what it's waiting on. Allow, Allow for session, Deny, or deny with a reason, and the run picks up where it stopped."
        bullets={[
          "Approval cards pin above the session list; questions answer inside their row",
          "Allow for session waves through the rest of that session's requests",
          "Answer from iPhone or Apple Watch too, now in TestFlight beta",
          "Works across every hooked agent, local or remote"
        ]}
        reversed
      >
        <ApprovalDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Terminals"
        title="Reply without hunting for the tab"
        body="Every session knows the terminal it runs in. Type a reply in the island and it lands in that exact pane; click Jump and the right window comes forward."
        bullets={[
          "Replies reach agents in tmux, iTerm2, Terminal, and kitty",
          "Jump focuses the exact window, even for sessions over SSH",
          "Per-turn replies render as Markdown, with tables and code"
        ]}
      >
        <TerminalReplyDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Remote"
        title="Any SSH box, one click away"
        body="Pick a host from your ssh config or your tailnet and click once — the nook-hook installs itself and its agents appear beside your local ones, indistinguishable."
        bullets={[
          "One click: connect, push the hook, configure agents, check it can reach this Mac",
          "Hosts mirror this Mac's installed integrations automatically",
          "Remote sessions are ordinary rows; the agent chip names the machine"
        ]}
        reversed
      >
        <RemoteHostDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="The campfire"
        title="A hearth that tells the truth"
        body="Stop-motion pixel art, four frames a step. It dances when tokens stream, putters blue when an agent asks, and goes to dead embers the moment something breaks."
        bullets={[
          "Idle, running, ready, question, and error — at a glance",
          "Hand-drawn 14×14 sprites, no tweening",
          "Six chiptunes you can assign to any agent event"
        ]}
      >
        <CampfireDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Cooling"
        title="Fans that answer to you, not the scheduler"
        body="Live RPM for every fan, and the curve is yours. Apple's stock curve waits until you're already cooking — swap to Aggressive and it climbs earlier and harder, or slam MAX before the compile."
        bullets={[
          "Stock, Aggressive, and MAX — swap curves in one click",
          "MAX and COOL sessions surface right in the pill",
          "CPU/GPU die temps tier-color before things get loud",
          "All local: your hardware data never leaves the device"
        ]}
        reversed
      >
        <FansDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Power"
        title="Wall power, on your terms"
        body="Live watts from the adapter to the battery to the chassis — and a charge ceiling you set yourself. On recent macOS The Nook drives the system's own limiter; below that it enforces the limit itself. One slider, 50–100%, any version."
        bullets={[
          "One slider, 50–100%, on any macOS version",
          "Hooks the system limiter where it exists, enforces elsewhere",
          "Top-up mode charges past, then re-arms on unplug",
          "Thermal protection pauses charging when the pack runs hot",
          "Energy flow figure: adapter → battery → system, live watts"
        ]}
      >
        <BatteryDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Sound"
        title="Every app gets its own fader"
        body="A real volume mixer: set each app's level, mute the noisy one, and send any app to its own output — music to headphones while the meeting stays on the speakers."
        bullets={[
          "Per-app volume, mute, and output routing",
          "Master output, system sounds, and microphone pickers in one panel",
          "Catches players that aren't apps, like command-line podcast tools"
        ]}
        reversed
      >
        <MixerDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Capture"
        title="Screenshots and recordings from the notch"
        body="Drag out an area, pick a screen, or choose one app. While a recording runs, Wings unfold beside the island: pause and stop on the right, system audio and microphone on the left."
        bullets={[
          "Area, screen, or single-app capture",
          "Screenshots save to your screenshot folder and copy to the clipboard",
          "System audio and microphone tracks for recordings",
          "The Nook's own windows never show up in a capture"
        ]}
      >
        <CaptureDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Your day"
        title="Meetings come to the notch"
        body="Today sits in a dial — days behind, days ahead, dots where things happen. The slot counts your next call down, and when it gets close the island opens the day on its own."
        bullets={[
          "Next meeting counts down right in the slot",
          "Near a call, the island opens the day itself",
          "Meeting links get an Open button in the row",
          "Real calendars and reminders — no sync service"
        ]}
        reversed
      >
        <CalendarDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Camera"
        title="A lens that stays asleep"
        body="A live camera preview in the island for the seconds before a call. It never wakes on its own: permission-gated, inert until you click Start, and dead the moment you leave the panel."
        bullets={[
          "Nothing watches until Start camera gets a click",
          "Live only while the panel sits open",
          "A device picker for every connected camera",
          "Opt-in module — in no default panel"
        ]}
      >
        <CameraDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Floating actions"
        title="Your buttons, orbiting the island"
        body="Pin up to seven one-tap actions around the expanded island. They ride its expansion in and out, so the things you reach for most are always one click away."
        bullets={[
          "Run an Apple Shortcut, open an app or URL, or run a shell command",
          "Toggle Low Power Mode, top-up, or overheat protection",
          "Set the charge limit, cycle audio outputs, or start a timer",
          "Cycle the approval mode without opening Settings"
        ]}
        reversed
      >
        <FloatingActionsDemo />
      </BreakdownSection>
    </div>
  );
}
