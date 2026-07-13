import { createSignal, Show, For } from "solid-js";
import { PageHead } from "~/components/PageHead";
import { redirect, query, createAsync } from "@solidjs/router";

/* ───────────────────────────────────────────────
 * Dataset registry — extend this record to add
 * more data sources to the dashboard over time.
 * ─────────────────────────────────────────────── */

type DatasetId = "frenome" | "lineage";

interface DatasetDef {
  id: DatasetId;
  label: string;
  description: string;
  badge: string;
}

const DATASETS: DatasetDef[] = [
  {
    id: "frenome",
    label: "freno.me",
    description: "Website visitor analytics and performance metrics",
    badge: "Web",
  },
  {
    id: "lineage",
    label: "Life & Lineage",
    description: "Mobile game player analytics and telemetry",
    badge: "Game",
  },
];

/* ───────────────────────────────────────────────
 * Auth guard
 * ─────────────────────────────────────────────── */

const checkAdmin = query(async (): Promise<boolean> => {
  "use server";
  const { getUserState } = await import("~/lib/auth-query");
  const userState = await getUserState();

  if (!userState.isAdmin) {
    throw redirect("/");
  }

  return true;
}, "checkAdminAccess");

/* ───────────────────────────────────────────────
 * Server queries – freno.me website data
 * ─────────────────────────────────────────────── */

const getSummaryData = query(async (days: number) => {
  "use server";
  const { createCaller } = await import("~/server/api/root");
  const { getEvent } = await import("vinxi/http");

  const caller = await createCaller(getEvent());
  return await caller.analytics.getSummary({ days });
}, "getSummaryData");

const getPerformanceData = query(async (days: number) => {
  "use server";
  const { createCaller } = await import("~/server/api/root");
  const { getEvent } = await import("vinxi/http");

  const caller = await createCaller(getEvent());
  return await caller.analytics.getPerformanceStats({ days });
}, "getPerformanceData");

const getPathData = query(async (path: string, days: number) => {
  "use server";
  const { createCaller } = await import("~/server/api/root");
  const { getEvent } = await import("vinxi/http");

  const caller = await createCaller(getEvent());
  return await caller.analytics.getPathStats({ path, days });
}, "getPathData");

/* ───────────────────────────────────────────────
 * Server queries – Lineage game data
 * ─────────────────────────────────────────────── */

const getLineageStats = query(async () => {
  "use server";
  const { createCaller } = await import("~/server/api/root");
  const { getEvent } = await import("vinxi/http");

  const caller = await createCaller(getEvent());
  return await caller.lineage.misc.getLineageStats();
}, "getLineageStats");

export const route = {
  load: async () => {
    await checkAdmin();
    // Preload freno.me dataset (the default tab)
    void getSummaryData(7);
    void getPerformanceData(7);
  },
};

/* ───────────────────────────────────────────────
 * Helpers
 * ─────────────────────────────────────────────── */

function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(Math.round(num));
}

function formatPercent(value: number, total: number): string {
  if (total === 0) return "0.0";
  return ((value / total) * 100).toFixed(1);
}

/** Render a solid bar behind a label + count */
function StatBar(props: {
  label: string;
  count: number;
  total: number;
  color?: string;
  onClick?: () => void;
}) {
  const pct = () => Number(formatPercent(props.count, props.total));
  return (
    <div
      class="hover:bg-surface1 cursor-pointer rounded-lg p-3 transition-colors"
      onClick={props.onClick}
    >
      <div class="mb-2 flex items-center justify-between">
        <span class="text-text text-sm">{props.label}</span>
        <span class="text-text text-sm font-semibold">
          {formatNumber(props.count)}{" "}
          <span class="text-subtext0 font-normal">({formatPercent(props.count, props.total)}%)</span>
        </span>
      </div>
      <div class="bg-surface1 h-2 w-full rounded-full">
        <div
          class={`h-2 rounded-full ${props.color || "bg-blue-600"}`}
          style={{ width: `${Math.max(Number(formatPercent(props.count, props.total)), 0.5)}%` }}
        />
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
 * Overview card component
 * ─────────────────────────────────────────────── */

function OverviewCard(props: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div class="bg-surface0 border-surface1 rounded-lg border p-6 shadow">
      <div class="text-subtext0 mb-1 text-sm">{props.title}</div>
      <div class="text-text text-3xl font-bold">{props.value}</div>
      <Show when={props.subtitle}>
        <div class="text-subtext1 mt-1 text-xs">{props.subtitle}</div>
      </Show>
    </div>
  );
}

/* ───────────────────────────────────────────────
 * Freno.me dashboard panel (original content)
 * ─────────────────────────────────────────────── */

interface FrenomePanelProps {
  days: number;
  setPath: (path: string | null) => void;
}

function FrenomePanel(props: FrenomePanelProps) {
  const summary = createAsync(() => getSummaryData(props.days));
  const performanceStats = createAsync(() => getPerformanceData(props.days));

  return (
    <Show when={summary()} keyed>
      {(data) => (
        <>
          {/* Overview cards */}
          <div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <OverviewCard
              title="Total Requests"
              value={formatNumber(data.totalVisits)}
              subtitle={`${formatNumber(data.totalPageVisits)} pages, ${formatNumber(data.totalApiCalls)} API`}
            />
            <OverviewCard
              title="Unique Visitors"
              value={formatNumber(data.uniqueVisitors)}
            />
            <OverviewCard
              title="Authenticated Users"
              value={formatNumber(data.uniqueUsers)}
            />
            <OverviewCard
              title="Avg. Visits/Day"
              value={formatNumber(data.totalVisits / props.days)}
            />
          </div>

          {/* Performance */}
          <Show when={performanceStats()} keyed>
            {(ps) => (
              <Show when={ps.totalWithMetrics > 0}>
                <div class="mb-8">
                  <h2 class="text-text mb-4 text-2xl font-bold">
                    Core Web Vitals
                  </h2>
                  <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <PerformanceCard
                      label="LCP (Largest Contentful Paint)"
                      value={
                        ps.avgLcp != null
                          ? `${Math.round(ps.avgLcp)}ms`
                          : null
                      }
                      metric="lcp"
                      targetLabel="<1.5s (good), <2.5s (ok)"
                      target={ps.avgLcp ?? 0}
                    />
                    <PerformanceCard
                      label="FCP (First Contentful Paint)"
                      value={
                        ps.avgFcp != null
                          ? `${Math.round(ps.avgFcp)}ms`
                          : null
                      }
                      metric="fcp"
                      targetLabel="<1s (good), <1.8s (ok)"
                      target={ps.avgFcp ?? 0}
                    />
                    <PerformanceCard
                      label="CLS (Cumulative Layout Shift)"
                      value={
                        ps.avgCls != null ? ps.avgCls.toFixed(3) : null
                      }
                      metric="cls"
                      targetLabel="<0.05 (good), <0.1 (ok)"
                      target={ps.avgCls ?? 0}
                    />
                    <PerformanceCard
                      label="TTFB (Time to First Byte)"
                      value={
                        ps.avgTtfb != null
                          ? `${Math.round(ps.avgTtfb)}ms`
                          : null
                      }
                      metric="ttfb"
                      targetLabel="<500ms (good), <800ms (ok)"
                      target={ps.avgTtfb ?? 0}
                    />
                  </div>

                  <Show when={ps.byPath && ps.byPath.length > 0}>
                    <div class="bg-surface0 border-surface1 rounded-lg border shadow">
                      <div class="border-surface1 border-b p-6">
                        <h3 class="text-text text-xl font-bold">
                          Performance by Page
                        </h3>
                        <p class="text-subtext0 mt-1 text-sm">
                          {ps.totalWithMetrics} page loads with performance data
                        </p>
                      </div>
                      <div class="p-6">
                        <table class="w-full text-sm">
                          <thead class="border-surface1 border-b">
                            <tr class="text-subtext0 text-left">
                              <th class="pr-4 pb-3 font-medium">Page</th>
                              <th class="pr-4 pb-3 text-right font-medium">LCP</th>
                              <th class="pr-4 pb-3 text-right font-medium">FCP</th>
                              <th class="pr-4 pb-3 text-right font-medium">CLS</th>
                              <th class="pr-4 pb-3 text-right font-medium">TTFB</th>
                              <th class="pb-3 text-right font-medium">Samples</th>
                            </tr>
                          </thead>
                          <tbody>
                            <For each={ps.byPath}>
                              {(page: { path: string; avgLcp: number; avgFcp: number; avgCls: number; avgTtfb: number; count: number }) => (
                                <tr class="border-surface1 border-b">
                                  <td class="text-text py-3 pr-4 font-mono text-xs">
                                    {page.path}
                                  </td>
                                  <td
                                    class={`py-3 pr-4 text-right font-medium ${ratingColor("lcp", page.avgLcp)}`}
                                  >
                                    {Math.round(page.avgLcp)}ms
                                  </td>
                                  <td
                                    class={`py-3 pr-4 text-right font-medium ${ratingColor("fcp", page.avgFcp)}`}
                                  >
                                    {Math.round(page.avgFcp)}ms
                                  </td>
                                  <td
                                    class={`py-3 pr-4 text-right font-medium ${ratingColor("cls", page.avgCls)}`}
                                  >
                                    {page.avgCls.toFixed(3)}
                                  </td>
                                  <td
                                    class={`py-3 pr-4 text-right font-medium ${ratingColor("ttfb", page.avgTtfb)}`}
                                  >
                                    {Math.round(page.avgTtfb)}ms
                                  </td>
                                  <td class="text-subtext0 py-3 text-right">
                                    {page.count}
                                  </td>
                                </tr>
                              )}
                            </For>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </Show>
                </div>
              </Show>
            )}
          </Show>

          {/* Top pages */}
          <div class="bg-surface0 border-surface1 mb-8 rounded-lg border shadow">
            <div class="border-surface1 border-b p-6">
              <h2 class="text-text text-2xl font-bold">Top Pages</h2>
            </div>
            <div class="p-6">
              <div class="space-y-3">
                <For each={data.topPages}>
                  {(pathData) => (
                    <StatBar
                      label={pathData.path}
                      count={pathData.count}
                      total={data.totalPageVisits}
                      color="bg-blue-600"
                      onClick={() => props.setPath(pathData.path)}
                    />
                  )}
                </For>
              </div>
            </div>
          </div>

          {/* Top API calls */}
          <div class="bg-surface0 border-surface1 mb-8 rounded-lg border shadow">
            <div class="border-surface1 border-b p-6">
              <h2 class="text-text text-2xl font-bold">Top API Calls</h2>
            </div>
            <div class="p-6">
              <div class="space-y-3">
                <For each={data.topApiCalls}>
                  {(apiData) => (
                    <StatBar
                      label={apiData.path}
                      count={apiData.count}
                      total={data.totalApiCalls}
                      color="bg-purple-600"
                    />
                  )}
                </For>
              </div>
            </div>
          </div>

          {/* Devices & browsers */}
          <div class="mb-8 grid grid-cols-1 gap-8 md:grid-cols-2">
            <div class="bg-surface0 border-surface1 rounded-lg border shadow">
              <div class="border-surface1 border-b p-6">
                <h2 class="text-text text-2xl font-bold">Device Types</h2>
              </div>
              <div class="p-6 space-y-4">
                <For each={data.deviceTypes}>
                  {(device) => (
                    <StatBar
                      label={device.type}
                      count={device.count}
                      total={data.deviceTypes.reduce(
                        (s: number, d: { type: string; count: number }) => s + d.count,
                        0,
                      )}
                      color="bg-purple-600"
                    />
                  )}
                </For>
              </div>
            </div>

            <div class="bg-surface0 border-surface1 rounded-lg border shadow">
              <div class="border-surface1 border-b p-6">
                <h2 class="text-text text-2xl font-bold">Browsers</h2>
              </div>
              <div class="p-6 space-y-4">
                <For each={data.browsers}>
                  {(browser: { browser: string; count: number }) => (
                    <StatBar
                      label={browser.browser}
                      count={browser.count}
                      total={data.browsers.reduce((s: number, b: { browser: string; count: number }) => s + b.count, 0)}
                      color="bg-green-600"
                    />
                  )}
                </For>
              </div>
            </div>
          </div>

          {/* Top referrers */}
          <Show when={data.topReferrers.length > 0}>
            <div class="bg-surface0 border-surface1 mb-8 rounded-lg border shadow">
              <div class="border-surface1 border-b p-6">
                <h2 class="text-text text-2xl font-bold">Top Referrers</h2>
              </div>
              <div class="p-6 space-y-2">
                <For each={data.topReferrers}>
                  {(referrer) => (
                    <div class="border-surface1 flex justify-between border-b py-2">
                      <span class="text-text max-w-md truncate text-sm">
                        {referrer.referrer}
                      </span>
                      <span class="text-text text-sm font-semibold">
                        {formatNumber(referrer.count)}
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </>
      )}
    </Show>
  );
}

/* ───────────────────────────────────────────────
 * Performance card sub-component
 * ─────────────────────────────────────────────── */

interface PerfThresholds {
  good: number;
  acceptable: number;
}

const PERF_THRESHOLDS: Record<string, PerfThresholds> = {
  lcp: { good: 1500, acceptable: 2500 },
  fcp: { good: 1000, acceptable: 1800 },
  ttfb: { good: 500, acceptable: 800 },
  cls: { good: 0.05, acceptable: 0.1 },
};

function perfRating(metric: string, value: number): "good" | "acceptable" | "poor" {
  const t = PERF_THRESHOLDS[metric];
  if (!t) return "acceptable";
  if (value <= t.good) return "good";
  if (value <= t.acceptable) return "acceptable";
  return "poor";
}

function ratingColor(metric: string, value: number): string {
  const r = perfRating(metric, value);
  switch (r) {
    case "good":
      return "text-green";
    case "acceptable":
      return "text-yellow";
    case "poor":
      return "text-red";
  }
}

function ratingBg(metric: string, value: number): string {
  const r = perfRating(metric, value);
  switch (r) {
    case "good":
      return "bg-green/10";
    case "acceptable":
      return "bg-yellow/10";
    case "poor":
      return "bg-red/10";
  }
}

function PerformanceCard(props: {
  label: string;
  value: string | null;
  metric: string;
  targetLabel: string;
  target: number;
}) {
  return (
    <Show when={props.value != null}>
      <div
        class={`border-surface1 rounded-lg border p-6 shadow ${ratingBg(props.metric, props.target)}`}
      >
        <div class="text-subtext0 mb-1 text-sm font-medium">{props.label}</div>
        <div
          class={`text-3xl font-bold ${ratingColor(props.metric, props.target)}`}
        >
          {props.value}
        </div>
        <div class="text-subtext1 mt-1 text-xs">Target: {props.targetLabel}</div>
      </div>
    </Show>
  );
}

/* ───────────────────────────────────────────────
 * Path detail panel (freno.me)
 * ─────────────────────────────────────────────── */

function PathDetailPanel(props: {
  path: string;
  days: number;
  onClose: () => void;
}) {
  const stats = createAsync(() => getPathData(props.path, props.days));

  return (
    <Show when={stats()} keyed>
      {(s) => (
        <div class="bg-surface0 border-surface1 mb-8 rounded-lg border shadow">
          <div class="border-surface1 flex items-center justify-between border-b p-6">
            <h2 class="text-text break-all text-2xl font-bold">
              Path: {props.path}
            </h2>
            <button
              onClick={props.onClose}
              class="text-subtext0 hover:text-text shrink-0 ml-4"
            >
              ✕
            </button>
          </div>
          <div class="p-6">
            <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <OverviewCard title="Total Visits" value={formatNumber(s.totalVisits)} />
              <OverviewCard
                title="Unique Visitors"
                value={formatNumber(s.uniqueVisitors)}
              />
              <OverviewCard
                title="Avg. Duration"
                value={
                  s.avgDurationMs
                    ? `${(s.avgDurationMs / 1000).toFixed(1)}s`
                    : "N/A"
                }
              />
            </div>
            <Show when={s.visitsByDay.length > 0}>
              <h3 class="text-text mb-4 text-lg font-semibold">
                Visits by Day
              </h3>
              <div class="space-y-2">
                <For each={s.visitsByDay}>
                  {(day) => {
                    const maxV = Math.max(...s.visitsByDay.map((d) => d.count));
                    const pct = maxV > 0 ? (day.count / maxV) * 100 : 0;
                    return (
                      <div>
                        <div class="mb-1 flex justify-between">
                          <span class="text-text text-sm">
                            {new Date(day.date).toLocaleDateString()}
                          </span>
                          <span class="text-text text-sm font-semibold">
                            {formatNumber(day.count)}
                          </span>
                        </div>
                        <div class="bg-surface1 h-2 w-full rounded-full">
                          <div
                            class="h-2 rounded-full bg-blue-600"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Show>
          </div>
        </div>
      )}
    </Show>
  );
}

/* ───────────────────────────────────────────────
 * Lineage dashboard panel
 * ─────────────────────────────────────────────── */

function LineagePanel() {
  const data = createAsync(() => getLineageStats());

  return (
    <Show when={data()} keyed>
      {(result) => {
        if (!result.success || result.players.length === 0) {
          return (
            <div class="bg-surface0 border-surface1 rounded-lg border p-12 text-center">
              <p class="text-subtext0 text-lg">
                No Lineage player analytics data available yet.
              </p>
              <p class="text-subtext1 mt-2 text-sm">
                Data appears after players send telemetry from the mobile app.
              </p>
            </div>
          );
        }

        const players = result.players;
        const totalPlayers = players.length;

        const classCounts: Record<string, number> = {};
        for (const p of players) {
          const cls = p.playerClass || "unknown";
          classCounts[cls] = (classCounts[cls] || 0) + 1;
        }
        const classEntries = Object.entries(classCounts).sort((a, b) => b[1] - a[1]);

        const jobCounts: Record<string, number> = {};
        for (const p of players) {
          if (typeof p.jobs === "object" && p.jobs) {
            for (const [job, level] of Object.entries(p.jobs as Record<string, unknown>)) {
              if (typeof level === "number" && level > 0) {
                jobCounts[job] = (jobCounts[job] || 0) + 1;
              }
            }
          }
        }
        const jobEntries = Object.entries(jobCounts).sort((a, b) => b[1] - a[1]);

        const totalSpells = players.reduce((s: number, p) => s + (p.spellCount || 0), 0);
        const avgSpells = totalPlayers > 0 ? (totalSpells / totalPlayers).toFixed(1) : "0";

        let totalCompletion = 0;
        let playersWithDungeons = 0;
        for (const p of players) {
          const dp = p.dungeonProgression as Record<string, unknown> | null;
          if (dp && typeof dp.completedFloors === "number") {
            totalCompletion += dp.completedFloors;
            playersWithDungeons++;
          }
        }
        const avgDungeonPct =
          playersWithDungeons > 0
            ? ((totalCompletion / playersWithDungeons) * 100).toFixed(1)
            : "—";

        const profCounts: Record<string, number> = {};
        for (const p of players) {
          if (typeof p.proficiencies === "object" && p.proficiencies) {
            for (const [prof, val] of Object.entries(p.proficiencies as Record<string, unknown>)) {
              if (typeof val === "number" && val > 0) {
                profCounts[prof] = (profCounts[prof] || 0) + 1;
              }
            }
          }
        }
        const profEntries = Object.entries(profCounts).sort((a, b) => b[1] - a[1]);

        return (
          <>
            {/* Overview cards */}
            <div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <OverviewCard title="Total Players" value={formatNumber(totalPlayers)} subtitle="Unique player IDs" />
              <OverviewCard title="Avg Spells Known" value={avgSpells} subtitle={`${totalSpells} total across ${totalPlayers} players`} />
              <OverviewCard title="Class Diversity" value={formatNumber(classEntries.length)} subtitle="Unique classes played" />
              <OverviewCard title="Avg Dungeon Completion" value={`${avgDungeonPct}%`} subtitle={playersWithDungeons > 0 ? `${playersWithDungeons} players with progression data` : "No progression data yet"} />
            </div>

            <div class="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div class="bg-surface0 border-surface1 rounded-lg border shadow">
                <div class="border-surface1 border-b p-6">
                  <h2 class="text-text text-2xl font-bold">Class Distribution</h2>
                </div>
                <div class="p-6 space-y-3">
                  <For each={classEntries.slice(0, 10)}>
                    {([cls, count]) => <StatBar label={cls} count={count} total={totalPlayers} />}
                  </For>
                </div>
              </div>

              <div class="bg-surface0 border-surface1 rounded-lg border shadow">
                <div class="border-surface1 border-b p-6">
                  <h2 class="text-text text-2xl font-bold">Top Jobs</h2>
                </div>
                <div class="p-6 space-y-3">
                  <Show when={jobEntries.length > 0} fallback={<p class="text-subtext0 py-4 text-center text-sm">No job data recorded yet.</p>}>
                    <For each={jobEntries.slice(0, 10)}>
                      {([job, count]) => <StatBar label={job} count={count} total={totalPlayers} color="bg-purple-600" />}
                    </For>
                  </Show>
                </div>
              </div>
            </div>

            <Show when={profEntries.length > 0}>
              <div class="bg-surface0 border-surface1 mb-8 rounded-lg border shadow">
                <div class="border-surface1 border-b p-6">
                  <h2 class="text-text text-2xl font-bold">Magic Proficiencies</h2>
                </div>
                <div class="p-6 space-y-3">
                  <For each={profEntries.slice(0, 10)}>
                    {([prof, count]) => <StatBar label={prof} count={count} total={totalPlayers} color="bg-cyan-600" />}
                  </For>
                </div>
              </div>
            </Show>

            <div class="bg-surface0 border-surface1 mb-8 rounded-lg border shadow">
              <div class="border-surface1 border-b p-6">
                <h2 class="text-text text-2xl font-bold">All Players</h2>
                <p class="text-subtext0 mt-1 text-sm">{totalPlayers} total players</p>
              </div>
              <div class="p-6 overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="border-surface1 border-b">
                    <tr class="text-subtext0 text-left">
                      <th class="pr-4 pb-3 font-medium">Player ID</th>
                      <th class="pr-4 pb-3 font-medium">Class</th>
                      <th class="pr-4 pb-3 text-right font-medium">Spells</th>
                      <th class="pr-4 pb-3 text-right font-medium">Jobs</th>
                      <th class="pr-4 pb-3 text-right font-medium">Proficiencies</th>
                      <th class="pb-3 text-right font-medium">Dungeon Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={players}>
                      {(p: Record<string, unknown>) => {
                        const dp = p.dungeonProgression as Record<string, unknown> | null | undefined;
                        const dungeonPct = dp && typeof dp.completedFloors === "number" ? `${(dp.completedFloors * 100).toFixed(0)}%` : "—";
                        const jobList = typeof p.jobs === "object" && p.jobs ? Object.entries(p.jobs as Record<string, unknown>).filter(([, v]) => typeof v === "number" && (v as number) > 0).length : 0;
                        const profList = typeof p.proficiencies === "object" && p.proficiencies ? Object.entries(p.proficiencies as Record<string, unknown>).filter(([, v]) => typeof v === "number" && (v as number) > 0).length : 0;

                        return (
                          <tr class="border-surface1 border-b hover:bg-surface1 transition-colors">
                            <td class="text-text py-3 pr-4 font-mono text-xs max-w-[200px] truncate">{p.playerID as string}</td>
                            <td class="text-text py-3 pr-4">{(p.playerClass as string) || "—"}</td>
                            <td class="text-text py-3 pr-4 text-right">{p.spellCount != null ? String(p.spellCount) : "—"}</td>
                            <td class="text-text py-3 pr-4 text-right">{jobList}</td>
                            <td class="text-text py-3 pr-4 text-right">{profList}</td>
                            <td class="text-text py-3 text-right">{dungeonPct}</td>
                          </tr>
                        );
                      }}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );
      }}
    </Show>
  );
}

/* ───────────────────────────────────────────────
 * Dataset toggle component
 * ─────────────────────────────────────────────── */

function DatasetToggle(props: {
  datasets: DatasetDef[];
  active: DatasetId;
  onSelect: (id: DatasetId) => void;
}) {
  return (
    <div class="mb-6 flex flex-wrap gap-2" role="radiogroup">
      <For each={props.datasets}>
        {(ds) => (
          <button
            onClick={() => props.onSelect(ds.id)}
            class={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
              props.active === ds.id
                ? "bg-blue text-base"
                : "bg-surface0 text-text hover:bg-surface1 border-surface1 border"
            }`}
            role="radio"
            aria-checked={props.active === ds.id}
          >
            <span
              class={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                props.active === ds.id
                  ? "bg-white/20"
                  : "bg-surface1 text-subtext0"
              }`}
            >
              {ds.badge}
            </span>
            {ds.label}
          </button>
        )}
      </For>
    </div>
  );
}

/* ───────────────────────────────────────────────
 * Page component
 * ─────────────────────────────────────────────── */

export default function AnalyticsPage() {
  const [dataset, setDataset] = createSignal<DatasetId>("frenome");
  const [timeWindow, setTimeWindow] = createSignal(7);
  const [selectedPath, setSelectedPath] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const activeDef = () =>
    DATASETS.find((d) => d.id === dataset()) ?? DATASETS[0];

  return (
    <>
      <PageHead
        title="Analytics Dashboard - Admin"
        description="Multi-dataset analytics dashboard"
      />
      <div class="bg-base min-h-screen px-4 py-8">
        <div class="mx-auto max-w-7xl">
          {/* Header */}
          <div class="mb-8">
            <h1 class="text-text mb-2 text-4xl font-bold">
              Analytics Dashboard
            </h1>
            <p class="text-subtext0">{activeDef().description}</p>
          </div>

          {/* Dataset toggle */}
          <DatasetToggle
            datasets={DATASETS}
            active={dataset()}
            onSelect={(id) => {
              setDataset(id);
              setSelectedPath(null);
            }}
          />

          {/* Time window — only for freno.me for now */}
          <Show when={dataset() === "frenome"}>
            <div class="mb-6 flex gap-2">
              <For each={[1, 7, 30, 90]}>
                {(days) => (
                  <button
                    onClick={() => setTimeWindow(days)}
                    class={`rounded-lg px-4 py-2 font-medium transition-colors ${
                      timeWindow() === days
                        ? "bg-blue text-base"
                        : "bg-surface0 text-text hover:bg-surface1 border-surface1 border"
                    }`}
                  >
                    {days === 1 ? "24h" : `${days}d`}
                  </button>
                )}
              </For>
            </div>
          </Show>

          {/* Error banner */}
          <Show when={error()}>
            <div class="bg-red/20 border-red text-red mb-6 rounded-lg border p-4">
              <p class="font-semibold">Error loading analytics</p>
              <p class="text-sm">{error()}</p>
            </div>
          </Show>

          {/* Dataset content */}
          <Show when={dataset() === "frenome"}>
            <FrenomePanel
              days={timeWindow()}
              setPath={setSelectedPath}
            />

            {/* Path detail overlay */}
            <Show when={selectedPath()}>
              {(path) => (
                <PathDetailPanel
                  path={path()}
                  days={timeWindow()}
                  onClose={() => setSelectedPath(null)}
                />
              )}
            </Show>
          </Show>

          <Show when={dataset() === "lineage"}>
            <LineagePanel />
          </Show>
        </div>
      </div>
    </>
  );
}
