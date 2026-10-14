import { For, Show, type JSX } from "solid-js";
import { STATUS, ACCENT, CALM, WARM, CARD_FILL, CARD_STROKE } from "./IslandMock";

/**
 * Module-level mocks rebuilt from the app's SwiftUI views, so the site shows
 * the same anatomy the island does: the session row (SessionRowView), the
 * approval card (AgentsActionCards), the timer tape (TimerTape), a
 * temperature line (TemperaturesPanelView), and the Wings (WingPanels).
 */

/* ── Glyphs: the SF Symbols the mocked views use ─────────────────── */

/* Factories, not shared nodes: a Solid JSX node can mount in only one place. */
const GLYPHS: Record<string, () => JSX.Element> = {
  speaker: () => (
    <>
      <path d="M2 6h3l4-3v10l-4-3H2Z" fill="currentColor" />
      <path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.6a6 6 0 0 1 0 8.8" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" />
    </>
  ),
  speakerOff: () => (
    <>
      <path d="M2 6h3l4-3v10l-4-3H2Z" fill="currentColor" />
      <path d="m11 6 4 4m0-4-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
    </>
  ),
  mic: () => (
    <>
      <rect x="5.5" y="1.5" width="5" height="8.5" rx="2.5" fill="currentColor" />
      <path d="M3.5 7.5a4.5 4.5 0 0 0 9 0M8 12v2.5" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" />
    </>
  ),
  micOff: () => (
    <>
      <rect x="5.5" y="1.5" width="5" height="8.5" rx="2.5" fill="currentColor" opacity="0.9" />
      <path d="M3.5 7.5a4.5 4.5 0 0 0 9 0M8 12v2.5M2.5 2.5l11 11" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" />
    </>
  ),
  pause: () => (
    <>
      <rect x="4" y="3" width="3" height="10" rx="1" fill="currentColor" />
      <rect x="9" y="3" width="3" height="10" rx="1" fill="currentColor" />
    </>
  ),
  play: () => <path d="M5 3v10l8-5Z" fill="currentColor" />,
  stop: () => <rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor" />,
  viewfinder: () => (
    <path d="M2 5V3.5A1.5 1.5 0 0 1 3.5 2H5m6 0h1.5A1.5 1.5 0 0 1 14 3.5V5m0 6v1.5a1.5 1.5 0 0 1-1.5 1.5H11m-6 0H3.5A1.5 1.5 0 0 1 2 12.5V11m6-.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" />
  ),
  record: () => (
    <>
      <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3" fill="none" />
      <circle cx="8" cy="8" r="3" fill="currentColor" />
    </>
  ),
  dashed: () => (
    <rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 1.6" fill="none" />
  ),
  display: () => (
    <path d="M2.5 3h11a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm3 11h5M8 11.5V14" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" />
  ),
  window: () => (
    <>
      <rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3" fill="none" />
      <path d="M1.5 6h13" stroke="currentColor" stroke-width="1.3" />
    </>
  ),
  chevron: () => <path d="m4.5 6.5 3.5 3.5 3.5-3.5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" />,
  film: () => (
    <path d="M3 2.5h10a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Zm2 0v11m6-11v11M2.5 6h2.5m6 0h2.5m-11 4h2.5m6 0h2.5" stroke="currentColor" stroke-width="1.2" fill="none" />
  ),
  xmark: () => <path d="m4 4 8 8m0-8-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />,
  bell: () => (
    <path d="M8 1.8a4.2 4.2 0 0 0-4.2 4.2v3L2.5 11.3h11L12.2 9V6A4.2 4.2 0 0 0 8 1.8ZM6.3 12.8a1.8 1.8 0 0 0 3.4 0Z" fill="currentColor" />
  ),
  restart: () => (
    <path d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3M3.2 2.2v2.8H6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
  ),
  plus: () => <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />,
  refresh: () => (
    <path d="M12.5 8A4.5 4.5 0 1 1 11 4.6M11.6 2v2.8H8.8" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
  )
};

export type GlyphName = keyof typeof GLYPHS;

export function Glyph(props: { name: GlyphName; size?: number; class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg
      width={props.size ?? 12}
      height={props.size ?? 12}
      viewBox="0 0 16 16"
      class={`shrink-0 ${props.class ?? ""}`}
      style={props.style}
      aria-hidden="true"
    >
      {GLYPHS[props.name]()}
    </svg>
  );
}

/* ── Agents ──────────────────────────────────────────────────────── */

export interface AgentLook {
  name: string;
  /** brandColorHex from the app's AgentRegistry row. */
  color: string;
  /** The brand mark the app bundles (AgentBrands/*.svg). */
  icon: string;
}

export const CLAUDE: AgentLook = {
  name: "Claude Code",
  color: "#D97742",
  icon: "/nook/brands/claude.svg"
};
export const CODEX: AgentLook = {
  name: "Codex",
  color: "#4AA3DF",
  icon: "/nook/brands/codex.svg"
};

/** A row badge: brand-tinted for the agent chip, neutral otherwise. */
function Badge(props: { text: string; tint?: string }) {
  return (
    <span
      class="max-w-full truncate rounded-full px-[7px] py-[2px] text-[10px] font-semibold whitespace-nowrap"
      style={{
        color: props.tint ?? "rgba(255,255,255,0.75)",
        background: props.tint ? `${props.tint}33` : "rgba(255,255,255,0.08)"
      }}
    >
      {props.text}
    </span>
  );
}

/**
 * SessionRowView: "project · branch", the latest prompt, a status-colored
 * state line; on the right the agent chip (named "Agent · host" for a
 * remote session), the terminal origin, the status dot and age.
 */
export function SessionRowMock(props: {
  title: string;
  prompt: string;
  state: string;
  status: keyof typeof STATUS;
  agent: AgentLook;
  /** Remote sessions name their machine in the agent chip. */
  host?: string;
  origin?: string;
  age: string;
}) {
  return (
    <div
      class="@container rounded-xl px-2 py-2.5 text-left"
      style={{ background: CARD_FILL, "box-shadow": `inset 0 0 0 1px ${CARD_STROKE}` }}
    >
      {/* The app's layout (badges in a right-hand third) wherever the row
          is wide enough; narrow site cells stack the badges beneath. */}
      <div class="flex flex-col gap-1.5 @[340px]:flex-row @[340px]:items-start @[340px]:gap-2.5">
        <div class="min-w-0 flex-1 space-y-[3px]">
          <p class="truncate text-[13px] font-semibold text-white">{props.title}</p>
          <p class="truncate text-[11.5px] text-white/55">User: {props.prompt}</p>
          <p
            class="truncate text-[11.5px] font-medium transition-colors duration-500"
            style={{ color: STATUS[props.status] }}
          >
            {props.state}
          </p>
        </div>
        <div class="flex min-w-0 shrink-0 items-start gap-1.5 @[340px]:max-w-[50%]">
          <div class="flex min-w-0 flex-col items-center">
            <Badge
              text={props.host ? `${props.agent.name} · ${props.host}` : props.agent.name}
              tint={props.agent.color}
            />
          </div>
          <div class="flex items-center gap-1.5 @[340px]:flex-col @[340px]:items-end @[340px]:gap-0.5">
            <Show when={props.origin}>
              <Badge text={props.origin!} />
            </Show>
            <span class="flex items-center gap-1.5">
              <span
                class="h-[7px] w-[7px] rounded-full transition-colors duration-500"
                style={{ background: STATUS[props.status] }}
              />
              <span class="rounded-full bg-white/[0.08] px-[7px] py-[2px] text-[10px] text-white/80">
                {props.age}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** SwiftUI's dark-mode .yellow, which the approval card tints with. */
const YELLOW = "255,214,10";

/**
 * ApprovalCard: brand mark, session title, "approval" capsule; "Run <tool>",
 * the input in mono; Allow (accent, the island's tint), Allow for session,
 * Deny, and Deny with reason….
 */
export function ApprovalCardMock(props: {
  agent: AgentLook;
  title: string;
  tool: string;
  input: string;
  pressed?: "allow" | "session" | "deny";
}) {
  const button = (key: "allow" | "session" | "deny", label: string, prominent = false) => (
    <span
      class="rounded-md px-2 py-[3px] text-[11px] font-medium whitespace-nowrap text-white transition-transform duration-150"
      style={{
        background: prominent ? ACCENT : "rgba(255,255,255,0.12)",
        transform: props.pressed === key ? "scale(0.92)" : "scale(1)",
        filter: props.pressed === key ? "brightness(1.25)" : "none"
      }}
    >
      {label}
    </span>
  );
  return (
    <div class="rounded-[10px] p-2.5 text-left" style={{ background: `rgba(${YELLOW},0.08)` }}>
      <div class="flex items-center gap-1.5">
        <img src={props.agent.icon} alt="" class="h-[13px] w-[13px]" />
        <span class="truncate text-[12px] font-semibold text-white">{props.title}</span>
        <span
          class="ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
          style={{ background: `rgba(${YELLOW},0.25)` }}
        >
          approval
        </span>
      </div>
      <p class="mt-2 text-[13px] font-medium text-white">Run {props.tool}</p>
      <p class="mt-0.5 truncate font-mono text-[11px] text-white/50">{props.input}</p>
      <div class="mt-2 flex flex-wrap items-center gap-1.5">
        {button("allow", "Allow", true)}
        {button("session", "Allow for session")}
        {button("deny", "Deny")}
        <span class="text-[11px] whitespace-nowrap text-white/50">Deny with reason…</span>
      </div>
    </div>
  );
}

/* ── Timer tape ──────────────────────────────────────────────────── */

/** TimerPalette.accent. */
export const TIMER_ORANGE = "#FA9E4D";

/**
 * TimerTapeDrawing.ticks, ported: fixed-pitch 1.5 px ticks resting at 40 %
 * of the tape height, swelling to a 72 % crest (raised cosine) that leads
 * into the remaining side and trails a shorter shoulder behind.
 */
function tapeTicks(remaining: number, w: number, h: number) {
  const span = w - 2;
  const count = Math.floor(span / 6) + 1;
  const pitch = span / Math.max(1, count - 1);
  const boundary = 1 + span * remaining;
  const baseline = h * 0.4;
  const peak = h * 0.72;
  const lead = Math.min(84, w * 0.4);
  const trail = lead * 0.5;
  const swell = (d: number) => (d < 1 ? (1 + Math.cos(Math.PI * d)) / 2 : 0);
  return Array.from({ length: count }, (_, i) => {
    const cx = 1 + i * pitch;
    const offset = boundary - cx;
    const rise = remaining > 0 ? swell(Math.abs(offset) / (offset >= 0 ? lead : trail)) : 0;
    const height = baseline + (peak - baseline) * rise;
    const fill = remaining > 0 ? Math.min(1, Math.max(0, offset / pitch + 1)) : 0;
    return { x: cx - 0.75, y: (h - height) / 2, height, fill };
  });
}

export function TimerTapeMock(props: {
  remaining: number;
  width: number;
  height: number;
  color?: string;
  opacity?: number;
}) {
  return (
    <svg
      viewBox={`0 0 ${props.width} ${props.height}`}
      width={props.width}
      height={props.height}
      class="block max-w-full"
      style={{ opacity: props.opacity ?? 1 }}
      aria-hidden="true"
    >
      <For each={tapeTicks(Math.min(1, Math.max(0, props.remaining)), props.width, props.height)}>
        {(t) => (
          <>
            <Show when={t.fill < 1}>
              <rect x={t.x} y={t.y} width="1.5" height={t.height} rx="0.75" fill="rgba(255,255,255,0.18)" />
            </Show>
            <Show when={t.fill > 0}>
              <rect
                x={t.x}
                y={t.y}
                width="1.5"
                height={t.height}
                rx="0.75"
                fill={props.color ?? TIMER_ORANGE}
                opacity={t.fill}
              />
            </Show>
          </>
        )}
      </For>
    </svg>
  );
}

/* ── Temperatures ────────────────────────────────────────────────── */

/** MetricPalette.usage: calm below 70 %, warm to 90 %, critical above. */
function usageColor(fraction: number) {
  if (fraction >= 0.9) return "rgba(229,72,77,0.9)";
  if (fraction >= 0.7) return WARM;
  return CALM;
}

/** Tier color at the app's default thresholds (warn 70 °C, alert 85 °C). */
function tierColor(celsius: number) {
  if (celsius >= 85) return "rgba(229,72,77,0.9)";
  if (celsius >= 70) return WARM;
  return "white";
}

/**
 * One die line: label, its 60 s usage trace (filled at 20 %, 1.5 px line,
 * over a hairline floor), and the temperature in mono, tier-tinted.
 */
export function DieLine(props: { label: string; usage: number[]; celsius: number }) {
  const path = () => {
    const n = props.usage.length;
    return props.usage
      .map((u, i) => `${i === 0 ? "M" : "L"}${((i / (n - 1)) * 100).toFixed(2)},${(26 - u * 26).toFixed(2)}`)
      .join(" ");
  };
  const color = () => usageColor(props.usage[props.usage.length - 1] ?? 0);
  return (
    <div class="flex items-center gap-2">
      <span class="text-[9px] font-semibold text-white/50">{props.label}</span>
      <svg viewBox="0 0 100 26" preserveAspectRatio="none" class="h-[26px] min-w-0 flex-1" aria-hidden="true">
        <path d="M0,25.5 L100,25.5" stroke="rgba(255,255,255,0.08)" stroke-width="1" vector-effect="non-scaling-stroke" />
        <path d={`${path()} L100,26 L0,26 Z`} fill={color()} fill-opacity="0.2" />
        <path d={path()} fill="none" stroke={color()} stroke-width="1.5" vector-effect="non-scaling-stroke" />
      </svg>
      <span
        class="font-mono text-[15px] font-medium transition-colors duration-500"
        style={{ color: tierColor(props.celsius) }}
      >
        {Math.round(props.celsius)}°
      </span>
    </div>
  );
}

/* ── Wings ───────────────────────────────────────────────────────── */

export interface WingControlMock {
  glyph: GlyphName;
  on?: boolean;
  pressed?: boolean;
}

/**
 * One edge's capsule: black at 94 %, a 1 px white-18 % stroke, and each
 * control a circle as tall as the Compact island, icon at 42 %.
 */
export function WingCapsule(props: { controls: WingControlMock[]; height: number }) {
  return (
    <div
      class="flex rounded-full"
      style={{
        height: `${props.height}px`,
        background: "rgba(0,0,0,0.94)",
        "box-shadow": "inset 0 0 0 1px rgba(255,255,255,0.18)"
      }}
    >
      <For each={props.controls}>
        {(c) => (
          <span
            class="flex items-center justify-center rounded-full transition-all duration-200"
            style={{
              width: `${props.height}px`,
              height: `${props.height}px`,
              color: `rgba(255,255,255,${c.on === false ? 0.45 : 1})`,
              background: c.pressed ? "rgba(255,255,255,0.14)" : "transparent"
            }}
          >
            <Glyph name={c.glyph} size={Math.round(props.height * 0.42)} />
          </span>
        )}
      </For>
    </div>
  );
}
