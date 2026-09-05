import { For, createSignal, onCleanup, onMount, type JSX } from "solid-js";
import {
  IslandPill,
  IslandExpanded,
  AgentDotGrid,
  STATUS,
  CALM,
  ACCENT,
  CRITICAL,
  ModuleCard
} from "./IslandMock";
import { Campfire, type CampfireState } from "./Campfire";

/**
 * Detailed feature breakdowns: alternating copy + live-demo sections.
 * Each demo animates when scrolled into view (IntersectionObserver +
 * motion's animate), staging the real interaction loop: attention
 * flares, approval resolves, fans throttle, sessions stream.
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
          background: phase() === "flare" ? "rgba(231,167,98,0.12)" : "rgba(255,255,255,0.055)",
          "box-shadow": "inset 0 0 0 1px rgba(255,255,255,0.07)",
          transform: phase() === "flare" ? "translateY(0) scale(1)" : "translateY(6px) scale(0.98)",
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

/* ── Demo 2: permission card resolves, phone push follows ─────────── */

function ApprovalDemo() {
  const [allowed, setAllowed] = createSignal(false);
  onMount(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const loop = () => {
      setAllowed(false);
      timers.push(setTimeout(() => setAllowed(true), 4200));
    };
    loop();
    const interval = setInterval(loop, 8400);
    onCleanup(() => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    });
  });

  return (
    <div class="flex flex-col items-center gap-5 sm:flex-row sm:items-end sm:justify-center">
      {/* island card */}
      <div
        class="w-full max-w-[300px] rounded-[10px] p-2.5 text-left transition-opacity duration-500"
        style={{
          background: "rgba(234,179,8,0.08)",
          opacity: allowed() ? 0.45 : 1
        }}
      >
        <div class="mb-1.5 flex items-center gap-1.5">
          <span
            class="inline-block h-[13px] w-[13px] rounded-[3px]"
            style={{ background: "#D97742" }}
          />
          <span class="text-[12px] font-semibold text-white">
            the-nook · bridge
          </span>
          <span
            class="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
            style={{
              background: allowed() ? "rgba(150,220,150,0.25)" : "rgba(234,179,8,0.25)"
            }}
          >
            {allowed() ? "allowed" : "approval"}
          </span>
        </div>
        <p class="text-[13px] font-medium text-white">Run Edit</p>
        <p class="mt-0.5 font-mono text-[11px] text-white/50">
          server/routes.ts +12 −4
        </p>
        <div class="mt-2.5 flex gap-2">
          <span
            class="rounded-md px-3 py-1 text-[11px] font-semibold text-white transition-all duration-300"
            style={{ background: ACCENT, opacity: allowed() ? 0.4 : 1 }}
          >
            Allow
          </span>
          <span class="rounded-md border border-white/20 px-3 py-1 text-[11px] font-semibold text-white/80">
            Deny
          </span>
        </div>
      </div>
      {/* phone */}
      <div
        class="w-[150px] rounded-2xl border border-white/15 p-2 text-left"
        style={{
          background: "rgba(255,255,255,0.04)",
          transform: allowed() ? "translateY(-4px)" : "translateY(0)",
          transition: "transform 0.5s ease"
        }}
      >
        <div class="mx-auto mb-1.5 h-1 w-10 rounded-full bg-white/20" />
        <div class="space-y-1.5">
          <p class="px-1 text-[9px] font-semibold tracking-wide text-white/40 uppercase">
            The Nook
          </p>
          <div
            class="rounded-lg p-2"
            style={{
              background: allowed()
                ? "rgba(111,185,130,0.14)"
                : "rgba(231,167,98,0.14)"
            }}
          >
            <p class="text-[10px] font-semibold text-white">
              {allowed() ? "Allowed ✓" : "Claude Code wants to edit"}
            </p>
            <p class="text-[9px] text-white/50">
              {allowed() ? "resumed" : "tap to Allow or Deny"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Demo 3: fans throttle up under load, then back down ──────────── */

function FansDemo() {
  const [rpm, setRpm] = createSignal(1270);
  const [maxed, setMaxed] = createSignal(false);
  onMount(() => {
    let frame = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    /* Linear ramp toward `target` — close enough to the app's spring
       at marketing-frame rates, with zero easing-library surface. */
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

  return (
    <ModuleCard class="mx-auto w-full max-w-[320px]">
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
  );
}

/* ── Demo 4: remote sessions streaming into the island ────────────── */
const REMOTE_TICKS: {
  name: string;
  via: string;
  state: keyof typeof STATUS;
  line: string;
}[] = [
  { name: "build-box", via: "ssh", state: "running", line: "You: fix flaky test" },
  { name: "gpu-rig", via: "tailscale", state: "running", line: "You: benchmark fp16" }
];

function RemoteDemo() {
  const [tick, setTick] = createSignal(0);
  onMount(() => {
    const interval = setInterval(
      () => setTick((t) => (t + 1) % REMOTE_TICKS.length),
      2600
    );
    onCleanup(() => clearInterval(interval));
  });
  return (
    <div class="flex flex-col items-center gap-4">
      <IslandExpanded
        activeCount={2}
        tabs={[
          { icon: "🔥", label: "Agents", active: true },
          { icon: "♪", label: "Music" },
          { icon: "◌", label: "System" }
        ]}
      >
        <div class="space-y-2 text-left">
          <For each={REMOTE_TICKS}>
            {(host, i) => (
              <div
                class="rounded-[10px] p-2.5 transition-all duration-500"
                style={{
                  background: "rgba(255,255,255,0.055)",
                  "box-shadow": "inset 0 0 0 1px rgba(255,255,255,0.07)",
                  opacity: i() === tick() ? 1 : 0.55,
                  transform: i() === tick() ? "scale(1.01)" : "scale(1)"
                }}
              >
                <div class="flex items-center gap-2">
                  <span
                    class="inline-block h-[7px] w-[7px] rounded-full"
                    style={{ background: STATUS[host.state] }}
                  />
                  <span class="text-[13px] font-semibold text-white">
                    {host.name}
                  </span>
                  <span
                    class="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white/75"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    {host.via}
                  </span>
                </div>
                <p class="mt-0.5 text-[11px] text-white/50">{host.line}</p>
              </div>
            )}
          </For>
          <p class="pt-1 text-center text-[10px] text-white/40">
            same island, same glance — agents two networks away
          </p>
        </div>
      </IslandExpanded>
    </div>
  );
}

/* ── Demo 5: campfire states ───────────────────────────────────────── */

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
            <p class="text-center text-[11px] font-medium text-white/60">{labels[i()]}</p>
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
          "12 agents: Claude Code, Codex, Gemini CLI, OpenCode, Pi, and more",
          "The campfire dances while work runs, simmers when all is calm",
          "Slot rankings — you choose which data earns the notch"
        ]}
      >
        <FleetDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Approvals"
        title="Answer from the island — or your phone"
        body="Gated tool calls hold right in the panel. Allow, deny, or demand a reason. Walking away? The same request lands on your phone and your tap flies back to the agent."
        bullets={[
          "Permission and question cards pin above the session list",
          "Push-to-phone over your own network — no cloud middleman",
          "Works across every hooked agent, local or remote"
        ]}
        reversed
      >
        <ApprovalDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Cooling"
        title="Fans that answer to you, not the scheduler"
        body="Live RPM for every fan, a privileged helper for the curve. MAX before a compile, aggressive when the render queue spikes, auto when you walk away."
        bullets={[
          "MAX and COOL sessions surface right in the pill",
          "CPU/GPU die temps tier-color before things get loud",
          "All local: your hardware data never leaves the device"
        ]}
      >
        <FansDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Remote"
        title="SSH boxes join the same island"
        body="Push the nook-hook to any Linux host — Tailscale or plain SSH with a reverse tunnel — and its agents appear beside your local ones, indistinguishable."
        bullets={[
          "One-line install bakes the bridge endpoint for you",
          "Works for Claude Code, Codex, Gemini CLI and friends",
          "Sessions from both machines share one dot grid"
        ]}
        reversed
      >
        <RemoteDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="The campfire"
        title="A hearth that tells the truth"
        body="Stop-motion pixel art, four frames a step. It dances when tokens stream, putters blue when an agent asks, and goes to dead embers the moment something breaks."
        bullets={[
          "Idle, running, ready, question, and error — at a glance",
          "Hand-drawn 14×14 sprites, no tweening",
          "The fire is the fleet's pulse: glanceable from across the room"
        ]}
      >
        <CampfireDemo />
      </BreakdownSection>
    </div>
  );
}
