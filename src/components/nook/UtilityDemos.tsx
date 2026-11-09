import { For, Show, createSignal } from "solid-js";
import { IslandPill, ModuleCard, CALM, WARM } from "./IslandMock";
import { Glyph, type GlyphName } from "./ModuleMocks";
import { useDemoLoop } from "./useDemoLoop";

const PAPER = "#f1ead9";
const BATTERY = "#8dc9b3";
const CALENDAR = "#ff9e42";

/** SettingsSlider: paper fill, dark knob, and a unity notch on app sliders. */
function MixerSlider(props: { level: number; tint?: string; muted?: boolean }) {
  const fraction = () => props.level / (props.tint ? 125 : 100);
  const position = () => `calc(9px + (100% - 18px) * ${fraction()})`;
  return (
    <div class="relative h-5 min-w-0 flex-1 rounded-full bg-white/10">
      <div
        class="absolute inset-y-0 left-0 overflow-hidden rounded-full transition-[width] duration-700"
        style={{ width: `calc(${position()} + 9px)`, background: PAPER }}
      >
        <Show when={props.tint && !props.muted}>
          <div
            class="nook-meter h-full w-full rounded-full"
            style={{ background: props.tint }}
          />
        </Show>
      </div>
      <Show when={props.tint}>
        <span
          class="absolute top-[7.5px] h-[5px] w-[5px] rounded-full border border-white/55 bg-[#0d0d0f]"
          style={{ left: "calc(9px + (100% - 18px) * 0.8 - 2.5px)" }}
        />
      </Show>
      <span
        class="absolute top-px h-[18px] w-[18px] rounded-full border-[1.5px] shadow-sm transition-[left] duration-700"
        style={{
          left: `calc(${position()} - 9px)`,
          background: "#0d0d0f",
          "border-color": PAPER
        }}
      />
    </div>
  );
}

function RoutePicker(props: { label: string }) {
  return (
    <span class="inline-flex max-w-[155px] items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[11px] text-white/85">
      <span class="truncate">{props.label}</span>
      <Glyph name="chevron" size={8} />
    </span>
  );
}

const MIXER_APPS = [
  { name: "Music", color: "#fa5c7c", glyph: "♫" },
  { name: "Browser", color: CALM, glyph: "◎" },
  { name: "Meeting", color: BATTERY, glyph: "▰" }
];

/** VolumeMixerPanelView and MixerAppRow, including the current route controls. */
export function MixerDemo() {
  const [step, setStep] = createSignal(0);
  useDemoLoop(10800, [
    [0, () => setStep(0)],
    [2400, () => setStep(1)],
    [4800, () => setStep(2)],
    [7200, () => setStep(3)]
  ]);
  const muted = (i: number) => i === 1 && step() >= 1;
  const volume = (i: number) =>
    i === 0 ? (step() >= 3 ? 38 : 100) : i === 1 ? 55 : 86;
  return (
    <div
      role="img"
      aria-label="Volume mixer preview with output, system sounds, microphone, and per-app volume, mute and routing controls"
    >
      <ModuleCard class="mx-auto w-full max-w-[360px]">
        <div class="space-y-3 text-left text-white">
          <div class="flex items-center gap-2" aria-label="Output volume">
            <Glyph name="speaker" class="text-white/50" />
            <MixerSlider level={65} />
            <span class="w-[34px] text-right font-mono text-[11px] text-white/60">
              65%
            </span>
          </div>
          <For
            each={[
              {
                label: "Output",
                icon: "speaker",
                device: "MacBook Pro Speakers"
              },
              {
                label: "System sounds",
                icon: "bell",
                device: "MacBook Pro Speakers"
              },
              {
                label: "Microphone",
                icon: "mic",
                device: "MacBook Pro Microphone"
              }
            ]}
          >
            {(route) => (
              <div class="flex items-center gap-2">
                <Glyph name={route.icon} class="text-white/50" />
                <span class="flex-1 text-[12px] font-medium">
                  {route.label}
                </span>
                <RoutePicker label={route.device} />
              </div>
            )}
          </For>
          <div class="h-px bg-white/[0.06]" />
          <For each={MIXER_APPS}>
            {(app, i) => (
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span
                    class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] text-[10px] text-white"
                    style={{ background: app.color }}
                  >
                    {app.glyph}
                  </span>
                  <span class="min-w-0 flex-1 truncate text-[12px] font-medium">
                    {app.name}
                  </span>
                  <RoutePicker
                    label={i() === 0 && step() >= 2 ? "Headphones" : "Default"}
                  />
                  <span aria-label="Pin app" class="text-white/50">
                    <Glyph name="pin" size={10} />
                  </span>
                  <span aria-label="Hide app" class="text-white/50">
                    <Glyph name="eye" size={10} />
                  </span>
                </div>
                <div class="flex items-center gap-2 pl-[26px]">
                  <MixerSlider
                    level={volume(i())}
                    tint={app.color}
                    muted={muted(i())}
                  />
                  <span class="w-[34px] text-right font-mono text-[11px] text-white/60">
                    {muted(i()) ? 0 : volume(i())}%
                  </span>
                  <Glyph
                    name={muted(i()) ? "speakerOff" : "speaker"}
                    size={14}
                    style={{
                      color: muted(i()) ? WARM : "rgba(255,255,255,0.5)"
                    }}
                  />
                </div>
              </div>
            )}
          </For>
        </div>
      </ModuleCard>
      <p class="mt-3 min-h-8 text-center text-[11px] text-white/55">
        {
          [
            "Adjust each app separately",
            "Browser muted",
            "Music playing through headphones",
            "Music volume lowered to 38%"
          ][step()]
        }
      </p>
    </div>
  );
}

function PowerNode(props: {
  label: string;
  glyph: GlyphName;
  watts: number;
  tint: string;
}) {
  return (
    <div class="flex h-9 items-center gap-[7px]">
      <Glyph name={props.glyph} size={18} style={{ color: props.tint }} />
      <div>
        <p class="text-[9px] text-white/55">{props.label}</p>
        <p class="font-mono text-[11px] text-white">
          {props.watts.toFixed(1)} W
        </p>
      </div>
    </div>
  );
}

/** PowerPanelView: system draw, parallel power circuit, battery bar and controls. */
export function BatteryDemo() {
  const [step, setStep] = createSignal(0);
  useDemoLoop(14000, [
    [0, () => setStep(0)],
    [1800, () => setStep(1)],
    [3600, () => setStep(2)],
    [6400, () => setStep(3)],
    [8400, () => setStep(4)],
    [10400, () => setStep(5)]
  ]);
  const pct = () => [62, 71, 80, 80, 92, 100][step()];
  const topUp = () => step() >= 3;
  const held = () => step() === 2;
  const batteryWatts = () => (held() || pct() === 100 ? 0 : 26.4);
  return (
    <div
      role="img"
      aria-label="Battery preview showing system draw, adapter power split between the Mac and battery, an 80 percent charge limit, and top-up mode"
    >
      <ModuleCard class="mx-auto w-full max-w-[340px]">
        <div class="space-y-3 text-left text-white">
          <div>
            <div class="flex items-center gap-1.5 font-mono text-[18px]">
              <span style={{ color: CALM }}>ϟ</span> 18.2 W
            </div>
            <p class="text-[9px] font-semibold text-white/55">System draw</p>
          </div>
          <div class="flex items-center gap-2">
            <PowerNode
              label="Adapter"
              glyph="plug"
              watts={18.2 + batteryWatts()}
              tint={CALM}
            />
            <svg
              class="h-[82px] min-w-4 flex-1"
              viewBox="0 0 100 82"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M0 41H25C55 41 40 18 70 18H100"
                stroke={CALM}
                stroke-opacity="0.3"
                stroke-width="1.5"
              />
              <path
                d="M0 41H25C55 41 40 64 70 64H100"
                stroke={BATTERY}
                stroke-opacity="0.3"
                stroke-width="1.5"
              />
              <path
                class="nook-power-flow"
                d="M0 41H25C55 41 40 18 70 18H100"
                stroke={CALM}
                stroke-width="1.8"
                stroke-dasharray="3 18"
              />
              <Show when={batteryWatts() > 0}>
                <path
                  class="nook-power-flow"
                  d="M0 41H25C55 41 40 64 70 64H100"
                  stroke={BATTERY}
                  stroke-width="1.8"
                  stroke-dasharray="3 18"
                />
              </Show>
              <path d="m96 15 4 3-4 3" stroke={CALM} stroke-width="1.5" />
              <path d="m96 61 4 3-4 3" stroke={BATTERY} stroke-width="1.5" />
              <Show when={held()}>
                <path
                  d="m81 60 8 8m0-8-8 8"
                  stroke={BATTERY}
                  stroke-width="1.8"
                />
              </Show>
            </svg>
            <div class="space-y-2.5">
              <PowerNode label="Mac" glyph="laptop" watts={18.2} tint={CALM} />
              <PowerNode
                label="Battery"
                glyph="battery"
                watts={batteryWatts()}
                tint={BATTERY}
              />
            </div>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="flex-1 text-[9px] font-semibold text-white/55 uppercase">
              Battery
            </span>
            <span class="font-mono text-[15px]">{pct()}%</span>
            <span class="ml-2 flex items-center gap-1 font-mono text-[10px] text-white/70">
              Limit{" "}
              <span class="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[12px] text-white/90">
                80
              </span>
              %
            </span>
          </div>
          <div class="relative flex h-[18px] items-center">
            <div class="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                class="h-full rounded-full transition-[width] duration-[1600ms]"
                style={{ width: `${pct()}%`, background: CALM }}
              />
            </div>
            <span
              class="absolute h-3 w-1 rounded-sm bg-white/85"
              style={{ left: "calc(80% - 2px)" }}
            />
          </div>
          <For
            each={[
              {
                label: "Top-up mode",
                note: "Charges past the limit; off on unplug",
                on: topUp()
              },
              {
                label: "Overheat protection",
                note: topUp()
                  ? "Suspended while Top-up mode is on"
                  : "Pauses at 95°F",
                on: true
              }
            ]}
          >
            {(control) => (
              <div class="flex items-center gap-2">
                <div class="min-w-0 flex-1">
                  <p class="text-[12px] font-medium">{control.label}</p>
                  <p class="text-[10px] leading-snug text-white/55">
                    {control.note}
                  </p>
                </div>
                <span
                  class="relative h-4 w-[30px] shrink-0 rounded-full transition-colors"
                  style={{
                    background: control.on ? CALM : "rgba(255,255,255,0.15)"
                  }}
                >
                  <span
                    class="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-[left]"
                    style={{ left: control.on ? "16px" : "2px" }}
                  />
                </span>
              </div>
            )}
          </For>
        </div>
      </ModuleCard>
      <p class="mt-3 min-h-8 text-center text-[11px] text-white/55">
        {held()
          ? "Charging paused at the 80% limit"
          : topUp()
            ? "Top-up mode allows a full charge"
            : "Charging with an 80% limit"}
      </p>
    </div>
  );
}

const DAYS = [
  { letter: "M", day: 9, dots: 1 },
  { letter: "T", day: 10, dots: 2 },
  { letter: "W", day: 11, dots: 1 },
  { letter: "T", day: 12, dots: 2 },
  { letter: "F", day: 13, dots: 3 },
  { letter: "S", day: 14, dots: 0 },
  { letter: "S", day: 15, dots: 0 }
];
const EVENTS = [
  {
    start: "09:30",
    end: "09:45",
    title: "Standup",
    calendar: "Work",
    color: CALENDAR,
    location: "Video call",
    meeting: true
  },
  {
    start: "15:30",
    end: "16:00",
    title: "Design review",
    calendar: "Work",
    color: CALENDAR,
    location: "4th floor",
    meeting: false
  }
];

/** CalendarSlotFace's daymark / next-up / on-air states, and CalendarPanelView. */
export function CalendarDemo() {
  const [step, setStep] = createSignal(0);
  useDemoLoop(16000, [
    [0, () => setStep(0)],
    [2400, () => setStep(1)],
    [4800, () => setStep(2)],
    [9000, () => setStep(3)],
    [12000, () => setStep(4)]
  ]);
  const onAir = () => step() >= 3;
  return (
    <div
      role="img"
      aria-label="Calendar preview showing the date, a meeting countdown, an on-air indicator, and the day's events with a join meeting button"
      class="flex min-h-[360px] min-w-0 flex-col items-center gap-4"
    >
      <div class="flex max-w-full justify-center" style={{ zoom: 0.8 }}>
        <IslandPill
          right={
            <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
              <Show when={step() === 0}>
                <rect
                  x="6"
                  y="4"
                  width="28"
                  height="27"
                  rx="5"
                  fill="#ededed"
                />
                <path
                  d="M11 4h18a5 5 0 0 1 5 5v3H6V9a5 5 0 0 1 5-5"
                  fill={CALENDAR}
                />
                <text
                  x="20"
                  y="10"
                  text-anchor="middle"
                  font-size="5.5"
                  font-weight="700"
                  fill="#1f1f1f"
                >
                  THU
                </text>
                <text
                  x="20"
                  y="28"
                  text-anchor="middle"
                  font-size="17"
                  font-weight="700"
                  fill="#1f1f1f"
                >
                  12
                </text>
                <circle cx="20" cy="36" r="2.25" fill={CALENDAR} />
              </Show>
              <Show when={step() === 1 || step() === 2}>
                <text
                  x="20"
                  y="10"
                  text-anchor="middle"
                  font-size="7"
                  font-weight="700"
                  fill="white"
                  opacity="0.65"
                >
                  IN
                </text>
                <text
                  x="20"
                  y="30"
                  text-anchor="middle"
                  font-size="20"
                  font-weight="700"
                  fill="white"
                >
                  {step() === 1 ? "14m" : "5m"}
                </text>
                <rect
                  x="6"
                  y="34"
                  width="28"
                  height="2"
                  rx="1"
                  fill="white"
                  opacity="0.15"
                />
                <rect
                  x="6"
                  y="34"
                  width={step() === 1 ? 2 : 19}
                  height="2"
                  rx="1"
                  fill={CALENDAR}
                />
              </Show>
              <Show when={onAir()}>
                <rect
                  x="1"
                  y="3"
                  width="38"
                  height="22"
                  rx="5"
                  fill={CALENDAR}
                  opacity="0.18"
                />
                <circle cx="4.7" cy="14.5" r="2.1" fill={CALENDAR} />
                <text
                  x="22.6"
                  y="17"
                  text-anchor="middle"
                  font-size="7.8"
                  font-weight="700"
                  fill={CALENDAR}
                >
                  ON AIR
                </text>
                <rect
                  x="1"
                  y="31"
                  width="38"
                  height="5"
                  rx="2.5"
                  fill={CALENDAR}
                  opacity="0.7"
                />
                <rect
                  x="1"
                  y="31"
                  width={step() === 4 ? 25 : 8}
                  height="5"
                  rx="2.5"
                  fill="#333"
                />
                <rect
                  x={step() === 4 ? 25 : 8}
                  y="29"
                  width="2.6"
                  height="9"
                  rx="1.3"
                  fill="#ededed"
                />
              </Show>
            </svg>
          }
        />
      </div>
      <div class="w-full max-w-[360px]">
        <ModuleCard>
          <div class="space-y-2.5 text-left text-white">
            <div class="flex items-center">
              <div>
                <p class="text-[10px] text-white/55">Calendar</p>
                <p class="text-[14px] font-semibold">Thu, Nov 12</p>
              </div>
              <span class="ml-auto rounded-lg bg-white/[0.08] p-[7px] text-white/55">
                <Glyph name="plus" />
              </span>
            </div>
            <div class="flex h-[60px] gap-[3px]">
              <For each={DAYS}>
                {(day) => (
                  <div
                    class="flex min-w-0 flex-1 flex-col items-center justify-center gap-[5px] rounded-[10px]"
                    style={{
                      background: day.day === 12 ? CALENDAR : "transparent",
                      color: day.day === 12 ? "#0d0d0f" : "white",
                      opacity: day.day < 12 ? 0.6 : 1
                    }}
                  >
                    <span class="text-[9px] opacity-60">{day.letter}</span>
                    <span
                      class="text-[13px]"
                      style={{ "font-weight": day.day === 12 ? 700 : 500 }}
                    >
                      {day.day}
                    </span>
                    <span class="flex h-1 gap-0.5">
                      <For each={Array.from({ length: day.dots })}>
                        {() => (
                          <span
                            class="h-1 w-1 rounded-full"
                            style={{ background: CALENDAR }}
                          />
                        )}
                      </For>
                    </span>
                  </div>
                )}
              </For>
            </div>
            <For each={EVENTS}>
              {(event) => (
                <div class="flex items-center gap-2.5 rounded-[10px] bg-white/[0.035] p-2.5">
                  <div class="w-[40px] shrink-0 text-right font-mono text-[10px]">
                    <p>{event.start}</p>
                    <p class="mt-[3px] text-white/55">{event.end}</p>
                  </div>
                  <span
                    class="w-[3px] self-stretch rounded-sm"
                    style={{ background: event.color }}
                  />
                  <div class="min-w-0 flex-1 space-y-1">
                    <p class="text-[12px] leading-snug font-semibold">
                      {event.title}
                    </p>
                    <p
                      class="text-[10px] font-medium"
                      style={{ color: event.color }}
                    >
                      {event.calendar}
                    </p>
                    <p class="text-[10px] text-white/55">{event.location}</p>
                  </div>
                  <Show when={event.meeting}>
                    <span
                      aria-label="Join meeting"
                      class="rounded-lg bg-white/[0.08] p-2 text-white/65"
                    >
                      <Glyph name="video" />
                    </span>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </ModuleCard>
      </div>
      <p class="min-h-4 text-center text-[11px] text-white/55">
        {step() === 0
          ? "Today's date and calendar events"
          : onAir()
            ? "Meeting in progress"
            : "Countdown to your next meeting"}
      </p>
    </div>
  );
}
