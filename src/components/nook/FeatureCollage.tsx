import { For, createSignal, onCleanup, onMount, type JSX } from "solid-js";
import { IslandPill, STATUS, CALM, CRITICAL, ModuleCard } from "./IslandMock";
import { ApprovalCardMock, DieLine, CLAUDE } from "./ModuleMocks";

/**
 * Feature collage: five cells sold as the app's actual UI. The hero cell
 * shows the real collapsed pill (campfire slot, camera housing, live data)
 * dressed in the island's black surface; supporting cells reuse the same
 * module chrome, status palette, and metric language.
 */

export function CollageCell(props: {
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
export function InkStage(props: { children: JSX.Element; class?: string }) {
  return (
    <div
      class={`flex justify-center rounded-xl py-5 ${props.class ?? ""}`}
      style={{ background: "#0d0d0f" }}
    >
      {props.children}
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

/* Deterministic usage wander for the traces. */
const wander = (n: number, k: number) =>
  0.42 + 0.22 * Math.sin(n * 0.45 + k * 1.7) + 0.12 * Math.sin(n * 1.3 + k);

/**
 * The Temperatures module: one line per die — label, its 60 s usage trace,
 * its temperature. The GPU climbs past the 70 ° warn line and tints amber.
 */
function GaugesMock() {
  const [n, setN] = createSignal(0);
  onMount(() => {
    const interval = setInterval(() => setN((v) => v + 1), 700);
    onCleanup(() => clearInterval(interval));
  });
  const trace = (k: number) =>
    Array.from({ length: 30 }, (_, i) => Math.max(0.04, Math.min(0.97, wander(n() + i, k))));
  const gpuCelsius = () => 62 + 12 * (0.5 + 0.5 * Math.sin(n() * 0.18));
  return (
    <ModuleCard>
      <div class="space-y-2">
        <DieLine label="CPU" usage={trace(0)} celsius={58 + 4 * Math.sin(n() * 0.3)} />
        <DieLine label="GPU" usage={trace(2)} celsius={gpuCelsius()} />
      </div>
    </ModuleCard>
  );
}

export default function FeatureCollage() {
  return (
    <section
      class="bg-base relative z-20 px-4 pt-40 pb-16 md:px-8"
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
          <div class="border-overlay1 bg-surface1 relative col-span-1 flex flex-col items-center overflow-hidden rounded-2xl border p-6 md:col-span-2">
            <div class="mb-5 self-start">
              <p class="text-subtext1 mb-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
                The island
              </p>
              <h3 class="text-text mb-2 text-2xl font-bold tracking-tight">
                Every agent, one glance
              </h3>
              <p class="text-subtext0 max-w-sm text-sm leading-relaxed">
                A pill tucked into your notch — a campfire for your whole fleet
                on the left, live data on the right. Blue running, green ready,
                amber needs you.
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
            body="Permission prompts pin as cards above your sessions — Allow, Allow for session, or Deny. Away from the desk, answer from your iPhone or Apple Watch (beta)."
          >
            <InkStage>
              <div class="w-full max-w-sm px-3">
                <ApprovalCardMock
                  agent={CLAUDE}
                  title="the-nook · bridge"
                  tool="Edit"
                  input="server/routes.ts"
                />
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

          {/* Gauges */}
          <CollageCell
            kicker="Your Mac"
            title="The gauges that matter"
            body="Each die's temperature beside its 60-second usage trace, tinted amber from 70° and red at 85°, so you see a compile heating up before the fans do."
          >
            <InkStage class="w-full">
              <div class="w-full max-w-[300px] text-left">
                <GaugesMock />
              </div>
            </InkStage>
          </CollageCell>
        </div>

        <p class="text-subtext1 mt-6 text-center text-xs">
          Plus a mixer, capture, timers, weather, and a dozen more modules —{" "}
          <a
            href="#island-extras"
            class="underline decoration-dotted hover:opacity-80"
          >
            see them all ↓
          </a>
        </p>
      </div>
    </section>
  );
}
