import { createSignal, Show, For, createEffect, ErrorBoundary } from "solid-js";
import { PageHead } from "~/components/PageHead";
import { redirect, query, createAsync, useNavigate } from "@solidjs/router";
import { api } from "~/lib/api";

const checkAdmin = query(async (): Promise<boolean> => {
  "use server";
  const { getUserState } = await import("~/lib/auth-query");
  const userState = await getUserState();

  if (userState.privilegeLevel !== "admin") {
    console.log("redirect");
    throw redirect("/");
  }

  return true;
}, "checkAdminAccess");

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

export const route = {
  load: async () => {
    await checkAdmin();
    // Preload initial data with default timeWindow of 7 days
    void getSummaryData(7);
    void getPerformanceData(7);
  }
};

interface PerformanceTarget {
  good: number;
  acceptable: number;
  label: string;
  unit: string;
}

const PERFORMANCE_TARGETS: Record<string, PerformanceTarget> = {
  lcp: { good: 1500, acceptable: 2500, label: "LCP", unit: "ms" },
  fcp: { good: 1000, acceptable: 1800, label: "FCP", unit: "ms" },
  ttfb: { good: 500, acceptable: 800, label: "TTFB", unit: "ms" },
  cls: { good: 0.05, acceptable: 0.1, label: "CLS", unit: "" },
  avgDuration: {
    good: 2000,
    acceptable: 3000,
    label: "Avg Duration",
    unit: "ms"
  }
};

function getPerformanceRating(
  metric: string,
  value: number
): "good" | "acceptable" | "poor" {
  const target = PERFORMANCE_TARGETS[metric];
  if (!target) return "acceptable";

  if (value <= target.good) return "good";
  if (value <= target.acceptable) return "acceptable";
  return "poor";
}

function getRatingColor(rating: "good" | "acceptable" | "poor"): string {
  switch (rating) {
    case "good":
      return "text-green";
    case "acceptable":
      return "text-yellow";
    case "poor":
      return "text-red";
  }
}

function getRatingBgColor(rating: "good" | "acceptable" | "poor"): string {
  switch (rating) {
    case "good":
      return "bg-green/10";
    case "acceptable":
      return "bg-yellow/10";
    case "poor":
      return "bg-red/10";
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes.toFixed(0)}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(Math.round(num));
}

export default function AnalyticsPage() {
  const [timeWindow, setTimeWindow] = createSignal(7);
  const [selectedPath, setSelectedPath] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const summary = createAsync(() => getSummaryData(timeWindow()));

  const performanceStats = createAsync(() => getPerformanceData(timeWindow()));

  const pathStats = createAsync(() => {
    const path = selectedPath();
    if (!path) return Promise.resolve(null);
    return getPathData(path, timeWindow());
  });

  return (
    <>
      <PageHead
        title="Analytics Dashboard - Admin"
        description="Visitor analytics and performance metrics"
      />
      <div class="bg-base min-h-screen px-4 py-8">
        <div class="mx-auto max-w-7xl">
          <div class="mb-8">
            <h1 class="text-text mb-2 text-4xl font-bold">
              Analytics Dashboard
            </h1>
            <p class="text-subtext0">
              Visitor analytics and performance metrics
            </p>
          </div>

          {/* Time Window Selector */}
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

          <Show when={error()}>
            <div class="bg-red/20 border-red text-red mb-6 rounded-lg border p-4">
              <p class="font-semibold">Error loading analytics</p>
              <p class="text-sm">{error()}</p>
            </div>
          </Show>

          <Show when={summary()}>
            {(data) => (
              <>
                {/* Overview Cards */}
                <div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div class="bg-surface0 border-surface1 rounded-lg border p-6 shadow">
                    <div class="text-subtext0 mb-1 text-sm">Total Requests</div>
                    <div class="text-text text-3xl font-bold">
                      {formatNumber(data().totalVisits)}
                    </div>
                    <div class="text-subtext1 mt-1 text-xs">
                      {formatNumber(data().totalPageVisits)} pages,{" "}
                      {formatNumber(data().totalApiCalls)} API
                    </div>
                  </div>

                  <div class="bg-surface0 border-surface1 rounded-lg border p-6 shadow">
                    <div class="text-subtext0 mb-1 text-sm">
                      Unique Visitors
                    </div>
                    <div class="text-text text-3xl font-bold">
                      {formatNumber(data().uniqueVisitors)}
                    </div>
                  </div>

                  <div class="bg-surface0 border-surface1 rounded-lg border p-6 shadow">
                    <div class="text-subtext0 mb-1 text-sm">
                      Authenticated Users
                    </div>
                    <div class="text-text text-3xl font-bold">
                      {formatNumber(data().uniqueUsers)}
                    </div>
                  </div>

                  <div class="bg-surface0 border-surface1 rounded-lg border p-6 shadow">
                    <div class="text-subtext0 mb-1 text-sm">
                      Avg. Visits/Day
                    </div>
                    <div class="text-text text-3xl font-bold">
                      {formatNumber(data().totalVisits / timeWindow())}
                    </div>
                  </div>
                </div>

                {/* Performance Metrics Section */}
                <Show
                  when={
                    performanceStats() &&
                    performanceStats()!.totalWithMetrics > 0
                  }
                >
                  <div class="mb-8">
                    <h2 class="text-text mb-4 text-2xl font-bold">
                      Core Web Vitals
                    </h2>

                    {/* Performance Overview Cards */}
                    <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <Show when={performanceStats()?.avgLcp != null}>
                        <div
                          class={`border-surface1 rounded-lg border p-6 shadow ${getRatingBgColor(getPerformanceRating("lcp", performanceStats()!.avgLcp!))}`}
                        >
                          <div class="text-subtext0 mb-1 text-sm font-medium">
                            LCP (Largest Contentful Paint)
                          </div>
                          <div
                            class={`text-3xl font-bold ${getRatingColor(getPerformanceRating("lcp", performanceStats()!.avgLcp!))}`}
                          >
                            {Math.round(performanceStats()!.avgLcp!)}ms
                          </div>
                          <div class="text-subtext1 mt-1 text-xs">
                            Target: &lt;1.5s (good), &lt;2.5s (ok)
                          </div>
                        </div>
                      </Show>

                      <Show when={performanceStats()?.avgFcp != null}>
                        <div
                          class={`border-surface1 rounded-lg border p-6 shadow ${getRatingBgColor(getPerformanceRating("fcp", performanceStats()!.avgFcp!))}`}
                        >
                          <div class="text-subtext0 mb-1 text-sm font-medium">
                            FCP (First Contentful Paint)
                          </div>
                          <div
                            class={`text-3xl font-bold ${getRatingColor(getPerformanceRating("fcp", performanceStats()!.avgFcp!))}`}
                          >
                            {Math.round(performanceStats()!.avgFcp!)}ms
                          </div>
                          <div class="text-subtext1 mt-1 text-xs">
                            Target: &lt;1s (good), &lt;1.8s (ok)
                          </div>
                        </div>
                      </Show>

                      <Show when={performanceStats()?.avgCls != null}>
                        <div
                          class={`border-surface1 rounded-lg border p-6 shadow ${getRatingBgColor(getPerformanceRating("cls", performanceStats()!.avgCls!))}`}
                        >
                          <div class="text-subtext0 mb-1 text-sm font-medium">
                            CLS (Cumulative Layout Shift)
                          </div>
                          <div
                            class={`text-3xl font-bold ${getRatingColor(getPerformanceRating("cls", performanceStats()!.avgCls!))}`}
                          >
                            {performanceStats()!.avgCls!.toFixed(3)}
                          </div>
                          <div class="text-subtext1 mt-1 text-xs">
                            Target: &lt;0.05 (good), &lt;0.1 (ok)
                          </div>
                        </div>
                      </Show>

                      <Show when={performanceStats()?.avgTtfb != null}>
                        <div
                          class={`border-surface1 rounded-lg border p-6 shadow ${getRatingBgColor(getPerformanceRating("ttfb", performanceStats()!.avgTtfb!))}`}
                        >
                          <div class="text-subtext0 mb-1 text-sm font-medium">
                            TTFB (Time to First Byte)
                          </div>
                          <div
                            class={`text-3xl font-bold ${getRatingColor(getPerformanceRating("ttfb", performanceStats()!.avgTtfb!))}`}
                          >
                            {Math.round(performanceStats()!.avgTtfb!)}ms
                          </div>
                          <div class="text-subtext1 mt-1 text-xs">
                            Target: &lt;500ms (good), &lt;800ms (ok)
                          </div>
                        </div>
                      </Show>
                    </div>

                    {/* Performance by Page */}
                    <Show
                      when={
                        performanceStats()?.byPath &&
                        performanceStats()!.byPath.length > 0
                      }
                    >
                      <div class="bg-surface0 border-surface1 rounded-lg border shadow">
                        <div class="border-surface1 border-b p-6">
                          <h3 class="text-text text-xl font-bold">
                            Performance by Page
                          </h3>
                          <p class="text-subtext0 mt-1 text-sm">
                            {performanceStats()!.totalWithMetrics} page loads
                            with performance data
                          </p>
                        </div>
                        <div class="p-6">
                          <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                              <thead class="border-surface1 border-b">
                                <tr class="text-subtext0 text-left">
                                  <th class="pr-4 pb-3 font-medium">Page</th>
                                  <th class="pr-4 pb-3 text-right font-medium">
                                    LCP
                                  </th>
                                  <th class="pr-4 pb-3 text-right font-medium">
                                    FCP
                                  </th>
                                  <th class="pr-4 pb-3 text-right font-medium">
                                    CLS
                                  </th>
                                  <th class="pr-4 pb-3 text-right font-medium">
                                    TTFB
                                  </th>
                                  <th class="pb-3 text-right font-medium">
                                    Samples
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <For each={performanceStats()!.byPath || []}>
                                  {(page) => (
                                    <tr class="border-surface1 border-b">
                                      <td class="text-text py-3 pr-4 font-mono text-xs">
                                        {page.path}
                                      </td>
                                      <td
                                        class={`py-3 pr-4 text-right font-medium ${getRatingColor(getPerformanceRating("lcp", page.avgLcp))}`}
                                      >
                                        {Math.round(page.avgLcp)}ms
                                      </td>
                                      <td
                                        class={`py-3 pr-4 text-right font-medium ${getRatingColor(getPerformanceRating("fcp", page.avgFcp))}`}
                                      >
                                        {Math.round(page.avgFcp)}ms
                                      </td>
                                      <td
                                        class={`py-3 pr-4 text-right font-medium ${getRatingColor(getPerformanceRating("cls", page.avgCls))}`}
                                      >
                                        {page.avgCls.toFixed(3)}
                                      </td>
                                      <td
                                        class={`py-3 pr-4 text-right font-medium ${getRatingColor(getPerformanceRating("ttfb", page.avgTtfb))}`}
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
                      </div>
                    </Show>
                  </div>
                </Show>

                {/* Top Pages */}
                <div class="bg-surface0 border-surface1 mb-8 rounded-lg border shadow">
                  <div class="border-surface1 border-b p-6">
                    <h2 class="text-text text-2xl font-bold">Top Pages</h2>
                  </div>
                  <div class="p-6">
                    <div class="space-y-3">
                      <For each={data().topPages}>
                        {(pathData) => {
                          const percentage =
                            (pathData.count / data().totalPageVisits) * 100;
                          return (
                            <div
                              class="hover:bg-surface1 cursor-pointer rounded-lg p-3 transition-colors"
                              onClick={() => setSelectedPath(pathData.path)}
                            >
                              <div class="mb-2 flex items-center justify-between">
                                <span class="text-text font-mono text-sm">
                                  {pathData.path}
                                </span>
                                <span class="text-text text-sm font-semibold">
                                  {formatNumber(pathData.count)} visits
                                </span>
                              </div>
                              <div class="bg-surface1 h-2 w-full rounded-full">
                                <div
                                  class="h-2 rounded-full bg-blue-600"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <div class="text-subtext1 mt-1 text-xs">
                                {percentage.toFixed(1)}% of page traffic
                              </div>
                            </div>
                          );
                        }}
                      </For>
                    </div>
                  </div>
                </div>

                {/* Top API Calls */}
                <div class="bg-surface0 border-surface1 mb-8 rounded-lg border shadow">
                  <div class="border-surface1 border-b p-6">
                    <h2 class="text-text text-2xl font-bold">Top API Calls</h2>
                  </div>
                  <div class="p-6">
                    <div class="space-y-3">
                      <For each={data().topApiCalls}>
                        {(apiData) => {
                          const percentage =
                            (apiData.count / data().totalApiCalls) * 100;
                          return (
                            <div class="rounded-lg p-3">
                              <div class="mb-2 flex items-center justify-between">
                                <span class="text-text font-mono text-xs break-all">
                                  {apiData.path}
                                </span>
                                <span class="text-text ml-4 text-sm font-semibold whitespace-nowrap">
                                  {formatNumber(apiData.count)}
                                </span>
                              </div>
                              <div class="bg-surface1 h-2 w-full rounded-full">
                                <div
                                  class="h-2 rounded-full bg-purple-600"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <div class="text-subtext1 mt-1 text-xs">
                                {percentage.toFixed(1)}% of API traffic
                              </div>
                            </div>
                          );
                        }}
                      </For>
                    </div>
                  </div>
                </div>

                {/* Device & Browser Stats */}
                <div class="mb-8 grid grid-cols-1 gap-8 md:grid-cols-2">
                  {/* Device Types */}
                  <div class="bg-surface0 border-surface1 rounded-lg border shadow">
                    <div class="border-surface1 border-b p-6">
                      <h2 class="text-text text-2xl font-bold">Device Types</h2>
                    </div>
                    <div class="p-6">
                      <div class="space-y-4">
                        <For each={data().deviceTypes}>
                          {(device) => {
                            const totalDevices = data().deviceTypes.reduce(
                              (sum, d) => sum + d.count,
                              0
                            );
                            const percentage =
                              totalDevices > 0
                                ? (device.count / totalDevices) * 100
                                : 0;
                            return (
                              <div>
                                <div class="mb-1 flex justify-between">
                                  <span class="text-sm font-medium text-gray-700 capitalize dark:text-gray-300">
                                    {device.type}
                                  </span>
                                  <span class="text-subtext0 text-sm">
                                    {formatNumber(device.count)} (
                                    {percentage.toFixed(1)}%)
                                  </span>
                                </div>
                                <div class="bg-surface1 h-2 w-full rounded-full">
                                  <div
                                    class="h-2 rounded-full bg-purple-600"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          }}
                        </For>
                      </div>
                    </div>
                  </div>

                  {/* Browsers */}
                  <div class="bg-surface0 border-surface1 rounded-lg border shadow">
                    <div class="border-surface1 border-b p-6">
                      <h2 class="text-text text-2xl font-bold">Browsers</h2>
                    </div>
                    <div class="p-6">
                      <div class="space-y-4">
                        <For each={data().browsers}>
                          {(browser) => {
                            const totalBrowsers = data().browsers.reduce(
                              (sum, b) => sum + b.count,
                              0
                            );
                            const percentage =
                              totalBrowsers > 0
                                ? (browser.count / totalBrowsers) * 100
                                : 0;
                            return (
                              <div>
                                <div class="mb-1 flex justify-between">
                                  <span class="text-sm font-medium text-gray-700 capitalize dark:text-gray-300">
                                    {browser.browser}
                                  </span>
                                  <span class="text-subtext0 text-sm">
                                    {formatNumber(browser.count)} (
                                    {percentage.toFixed(1)}%)
                                  </span>
                                </div>
                                <div class="bg-surface1 h-2 w-full rounded-full">
                                  <div
                                    class="h-2 rounded-full bg-green-600"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          }}
                        </For>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Referrers */}
                <Show when={data().topReferrers.length > 0}>
                  <div class="bg-surface0 border-surface1 mb-8 rounded-lg border shadow">
                    <div class="border-surface1 border-b p-6">
                      <h2 class="text-text text-2xl font-bold">
                        Top Referrers
                      </h2>
                    </div>
                    <div class="p-6">
                      <div class="space-y-2">
                        <For each={data().topReferrers}>
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
                  </div>
                </Show>
              </>
            )}
          </Show>

          {/* Path Details Modal/Section */}
          <Show when={selectedPath() && pathStats()}>
            {(stats) => (
              <div class="bg-surface0 border-surface1 mb-8 rounded-lg border shadow">
                <div class="border-surface1 flex items-center justify-between border-b p-6">
                  <h2 class="text-text text-2xl font-bold">
                    Path Details: {selectedPath()}
                  </h2>
                  <button
                    onClick={() => setSelectedPath(null)}
                    class="text-subtext0 hover:text-text"
                  >
                    ✕
                  </button>
                </div>
                <div class="p-6">
                  <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <div class="text-subtext0 text-sm">Total Visits</div>
                      <div class="text-text text-2xl font-bold">
                        {formatNumber(stats().totalVisits)}
                      </div>
                    </div>
                    <div>
                      <div class="text-subtext0 text-sm">Unique Visitors</div>
                      <div class="text-text text-2xl font-bold">
                        {formatNumber(stats().uniqueVisitors)}
                      </div>
                    </div>
                    <div>
                      <div class="text-subtext0 text-sm">Avg. Duration</div>
                      <div class="text-text text-2xl font-bold">
                        {stats().avgDurationMs
                          ? `${(stats().avgDurationMs! / 1000).toFixed(1)}s`
                          : "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* Visits by Day */}
                  <Show when={stats().visitsByDay.length > 0}>
                    <div class="mt-6">
                      <h3 class="text-text mb-4 text-lg font-semibold">
                        Visits by Day
                      </h3>
                      <div class="space-y-2">
                        <For each={stats().visitsByDay}>
                          {(day) => {
                            const maxVisits = Math.max(
                              ...stats().visitsByDay.map((d) => d.count)
                            );
                            const percentage = (day.count / maxVisits) * 100;
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
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          }}
                        </For>
                      </div>
                    </div>
                  </Show>
                </div>
              </div>
            )}
          </Show>
        </div>
      </div>
    </>
  );
}
