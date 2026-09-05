import { For, createMemo, onMount, onCleanup, type JSX } from "solid-js";
import { Campfire, type CampfireState } from "./Campfire";

/**
 * Faithful mock of the island's collapsed pill and expanded panel.
 * Geometry follows the app's IslandSurfaceShape: the top edge spans the
 * full width, the notch housing sits centered, and each corner is a
 * concave scoop (quadratic curve with the control ON the top edge).
 */

/* The app's island indicator palette (AgentsModuleView.statusColor). */
export const STATUS = {
  running: "#6EA7FF",
  ready: "#6FB982",
  attention: "#E7A762",
  error: "#E5484D",
  idle: "rgba(255,255,255,0.35)"
};

/** MetricPalette.calm — the desaturated sky of every metric bar. */
export const CALM = "#6EA7FF";
export const WARM = "#E7A762";
export const CRITICAL = "rgba(229,72,77,0.9)";

/* NookPalette.accent — brand + live interactive state, never status. */
export const ACCENT = "#4897b2";

/** The expanded panel's card chrome: white 5.5% fill, white 7% stroke. */
export const CARD_FILL = "rgba(255,255,255,0.055)";
export const CARD_STROKE = "rgba(255,255,255,0.07)";

/**
 * One module-card surface shared by every mock panel — the app's
 * cardChrome(): rounded 12, hairline stroke, white-on-black fill.
 */
export function ModuleCard(props: { children: JSX.Element; class?: string }) {
  return (
    <div
      class={`rounded-xl ${props.class ?? ""}`}
      style={{
        background: CARD_FILL,
        "box-shadow": `inset 0 0 0 1px ${CARD_STROKE}`
      }}
    >
      <div class="p-3">{props.children}</div>
    </div>
  );
}

/**
 * Island surface, faithful to the app's IslandSurfaceShape: the top edge
 * spans the full outer width while the body is inset, each corner joining
 * them with a concave quad flare (control point ON the top edge), the
 * bottom a convex 14px round. Rendered as an inline SVG with
 * foreignObject-clip via CSS `clip-path: path(...)`.
 */
const FLARE = 22; // the app's topRadius — how far the wings taper inward
const BOTTOM_R = 14;

function islandPath(w: number, h: number): string {
  const tr = Math.min(FLARE, w / 2);
  const br = Math.min(BOTTOM_R, tr);
  // Mirrors IslandSurfaceShape.path exactly (same node order, same controls).
  return (
    `M0,0 L${w},0 ` +
    `Q${w - tr},0 ${w - tr},${tr} ` +
    `L${w - tr},${h - br} ` +
    `Q${w - tr},${h} ${w - tr - br},${h} ` +
    `L${tr + br},${h} ` +
    `Q${tr},${h} ${tr},${h - br} ` +
    `L${tr},${tr} ` +
    `Q${tr},0 0,0 Z`
  );
}

function IslandSurface(props: { children: JSX.Element; class?: string }) {
  let el: HTMLDivElement | undefined;
  // The path must track the element's real size; a fixed viewBox would
  // stretch the flare. Measure on mount + resize.
  onMount(() => {
    const node = el;
    if (!node) return;
    const apply = () => {
      const r = node.getBoundingClientRect();
      node.style.clipPath = `path("${islandPath(r.width, r.height)}")`;
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    onCleanup(() => observer.disconnect());
  });
  return (
    <div
      ref={el}
      class={`bg-black ${props.class ?? ""}`}
      style={{ "border-radius": "0 0 14px 14px" }}
    >
      {props.children}
    </div>
  );
}

/** ISLAND … */
const NOTCH_NAME = "The Nook";

/* ── Collapsed pill ─────────────────────────────────────────────────── */

/**
 * The collapsed pill: campfire slot left, camera housing center, live
 * data slot right. Slot squares are native (no menu-bar stub — the wings
 * hang from nothing, like a floating notch).
 */
export function IslandPill(props: {
  campfire?: CampfireState;
  right?: JSX.Element;
}) {
  return (
    <IslandSurface class="mx-auto w-fit">
      <div class="flex items-end" style={{ height: "60px" }}>
        <div
          class="flex items-center justify-center"
          style={{ width: "86px", height: "56px" }}
        >
          <Campfire state={props.campfire ?? "running"} pixel={4.2} />
        </div>
        {/* camera housing: lens dot centered like the real notch */}
        <div
          class="flex items-center justify-center"
          style={{ width: "150px", height: "56px" }}
        >
          <span
            class="rounded-full"
            style={{
              width: "12px",
              height: "12px",
              background: "radial-gradient(circle at 40% 35%, #2a3a4a 0%, #0a0c10 70%)",
              "box-shadow": "inset 0 0 0 1px rgba(255,255,255,0.06)"
            }}
          />
        </div>
        <div
          class="flex items-center justify-center"
          style={{ width: "86px", height: "56px" }}
        >
          {props.right}
        </div>
      </div>
    </IslandSurface>
  );
}

/** The agents dot-grid slot indicator: balanced rows of status squares. */
export function AgentDotGrid(props: { states: (keyof typeof STATUS)[] }) {
  // Balanced rows: 3+3+2 for 8, 2x2 for 4, 3 for 3 … app: 1,2,3,4=2x2,
  // 5=[3,2], 6=[3,3], 7=[4,3], 8=[4,4], 9=[3,3,3]
  const rows = (n: number): number[] => {
    switch (n) {
      case 1:
        return [1];
      case 2:
        return [2];
      case 3:
        return [3];
      case 4:
        return [2, 2];
      case 5:
        return [3, 2];
      case 6:
        return [3, 3];
      case 7:
        return [4, 3];
      case 8:
        return [4, 4];
      default:
        return [4, 4];
    }
  };
  const sizes = rows(props.states.length);
  const groups = createMemo(() => {
    let cursor = 0;
    return sizes.map((count) => props.states.slice(cursor, (cursor += count)));
  });
  return (
    <div class="flex flex-col items-center gap-[1.5px]">
      <For each={groups()}>
        {(group) => (
          <div class="flex gap-[1.5px]">
            <For each={group}>
              {(s) => (
                <span
                  class="rounded-[1.5px]"
                  style={{
                    width: "7px",
                    height: "7px",
                    background: STATUS[s]
                  }}
                />
              )}
            </For>
          </div>
        )}
      </For>
    </div>
  );
}


/* ── Expanded panel ─────────────────────────────────────────────────── */

/**
 * The expanded island: header ("The Nook" + "N active" + controls),
 * tab strip, divider, then one panel page. Width ~ the app's expanded
 * footprint on a 14" display.
 */
export function IslandExpanded(props: {
  activeCount: number;
  tabs: { icon: string; label: string; active?: boolean }[];
  children: JSX.Element;
}) {
  return (
    <div class="w-[560px] max-w-full">
      <IslandSurface>
        {/* header */}
        <div class="flex items-center px-[18px] py-2.5">
          <span class="text-[14px] font-semibold text-white">{NOTCH_NAME}</span>
          <div class="flex-1" />
          <span class="text-[11px] text-white/50">
            {props.activeCount} active
          </span>
          <span class="ml-3 text-[11px] font-semibold text-white/60">⚙</span>
          <span class="ml-3 text-[11px] font-semibold text-white/60">✕</span>
        </div>
        {/* tab strip: one icon button per panel; active wears accent 22% */}
        <div class="flex gap-2 px-[18px] pb-1.5">
          <For each={props.tabs}>
            {(tab) => (
              <span
                title={tab.label}
                class="flex items-center justify-center rounded-[5px]"
                style={{
                  width: "22px",
                  height: "22px",
                  "font-size": "13px",
                  background: tab.active ? `${ACCENT}38` : "transparent",
                  color: tab.active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)"
                }}
              >
                {tab.icon}
              </span>
            )}
          </For>
        </div>
        <div class="h-px bg-white/10" />
        <div class="px-[18px] py-4">{props.children}</div>
      </IslandSurface>
    </div>
  );
}
