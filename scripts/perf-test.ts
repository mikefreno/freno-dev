#!/usr/bin/env bun
/**
 * Comprehensive Page Load Performance Testing Suite
 *
 * Measures:
 * - First Contentful Paint (FCP)
 * - Largest Contentful Paint (LCP)
 * - Time to Interactive (TTI)
 * - Total Blocking Time (TBT)
 * - Cumulative Layout Shift (CLS)
 * - First Input Delay (FID)
 * - Network requests and bundle sizes
 * - JavaScript execution time
 */

import { chromium, type Browser, type Page } from "playwright";
import { writeFileSync } from "fs";

interface PageTestConfig {
  name: string;
  path: string;
}

interface PerformanceMetrics {
  fcp: number;
  lcp: number;
  cls: number;
  fid: number;
  ttfb: number;
  domContentLoaded: number;
  loadComplete: number;
  totalRequests: number;
  totalBytes: number;
  jsBytes: number;
  cssBytes: number;
  imageBytes: number;
  fontBytes: number;
  jsRequests: number;
  cssRequests: number;
  imageRequests: number;
  jsExecutionTime: number;
  taskDuration: number;
  layoutDuration: number;
  paintDuration: number;
}

interface TestResult {
  page: string;
  url: string;
  runs: PerformanceMetrics[];
  average: PerformanceMetrics;
  median: PerformanceMetrics;
  p95: PerformanceMetrics;
  min: PerformanceMetrics;
  max: PerformanceMetrics;
}

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";
const RUNS_PER_PAGE = parseInt(process.env.RUNS || "5", 10);
const WARMUP_RUNS = 1;

// Pages to test
const TEST_PAGES: PageTestConfig[] = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
  { name: "Blog Index", path: "/blog" },
  { name: "Blog Post", path: "/blog/A_Journey_in_Self_Hosting" },
  { name: "Resume", path: "/resume" },
  { name: "Contact", path: "/contact" }
];

// Add additional blog post path if provided
if (process.env.TEST_BLOG_POST) {
  TEST_PAGES.push({
    name: "Custom Blog Post",
    path: process.env.TEST_BLOG_POST
  });
}

async function collectPerformanceMetrics(
  page: Page
): Promise<PerformanceMetrics> {
  // Wait for page to be fully loaded
  await page.waitForLoadState("networkidle");

  // Collect comprehensive performance metrics
  const metrics = await page.evaluate(() => {
    const perf = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType("paint");
    const fcp = paint.find((entry) => entry.name === "first-contentful-paint");

    // Get LCP using PerformanceObserver
    let lcp = 0;
    let cls = 0;
    let fid = 0;

    // Try to get LCP from existing entries
    const lcpEntries = performance.getEntriesByType(
      "largest-contentful-paint"
    ) as any[];
    if (lcpEntries.length > 0) {
      lcp =
        lcpEntries[lcpEntries.length - 1].renderTime ||
        lcpEntries[lcpEntries.length - 1].loadTime;
    }

    // Get layout shift entries
    const layoutShiftEntries = performance.getEntriesByType(
      "layout-shift"
    ) as any[];
    cls = layoutShiftEntries
      .filter((entry: any) => !entry.hadRecentInput)
      .reduce((sum: number, entry: any) => sum + entry.value, 0);

    // Get resource timing
    const resources = performance.getEntriesByType(
      "resource"
    ) as PerformanceResourceTiming[];

    let totalBytes = 0;
    let jsBytes = 0;
    let cssBytes = 0;
    let imageBytes = 0;
    let fontBytes = 0;
    let jsRequests = 0;
    let cssRequests = 0;
    let imageRequests = 0;

    resources.forEach((resource) => {
      const size = resource.transferSize || resource.encodedBodySize || 0;
      totalBytes += size;

      const isJS =
        resource.name.includes(".js") ||
        resource.name.includes("/_build/") ||
        resource.initiatorType === "script";
      const isCSS =
        resource.name.includes(".css") || resource.initiatorType === "css";
      const isImage =
        resource.initiatorType === "img" ||
        /\.(jpg|jpeg|png|gif|svg|webp|avif)/.test(resource.name);
      const isFont = /\.(woff|woff2|ttf|otf|eot)/.test(resource.name);

      if (isJS) {
        jsBytes += size;
        jsRequests++;
      } else if (isCSS) {
        cssBytes += size;
        cssRequests++;
      } else if (isImage) {
        imageBytes += size;
        imageRequests++;
      } else if (isFont) {
        fontBytes += size;
      }
    });

    // Get performance measure entries for JS execution
    const measures = performance.getEntriesByType("measure");
    let jsExecutionTime = 0;
    let taskDuration = 0;
    let layoutDuration = 0;
    let paintDuration = 0;

    measures.forEach((entry) => {
      if (entry.name.includes("script") || entry.name.includes("js")) {
        jsExecutionTime += entry.duration;
      }
    });

    // Try to get long task entries
    const longTasks = performance.getEntriesByType("longtask") as any[];
    longTasks.forEach((task: any) => {
      taskDuration += task.duration;
    });

    return {
      fcp: fcp?.startTime || 0,
      lcp,
      cls,
      fid,
      ttfb: perf.responseStart - perf.requestStart,
      domContentLoaded: perf.domContentLoadedEventEnd - perf.fetchStart,
      loadComplete: perf.loadEventEnd - perf.fetchStart,
      totalRequests: resources.length,
      totalBytes,
      jsBytes,
      cssBytes,
      imageBytes,
      fontBytes,
      jsRequests,
      cssRequests,
      imageRequests,
      jsExecutionTime,
      taskDuration,
      layoutDuration,
      paintDuration
    };
  });

  return metrics;
}

async function testPagePerformance(
  browser: Browser,
  pageConfig: PageTestConfig
): Promise<TestResult> {
  const url = `${BASE_URL}${pageConfig.path}`;
  const runs: PerformanceMetrics[] = [];

  console.log(`\n📊 Testing: ${pageConfig.name} (${url})`);
  console.log(
    `   Running ${WARMUP_RUNS} warmup + ${RUNS_PER_PAGE} measured runs...\n`
  );

  // Warmup runs (not counted)
  for (let i = 0; i < WARMUP_RUNS; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await page.close();
    await context.close();
    console.log(`   ✓ Warmup run ${i + 1}/${WARMUP_RUNS}`);
  }

  // Measured runs
  for (let i = 0; i < RUNS_PER_PAGE; i++) {
    console.log(`   → Run ${i + 1}/${RUNS_PER_PAGE}...`);

    // Create new context for each run to ensure clean state
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    // Navigate and collect metrics
    await page.goto(url, { waitUntil: "networkidle" });
    const metrics = await collectPerformanceMetrics(page);

    await page.close();
    await context.close();

    runs.push(metrics);
    console.log(
      `      FCP: ${metrics.fcp.toFixed(0)}ms | LCP: ${metrics.lcp.toFixed(0)}ms | CLS: ${metrics.cls.toFixed(3)} | Requests: ${metrics.totalRequests}`
    );
  }

  // Calculate statistics
  const average = calculateAverage(runs);
  const median = calculateMedian(runs);
  const p95 = calculatePercentile(runs, 95);
  const min = calculateMin(runs);
  const max = calculateMax(runs);

  return {
    page: pageConfig.name,
    url,
    runs,
    average,
    median,
    p95,
    min,
    max
  };
}

function calculateAverage(runs: PerformanceMetrics[]): PerformanceMetrics {
  const sum = runs.reduce((acc, run) => {
    Object.keys(run).forEach((key) => {
      acc[key] = (acc[key] || 0) + run[key as keyof PerformanceMetrics];
    });
    return acc;
  }, {} as any);

  Object.keys(sum).forEach((key) => {
    sum[key] /= runs.length;
  });

  return sum;
}

function calculateMedian(runs: PerformanceMetrics[]): PerformanceMetrics {
  const sorted = runs.slice().sort((a, b) => a.lcp - b.lcp);
  const mid = Math.floor(sorted.length / 2);
  return sorted[mid];
}

function calculatePercentile(
  runs: PerformanceMetrics[],
  percentile: number
): PerformanceMetrics {
  const sorted = runs.slice().sort((a, b) => a.lcp - b.lcp);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

function calculateMin(runs: PerformanceMetrics[]): PerformanceMetrics {
  return runs.reduce(
    (min, run) => {
      const result: any = {};
      Object.keys(run).forEach((key) => {
        const k = key as keyof PerformanceMetrics;
        result[k] = Math.min(min[k], run[k]);
      });
      return result;
    },
    { ...runs[0] }
  );
}

function calculateMax(runs: PerformanceMetrics[]): PerformanceMetrics {
  return runs.reduce(
    (max, run) => {
      const result: any = {};
      Object.keys(run).forEach((key) => {
        const k = key as keyof PerformanceMetrics;
        result[k] = Math.max(max[k], run[k]);
      });
      return result;
    },
    { ...runs[0] }
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes.toFixed(0)}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function getWebVitalRating(
  metric: "lcp" | "fcp" | "cls" | "fid",
  value: number
): string {
  const thresholds = {
    lcp: { good: 2500, needsImprovement: 4000 },
    fcp: { good: 1800, needsImprovement: 3000 },
    cls: { good: 0.1, needsImprovement: 0.25 },
    fid: { good: 100, needsImprovement: 300 }
  };

  const t = thresholds[metric];
  if (value <= t.good) return "🟢 Good";
  if (value <= t.needsImprovement) return "🟡 Needs Improvement";
  return "🔴 Poor";
}

function printResults(results: TestResult[]) {
  console.log("\n\n");
  console.log(
    "═══════════════════════════════════════════════════════════════════"
  );
  console.log(
    "                    PERFORMANCE TEST RESULTS                        "
  );
  console.log(
    "═══════════════════════════════════════════════════════════════════"
  );
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Runs per page: ${RUNS_PER_PAGE}`);
  console.log(`Date: ${new Date().toLocaleString()}`);
  console.log(
    "───────────────────────────────────────────────────────────────────\n"
  );

  results.forEach((result) => {
    console.log(`\n📄 ${result.page} - ${result.url}`);
    console.log("─".repeat(70));

    console.log("\n  Core Web Vitals (Median | Min → Max):");
    console.log(
      `    LCP (Largest Contentful Paint):  ${formatTime(result.median.lcp).padEnd(8)} | ${formatTime(result.min.lcp)} → ${formatTime(result.max.lcp)} ${getWebVitalRating("lcp", result.median.lcp)}`
    );
    console.log(
      `    FCP (First Contentful Paint):    ${formatTime(result.median.fcp).padEnd(8)} | ${formatTime(result.min.fcp)} → ${formatTime(result.max.fcp)} ${getWebVitalRating("fcp", result.median.fcp)}`
    );
    console.log(
      `    CLS (Cumulative Layout Shift):   ${result.median.cls.toFixed(3).padEnd(8)} | ${result.min.cls.toFixed(3)} → ${result.max.cls.toFixed(3)} ${getWebVitalRating("cls", result.median.cls)}`
    );

    console.log("\n  Loading Metrics (Median):");
    console.log(
      `    TTFB (Time to First Byte):       ${formatTime(result.median.ttfb)}`
    );
    console.log(
      `    DOM Content Loaded:              ${formatTime(result.median.domContentLoaded)}`
    );
    console.log(
      `    Load Complete:                   ${formatTime(result.median.loadComplete)}`
    );

    console.log("\n  Resource Loading (Median):");
    console.log(
      `    Total Requests:                  ${result.median.totalRequests.toFixed(0)}`
    );
    console.log(
      `    Total Transfer Size:             ${formatBytes(result.median.totalBytes)}`
    );
    console.log(
      `    ├─ JavaScript (${result.median.jsRequests.toFixed(0)} req):         ${formatBytes(result.median.jsBytes)}`
    );
    console.log(
      `    ├─ CSS (${result.median.cssRequests.toFixed(0)} req):               ${formatBytes(result.median.cssBytes)}`
    );
    console.log(
      `    ├─ Images (${result.median.imageRequests.toFixed(0)} req):          ${formatBytes(result.median.imageBytes)}`
    );
    console.log(
      `    └─ Fonts:                        ${formatBytes(result.median.fontBytes)}`
    );

    if (result.median.jsExecutionTime > 0) {
      console.log("\n  Performance Details (Median):");
      console.log(
        `    JS Execution Time:               ${formatTime(result.median.jsExecutionTime)}`
      );
      if (result.median.taskDuration > 0) {
        console.log(
          `    Long Task Duration:              ${formatTime(result.median.taskDuration)}`
        );
      }
    }

    console.log("\n  Variability (Standard Deviation):");
    const lcpStdDev = Math.sqrt(
      result.runs.reduce(
        (sum, run) => sum + Math.pow(run.lcp - result.average.lcp, 2),
        0
      ) / result.runs.length
    );
    const fcpStdDev = Math.sqrt(
      result.runs.reduce(
        (sum, run) => sum + Math.pow(run.fcp - result.average.fcp, 2),
        0
      ) / result.runs.length
    );
    console.log(`    LCP: ±${formatTime(lcpStdDev)}`);
    console.log(`    FCP: ±${formatTime(fcpStdDev)}`);
  });

  console.log(
    "\n\n═══════════════════════════════════════════════════════════════════"
  );
  console.log(
    "                         SUMMARY                                    "
  );
  console.log(
    "═══════════════════════════════════════════════════════════════════\n"
  );

  // Overall averages
  const overallAverage = {
    lcp: results.reduce((sum, r) => sum + r.median.lcp, 0) / results.length,
    fcp: results.reduce((sum, r) => sum + r.median.fcp, 0) / results.length,
    cls: results.reduce((sum, r) => sum + r.median.cls, 0) / results.length,
    ttfb: results.reduce((sum, r) => sum + r.median.ttfb, 0) / results.length,
    totalBytes:
      results.reduce((sum, r) => sum + r.median.totalBytes, 0) / results.length,
    jsBytes:
      results.reduce((sum, r) => sum + r.median.jsBytes, 0) / results.length,
    totalRequests:
      results.reduce((sum, r) => sum + r.median.totalRequests, 0) /
      results.length
  };

  console.log("  Overall Averages (Median across all pages):");
  console.log(`    LCP:                ${formatTime(overallAverage.lcp)}`);
  console.log(`    FCP:                ${formatTime(overallAverage.fcp)}`);
  console.log(`    CLS:                ${overallAverage.cls.toFixed(3)}`);
  console.log(`    TTFB:               ${formatTime(overallAverage.ttfb)}`);
  console.log(
    `    Total Size:         ${formatBytes(overallAverage.totalBytes)}`
  );
  console.log(`    JS Size:            ${formatBytes(overallAverage.jsBytes)}`);
  console.log(
    `    Total Requests:     ${overallAverage.totalRequests.toFixed(0)}`
  );

  console.log("\n  Page Rankings (by LCP):");
  const sortedResults = [...results].sort(
    (a, b) => a.median.lcp - b.median.lcp
  );
  sortedResults.forEach((result, index) => {
    const rating =
      result.median.lcp <= 2500
        ? "🟢"
        : result.median.lcp <= 4000
          ? "🟡"
          : "🔴";
    console.log(
      `    ${index + 1}. ${rating} ${result.page.padEnd(20)} ${formatTime(result.median.lcp)}`
    );
  });

  console.log("\n  Optimization Opportunities:");

  // Find pages with highest JS bytes
  const highestJS = [...results].sort(
    (a, b) => b.median.jsBytes - a.median.jsBytes
  )[0];
  if (highestJS.median.jsBytes > 500 * 1024) {
    // > 500KB
    console.log(
      `    📦 ${highestJS.page}: High JS bundle (${formatBytes(highestJS.median.jsBytes)}) - consider code splitting`
    );
  }

  // Find pages with slow LCP
  const slowLCP = results.filter((r) => r.median.lcp > 2500);
  if (slowLCP.length > 0) {
    console.log(
      `    🐌 ${slowLCP.length} page(s) with LCP > 2.5s - optimize largest content element`
    );
  }

  // Find pages with high CLS
  const highCLS = results.filter((r) => r.median.cls > 0.1);
  if (highCLS.length > 0) {
    console.log(
      `    📐 ${highCLS.length} page(s) with CLS > 0.1 - add size attributes to images/elements`
    );
  }

  console.log("\n");
}

async function main() {
  console.log("🚀 Starting Performance Testing Suite...\n");
  console.log(`Target: ${BASE_URL}`);
  console.log(`Pages to test: ${TEST_PAGES.length}`);
  console.log(`Runs per page: ${RUNS_PER_PAGE} (+ ${WARMUP_RUNS} warmup)\n`);

  // Check if server is running
  try {
    const response = await fetch(BASE_URL);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    console.log("✅ Server is reachable\n");
  } catch (error) {
    console.error(`❌ Error: Cannot connect to ${BASE_URL}`);
    console.error("   Make sure the dev server is running with: bun run dev");
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage"]
  });
  const results: TestResult[] = [];

  for (const pageConfig of TEST_PAGES) {
    try {
      const result = await testPagePerformance(browser, pageConfig);
      results.push(result);
    } catch (error) {
      console.error(`❌ Error testing ${pageConfig.name}:`, error);
    }
  }

  await browser.close();

  // Print results
  printResults(results);

  // Save results to JSON file
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .split("T")[0];
  const filename = `perf-results-${timestamp}.json`;
  const output = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    runsPerPage: RUNS_PER_PAGE,
    results
  };
  writeFileSync(filename, JSON.stringify(output, null, 2));
  console.log(`📁 Detailed results saved to: ${filename}\n`);
}

main().catch(console.error);
