import { createSignal, Show, For, createEffect, ErrorBoundary } from "solid-js";
import { Title } from "@solidjs/meta";
import { redirect, query, createAsync, useNavigate } from "@solidjs/router";
import { getEvent } from "vinxi/http";
import { api } from "~/lib/api";

const checkAdmin = query(async (): Promise<boolean> => {
  "use server";
  const { getUserID } = await import("~/server/auth");
  const { env } = await import("~/env/server");
  const event = getEvent()!;
  const userId = await getUserID(event);

  if (!userId || userId !== env.ADMIN_ID) {
    throw redirect("/");
  }

  return true;
}, "checkAdminAccess");

export const route = {
  load: () => checkAdmin()
};

interface PerformanceTarget {
  good: number;
  acceptable: number;
  label: string;
  unit: string;
}

const PERFORMANCE_TARGETS: Record<string, PerformanceTarget> = {
  lcp: { good: 2500, acceptable: 4000, label: "LCP", unit: "ms" },
  fcp: { good: 1800, acceptable: 3000, label: "FCP", unit: "ms" },
  ttfb: { good: 800, acceptable: 1800, label: "TTFB", unit: "ms" },
  cls: { good: 0.1, acceptable: 0.25, label: "CLS", unit: "" },
  avgDuration: {
    good: 3000,
    acceptable: 5000,
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
      return "text-green-600 dark:text-green-400";
    case "acceptable":
      return "text-yellow-600 dark:text-yellow-400";
    case "poor":
      return "text-red-600 dark:text-red-400";
  }
}

function getRatingBgColor(rating: "good" | "acceptable" | "poor"): string {
  switch (rating) {
    case "good":
      return "bg-green-100 dark:bg-green-900/30";
    case "acceptable":
      return "bg-yellow-100 dark:bg-yellow-900/30";
    case "poor":
      return "bg-red-100 dark:bg-red-900/30";
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
  const adminCheck = createAsync(() => checkAdmin());

  const [timeWindow, setTimeWindow] = createSignal(7);
  const [selectedPath, setSelectedPath] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const summary = createAsync(async () => {
    try {
      setError(null);
      return await api.analytics.getSummary.query({ days: timeWindow() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
      return null;
    }
  });

  const pathStats = createAsync(async () => {
    const path = selectedPath();
    if (!path) return null;
    try {
      return await api.analytics.getPathStats.query({
        path,
        days: timeWindow()
      });
    } catch (e) {
      console.error("Failed to load path stats:", e);
      return null;
    }
  });

  return (
    <>
      <Title>Analytics Dashboard - Admin</Title>
      <div class="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-900">
        <div class="mx-auto max-w-7xl">
          <div class="mb-8">
            <h1 class="mb-2 text-4xl font-bold text-gray-900 dark:text-gray-100">
              Analytics Dashboard
            </h1>
            <p class="text-gray-600 dark:text-gray-400">
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
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {days === 1 ? "24h" : `${days}d`}
                </button>
              )}
            </For>
          </div>

          <Show when={error()}>
            <div class="mb-6 rounded-lg bg-red-100 p-4 text-red-800 dark:bg-red-900/30 dark:text-red-300">
              <p class="font-semibold">Error loading analytics</p>
              <p class="text-sm">{error()}</p>
            </div>
          </Show>

          <Show when={summary()}>
            {(data) => (
              <>
                {/* Overview Cards */}
                <div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
                    <div class="mb-1 text-sm text-gray-600 dark:text-gray-400">
                      Total Requests
                    </div>
                    <div class="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {formatNumber(data().totalVisits)}
                    </div>
                    <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {formatNumber(data().totalPageVisits)} pages,{" "}
                      {formatNumber(data().totalApiCalls)} API
                    </div>
                  </div>

                  <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
                    <div class="mb-1 text-sm text-gray-600 dark:text-gray-400">
                      Unique Visitors
                    </div>
                    <div class="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {formatNumber(data().uniqueVisitors)}
                    </div>
                  </div>

                  <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
                    <div class="mb-1 text-sm text-gray-600 dark:text-gray-400">
                      Authenticated Users
                    </div>
                    <div class="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {formatNumber(data().uniqueUsers)}
                    </div>
                  </div>

                  <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
                    <div class="mb-1 text-sm text-gray-600 dark:text-gray-400">
                      Avg. Visits/Day
                    </div>
                    <div class="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {formatNumber(data().totalVisits / timeWindow())}
                    </div>
                  </div>
                </div>

                {/* Top Pages */}
                <div class="mb-8 rounded-lg bg-white shadow dark:bg-gray-800">
                  <div class="border-b border-gray-200 p-6 dark:border-gray-700">
                    <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      Top Pages
                    </h2>
                  </div>
                  <div class="p-6">
                    <div class="space-y-3">
                      <For each={data().topPages}>
                        {(pathData) => {
                          const percentage =
                            (pathData.count / data().totalPageVisits) * 100;
                          return (
                            <div
                              class="cursor-pointer rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                              onClick={() => setSelectedPath(pathData.path)}
                            >
                              <div class="mb-2 flex items-center justify-between">
                                <span class="font-mono text-sm text-gray-900 dark:text-gray-100">
                                  {pathData.path}
                                </span>
                                <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                  {formatNumber(pathData.count)} visits
                                </span>
                              </div>
                              <div class="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                                <div
                                  class="h-2 rounded-full bg-blue-600"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
                <div class="mb-8 rounded-lg bg-white shadow dark:bg-gray-800">
                  <div class="border-b border-gray-200 p-6 dark:border-gray-700">
                    <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      Top API Calls
                    </h2>
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
                                <span class="font-mono text-xs break-all text-gray-900 dark:text-gray-100">
                                  {apiData.path}
                                </span>
                                <span class="ml-4 text-sm font-semibold whitespace-nowrap text-gray-900 dark:text-gray-100">
                                  {formatNumber(apiData.count)}
                                </span>
                              </div>
                              <div class="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                                <div
                                  class="h-2 rounded-full bg-purple-600"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
                  <div class="rounded-lg bg-white shadow dark:bg-gray-800">
                    <div class="border-b border-gray-200 p-6 dark:border-gray-700">
                      <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Device Types
                      </h2>
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
                                  <span class="text-sm text-gray-600 dark:text-gray-400">
                                    {formatNumber(device.count)} (
                                    {percentage.toFixed(1)}%)
                                  </span>
                                </div>
                                <div class="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
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
                  <div class="rounded-lg bg-white shadow dark:bg-gray-800">
                    <div class="border-b border-gray-200 p-6 dark:border-gray-700">
                      <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Browsers
                      </h2>
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
                                  <span class="text-sm text-gray-600 dark:text-gray-400">
                                    {formatNumber(browser.count)} (
                                    {percentage.toFixed(1)}%)
                                  </span>
                                </div>
                                <div class="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
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
                  <div class="mb-8 rounded-lg bg-white shadow dark:bg-gray-800">
                    <div class="border-b border-gray-200 p-6 dark:border-gray-700">
                      <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Top Referrers
                      </h2>
                    </div>
                    <div class="p-6">
                      <div class="space-y-2">
                        <For each={data().topReferrers}>
                          {(referrer) => (
                            <div class="flex justify-between border-b border-gray-100 py-2 dark:border-gray-700">
                              <span class="max-w-md truncate text-sm text-gray-700 dark:text-gray-300">
                                {referrer.referrer}
                              </span>
                              <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
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
              <div class="mb-8 rounded-lg bg-white shadow dark:bg-gray-800">
                <div class="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
                  <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Path Details: {selectedPath()}
                  </h2>
                  <button
                    onClick={() => setSelectedPath(null)}
                    class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>
                <div class="p-6">
                  <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <div class="text-sm text-gray-600 dark:text-gray-400">
                        Total Visits
                      </div>
                      <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {formatNumber(stats().totalVisits)}
                      </div>
                    </div>
                    <div>
                      <div class="text-sm text-gray-600 dark:text-gray-400">
                        Unique Visitors
                      </div>
                      <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {formatNumber(stats().uniqueVisitors)}
                      </div>
                    </div>
                    <div>
                      <div class="text-sm text-gray-600 dark:text-gray-400">
                        Avg. Duration
                      </div>
                      <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {stats().avgDurationMs
                          ? `${(stats().avgDurationMs! / 1000).toFixed(1)}s`
                          : "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* Visits by Day */}
                  <Show when={stats().visitsByDay.length > 0}>
                    <div class="mt-6">
                      <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
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
                                  <span class="text-sm text-gray-700 dark:text-gray-300">
                                    {new Date(day.date).toLocaleDateString()}
                                  </span>
                                  <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {formatNumber(day.count)}
                                  </span>
                                </div>
                                <div class="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
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
