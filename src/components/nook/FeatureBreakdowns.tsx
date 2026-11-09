import {
  For,
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
  ACCENT,
  CRITICAL,
  ModuleCard,
  FakeCursor
} from "./IslandMock";
import { Campfire, type CampfireState } from "./Campfire";
import {
  ApprovalCardMock,
  SessionRowMock,
  CLAUDE,
  CODEX
} from "./ModuleMocks";
import { useDemoLoop } from "./useDemoLoop";
import { BatteryDemo, CalendarDemo, MixerDemo } from "./UtilityDemos";
import {
  TerminalReplyDemo,
  RemoteHostDemo,
  CaptureDemo,
  FloatingActionsDemo
} from "./MoreDemos";

/**
 * Detailed feature breakdowns: alternating copy + live-demo sections.
 * Each demo stages the real interaction loop: attention flares, approval
 * resolves, fans throttle, the charge ceiling holds, meetings surface,
 * the camera wakes. Newer demos live in
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
              ? "Reply sent. Agents running."
              : "Agents running"}
        </p>
        <p class="mt-0.5 text-[11px] text-white/50">
          {phase() === "flare" ? "Question waiting in the island" : "\u00a0"}
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
                  ? "Approve Bash: swift test --filter Bridge?"
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
            ? "Camera on while this panel is open"
            : "Camera off until you click Start"}
        </p>
      </div>
    </ModuleCard>
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
    "Running",
    "Question",
    "Ready",
    "Idle",
    "Error"
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
        title="See which agents need your attention"
        body="Each square represents an agent session. Its color shows whether the agent is working, finished, or waiting for you. Questions appear in the island so you can respond without switching windows."
        bullets={[
          "Claude Code, Codex, Gemini CLI, OpenCode, Pi, Muse, Cursor and more",
          "Connect custom agents using the published integration contract",
          "Choose which information appears in the compact view",
          "Works on displays without a notch, centered at the top of the screen"
        ]}
      >
        <FleetDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Approvals"
        title="Approve agent requests"
        body="When an agent needs permission, the island opens with a request card above your sessions. Review the tool and its input, then allow or deny it. You can include a reason when you deny a request."
        bullets={[
          "Review permissions above the session list and answer questions in the session row",
          "Allow for session approves subsequent requests in that session",
          "Respond from iPhone or Apple Watch with the TestFlight beta",
        ]}
        reversed
      >
        <ApprovalDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Terminals"
        title="Reply to agents and open their terminals"
        body="Send a reply from the island to the terminal pane running that session. Use Jump to bring its window forward when you want to work in the terminal."
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
        title="Set up remote agents in one click"
        body="Choose a Tailscale peer or an authorized host from your SSH config and click Set up. The Nook installs its integrations and checks that the host can reach your Mac."
        bullets={[
          "Local and remote sessions in the same island, labelled by host",
          "Remote integrations follow the agents installed on this Mac",
          "Direct connections over Tailscale, or an SSH tunnel for other hosts",
          "Uses the host\'s existing SSH authorization"
        ]}
        reversed
      >
        <RemoteHostDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="The campfire"
        title="Agent status in the campfire"
        body="The pixel-art campfire changes with your agents' activity. Different animations indicate work in progress, a question waiting for you, or an error."
        bullets={[
          "Separate animations for idle, running, ready, question, and error states",
          "Hand-drawn 14×14 sprites, no tweening",
          "Six chiptunes you can assign to any agent event"
        ]}
      >
        <CampfireDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Cooling"
        title="Monitor and control your Mac's fans"
        body="Check each fan's speed and choose how cooling responds to load. Keep the stock fan curve, use Aggressive for earlier cooling, or start a MAX session to run the fans at full speed."
        bullets={[
          "Switch between Stock, Aggressive, and MAX",
          "See active MAX and COOL sessions in the compact view",
          "CPU and GPU temperature readings change color as they rise",
          "Hardware monitoring runs locally on your Mac"
        ]}
        reversed
      >
        <FansDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Power"
        title="Set a battery charge limit"
        body="Set the charge limit on the battery bar, or enter a percentage. The power diagram shows how much power goes to your Mac and battery. Turn on Top-up mode when you need a full charge."
        bullets={[
          "Drag the limit marker or type a percentage; available limits depend on your Mac",
          "Uses macOS charge limits where available, with helper-based control on supported Macs",
          "Top-up mode allows charging past the limit and turns off when you unplug",
          "Overheat protection can pause charging when the battery gets hot",
          "Separate readings for system draw and battery charging, not a wall-power measurement"
        ]}
      >
        <BatteryDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Sound"
        title="Adjust volume and output for each app"
        body="Set an app's volume without changing the others, mute it, or choose a different output. You can play music through headphones and keep a meeting on the speakers."
        bullets={[
          "Per-app volume, mute, and output routing",
          "Master output, system sounds, and microphone pickers in one panel",
          "Includes audio from command-line players"
        ]}
        reversed
      >
        <MixerDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Capture"
        title="Take screenshots and record your screen"
        body="Capture an area, a whole screen, or one app. During a recording, controls beside the island let you pause, stop, and toggle system audio or your microphone."
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
        title="Check your calendar and join meetings"
        body="Browse your calendar from the day strip and open a meeting from its event row. The compact view shows today's date, a countdown before an event, and an ON AIR indicator while a meeting is in progress."
        bullets={[
          "Date, countdown, and meeting progress in the compact view",
          "Choose how early the island opens before a meeting",
          "Join meetings from the video button beside an event",
          "Uses your Mac's calendars and reminders"
        ]}
        reversed
      >
        <CalendarDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Camera"
        title="Preview your camera before a call"
        body="Check your camera in the island before joining a call. The preview starts only when you click Start camera and stops when you leave the panel."
        bullets={[
          "Requires camera permission and a click on Start camera",
          "Preview runs only while the panel is open",
          "A device picker for every connected camera",
          "Add the camera module to a panel when you want it"
        ]}
      >
        <CameraDemo />
      </BreakdownSection>

      <BreakdownSection
        kicker="Floating actions"
        title="Add shortcuts beside the island"
        body="Add up to seven actions beside the expanded island. Use them to open apps, run shortcuts, or change settings without opening a panel."
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
