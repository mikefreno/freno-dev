import { For, type JSX } from "solid-js";
import {
  IslandPill,
  AgentDotGrid,
  STATUS,
  CALM,
  CRITICAL,
  ACCENT,
  ModuleCard
} from "./IslandMock";

/**
 * Feature collage: five cells sold as the app's actual UI. The hero cell
 * shows the real collapsed pill (campfire slot, camera housing, live data)
 * dressed in the island's black surface; supporting cells reuse the same
 * module chrome, status palette, and metric language.
 */

function CollageCell(props: {
  class?: string;
  kicker: string;
  title: string;
  body: string;
  children?: JSX.Element;
}) {
  return (
    <div
      class={`border-overlay1 bg-surface1 relative flex flex-col overflow-hidden rounded-2xl border p-6 ${props.class ?? ""}`}
    >
      <p class="text-subtext1 mb-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
        {props.kicker}
      </p>
      <h3 class="text-text mb-2 text-lg font-bold tracking-tight">
        {props.title}
      </h3>
      <p class="text-subtext0 text-sm leading-relaxed">{props.body}</p>
      <div class="mt-5 flex-1">{props.children}</div>
    </div>
  );
}

/**
 * Stage for app-UI mocks: the island's black ink ground. The real island
 * is always dark (preferredColorScheme .dark), so the mocks read correctly
 * in both site themes.
 */
function InkStage(props: { children: JSX.Element; class?: string }) {
  return (
    <div class={`flex justify-center rounded-xl py-5 ${props.class ?? ""}`} style={{ background: "#0d0d0f" }}>
      {props.children}
    </div>
  );
}

/** The approvals mock rebuilt on the app's PermissionCard anatomy. */
function ApprovalCardMock() {
  return (
    <div
      class="mx-auto w-full max-w-sm rounded-[10px] p-2.5 text-left"
      style={{ background: "rgba(234,179,8,0.08)" }}
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
          style={{ background: "rgba(234,179,8,0.25)" }}
        >
          approval
        </span>
      </div>
      <p class="text-[13px] font-medium text-white">Run Edit</p>
      <p class="mt-0.5 font-mono text-[11px] text-white/50">
        server/routes.ts +12 −4
      </p>
      <div class="mt-2.5 flex gap-2">
        <span
          class="rounded-md px-3 py-1 text-[11px] font-semibold"
          style={{ background: ACCENT }}
        >
          Allow
        </span>
        <span class="rounded-md border border-white/20 px-3 py-1 text-[11px] font-semibold text-white/80">
          Deny
        </span>
        <span class="px-1 py-1 text-[11px] text-white/50">
          Deny with reason…
        </span>
      </div>
    </div>
  );
}

/** Fans panel mock: RPM gauge rows in the app's card chrome. */
function FansPanelMock() {
  const fans = [
    { rpm: 1270, frac: 0.26 },
    { rpm: 1219, frac: 0.25 }
  ];
  return (
    <ModuleCard>
      <div class="space-y-2.5">
        <For each={fans}>
          {(f) => (
            <div class="flex items-center gap-3">
              <div
                class="h-1 flex-1 overflow-hidden rounded-full"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <div
                  class="h-full rounded-full"
                  style={{
                    width: `${f.frac * 100}%`,
                    background: CALM
                  }}
                />
              </div>
              <span
                class="font-mono text-white"
                style={{ "font-size": "13px", "font-weight": 500 }}
              >
                {f.rpm}
              </span>
              <span class="text-[9px] font-semibold text-white/50">RPM</span>
            </div>
          )}
        </For>
        <div class="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div class="flex gap-2">
          <span class="rounded-md border border-white/15 px-2 py-0.5 text-[11px] text-white/70">
            Auto
          </span>
          <span
            class="rounded-md px-2 py-0.5 text-[11px] font-bold"
            style={{ color: CRITICAL }}
          >
            MAX
          </span>
        </div>
      </div>
    </ModuleCard>
  );
}

/** Remote agents: two session rows like the expanded agents panel. */
function RemoteMock() {
  return (
    <div class="space-y-1.5">
      <div
        class="rounded-[10px] p-2.5"
        style={{ background: "rgba(255,255,255,0.055)", "box-shadow": "inset 0 0 0 1px rgba(255,255,255,0.07)" }}
      >
        <div class="flex items-center gap-2">
          <span
            class="inline-block h-[7px] w-[7px] rounded-full"
            style={{ background: STATUS.running }}
          />
          <span class="text-[13px] font-semibold text-white">build-box</span>
          <span
            class="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white/75"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            ssh
          </span>
        </div>
        <p class="mt-0.5 text-[11px] text-white/50">You: fix flaky test</p>
      </div>
      <div
        class="rounded-[10px] p-2.5"
        style={{ background: "rgba(255,255,255,0.055)", "box-shadow": "inset 0 0 0 1px rgba(255,255,255,0.07)" }}
      >
        <div class="flex items-center gap-2">
          <span
            class="inline-block h-[7px] w-[7px] rounded-full"
            style={{ background: STATUS.ready }}
          />
          <span class="text-[13px] font-semibold text-white">gpu-rig</span>
          <span
            class="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white/75"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            ssh
          </span>
        </div>
        <p class="mt-0.5 text-[11px] text-white/50">Ready</p>
      </div>
    </div>
  );
}

/** System gauges: temp die blocks + memory, in module cards. */
function GaugesMock() {
  return (
    <div class="grid grid-cols-2 gap-2">
      <ModuleCard>
        <div class="flex items-baseline justify-between">
          <span class="text-[9px] font-semibold text-white/50">CPU</span>
          <span class="font-mono text-white" style={{ "font-size": "15px" }}>
            72°
          </span>
        </div>
        <div
          class="mt-1.5 h-1 overflow-hidden rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div
            class="h-full rounded-full"
            style={{ width: "64%", background: CALM }}
          />
        </div>
      </ModuleCard>
      <ModuleCard>
        <div class="flex items-baseline justify-between">
          <span class="text-[9px] font-semibold text-white/50">GPU</span>
          <span class="font-mono text-white" style={{ "font-size": "15px" }}>
            58°
          </span>
        </div>
        <div
          class="mt-1.5 h-1 overflow-hidden rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div
            class="h-full rounded-full"
            style={{ width: "31%", background: CALM }}
          />
        </div>
      </ModuleCard>
    </div>
  );
}
export default function FeatureCollage() {
  return (
    <section
      class="bg-base relative z-20 -mt-28 px-4 pb-16 pt-40 md:px-8"
      id="feature-collage"
    >
      <div class="mx-auto max-w-5xl">
        <p class="text-subtext1 mb-2 text-center text-xs font-semibold tracking-[0.18em] uppercase">
          Why the Nook
        </p>
        <h2 class="text-text mb-12 text-center text-3xl font-bold">
          One glance. Everything your agents are doing.
        </h2>

        <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Hero: real collapsed pill on the island surface */}
          <div
            class="border-overlay1 bg-surface1 relative col-span-1 flex flex-col items-center overflow-hidden rounded-2xl border p-6 md:col-span-2"
          >
            <div class="mb-5 self-start">
              <p class="text-subtext1 mb-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
                The island
              </p>
              <h3 class="text-text mb-2 text-2xl font-bold tracking-tight">
                Every agent, one glance
              </h3>
              <p class="text-subtext0 max-w-sm text-sm leading-relaxed">
                A pill tucked into your notch — a campfire for your whole
                fleet on the left, live data on the right. Blue running,
                green ready, amber needs you.
              </p>
            </div>
            <div class="my-10 flex w-full justify-center">
              <IslandPill
                campfire="running"
                right={
                  <div class="flex flex-col items-center gap-1 px-1">
                    <div class="flex gap-1.5">
                      <span
                        class="inline-block h-2.5 w-2.5 rounded-[3px]"
                        style={{ background: STATUS.running }}
                      />
                      <span
                        class="inline-block h-2.5 w-2.5 rounded-[3px]"
                        style={{ background: STATUS.ready }}
                      />
                    </div>
                    <div class="flex gap-1.5">
                      <span
                        class="inline-block h-2.5 w-2.5 rounded-[3px]"
                        style={{ background: STATUS.attention }}
                      />
                      <span
                        class="inline-block h-2.5 w-2.5 rounded-[3px]"
                        style={{ background: STATUS.idle }}
                      />
                    </div>
                  </div>
                }
              />
            </div>
            <p class="text-subtext0 -mb-1 text-center text-xs">
              expand for the full panel ↓
            </p>
          </div>

          {/* Approvals */}
          <CollageCell
            kicker="Approvals"
            title="Unblock agents, anywhere"
            body="Permission prompts surface as cards in the panel — Allow once, always, or deny. Away from the desk, push them to your phone and answer from there."
          >
            <InkStage>
              <div class="w-full max-w-sm px-3">
                <ApprovalCardMock />
              </div>
            </InkStage>
          </CollageCell>

          {/* Fans */}
          <CollageCell
            kicker="Cooling"
            title="Silence it or max it"
            body="Read both fans live, then take over the curve completely. Flip to MAX before a compile, whisper-quiet when the fleet idles."
          >
            <InkStage class="w-full">
              <div class="w-full max-w-[260px] text-left">
                <FansPanelMock />
              </div>
            </InkStage>
          </CollageCell>

          {/* Remote agents */}
          <CollageCell
            kicker="Remote"
            title="Agents on other machines"
            body="Run agents on Linux boxes and SSH servers — one click installs the nook-hook, and their sessions join the same island."
          >
            <InkStage class="w-full">
              <div class="w-full max-w-[280px] text-left">
                <RemoteMock />
              </div>
            </InkStage>
          </CollageCell>

          {/* Gauges */}
          <CollageCell
            kicker="Your Mac"
            title="The gauges that matter"
            body="CPU and GPU die temps, memory pressure, live network throughput — the same tier palette the island uses, warning before a compile cooks your lap."
          >
            <InkStage class="w-full">
              <div class="w-full max-w-[300px] text-left">
                <GaugesMock />
              </div>
            </InkStage>
          </CollageCell>
        </div>

        <p class="text-subtext1 mt-6 text-center text-xs">
          Plus calendar, reminders, calls, and Now Playing — all in the same
          island, all one-time purchase.
        </p>
      </div>
    </section>
  );
}
