#!/usr/bin/env bun
/**
 * Performance Test Comparison Tool
 *
 * Compares two performance test results and shows the differences
 */

import { readFileSync } from "fs";

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
  median: PerformanceMetrics;
}

interface TestOutput {
  timestamp: string;
  baseUrl: string;
  runsPerPage: number;
  results: TestResult[];
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

function formatDiff(value: number, unit: "ms" | "bytes" | "count"): string {
  const sign = value > 0 ? "+" : "";

  if (unit === "ms") {
    return value === 0 ? "→" : `${sign}${formatTime(Math.abs(value))}`;
  } else if (unit === "bytes") {
    return value === 0 ? "→" : `${sign}${formatBytes(Math.abs(value))}`;
  } else {
    return value === 0 ? "→" : `${sign}${value.toFixed(0)}`;
  }
}

function getImpact(value: number, threshold: number = 5): string {
  const percentChange = Math.abs(value);
  if (percentChange < threshold) return "";
  if (value < 0) return " 🎉"; // Improvement
  if (value > 0) return " ⚠️"; // Regression
  return "";
}

function calculatePercentChange(before: number, after: number): number {
  if (before === 0) return after === 0 ? 0 : 100;
  return ((after - before) / before) * 100;
}

function compareResults(baseline: TestOutput, optimized: TestOutput) {
  console.log("\n");
  console.log(
    "═══════════════════════════════════════════════════════════════════"
  );
  console.log(
    "              PERFORMANCE COMPARISON REPORT                         "
  );
  console.log(
    "═══════════════════════════════════════════════════════════════════"
  );
  console.log(`Baseline:  ${baseline.timestamp}`);
  console.log(`Optimized: ${optimized.timestamp}`);
  console.log(
    "───────────────────────────────────────────────────────────────────\n"
  );

  // Compare each page
  for (const baseResult of baseline.results) {
    const optResult = optimized.results.find((r) => r.page === baseResult.page);
    if (!optResult) continue;

    const base = baseResult.median;
    const opt = optResult.median;

    console.log(`\n📄 ${baseResult.page}`);
    console.log("─".repeat(70));

    // Core Web Vitals
    console.log("\n  Core Web Vitals:");

    const fcpDiff = opt.fcp - base.fcp;
    const fcpPercent = calculatePercentChange(base.fcp, opt.fcp);
    console.log(
      `    FCP:  ${formatTime(base.fcp)} → ${formatTime(opt.fcp)} (${formatDiff(fcpDiff, "ms")}, ${fcpPercent.toFixed(1)}%)${getImpact(fcpPercent)}`
    );

    const clsDiff = opt.cls - base.cls;
    console.log(
      `    CLS:  ${base.cls.toFixed(3)} → ${opt.cls.toFixed(3)} (${formatDiff(clsDiff * 1000, "ms")})`
    );

    // Loading Metrics
    console.log("\n  Loading Metrics:");

    const ttfbDiff = opt.ttfb - base.ttfb;
    const ttfbPercent = calculatePercentChange(base.ttfb, opt.ttfb);
    console.log(
      `    TTFB: ${formatTime(base.ttfb)} → ${formatTime(opt.ttfb)} (${formatDiff(ttfbDiff, "ms")}, ${ttfbPercent.toFixed(1)}%)${getImpact(ttfbPercent)}`
    );

    const dclDiff = opt.domContentLoaded - base.domContentLoaded;
    const dclPercent = calculatePercentChange(
      base.domContentLoaded,
      opt.domContentLoaded
    );
    console.log(
      `    DCL:  ${formatTime(base.domContentLoaded)} → ${formatTime(opt.domContentLoaded)} (${formatDiff(dclDiff, "ms")}, ${dclPercent.toFixed(1)}%)${getImpact(dclPercent)}`
    );

    const loadDiff = opt.loadComplete - base.loadComplete;
    const loadPercent = calculatePercentChange(
      base.loadComplete,
      opt.loadComplete
    );
    console.log(
      `    Load: ${formatTime(base.loadComplete)} → ${formatTime(opt.loadComplete)} (${formatDiff(loadDiff, "ms")}, ${loadPercent.toFixed(1)}%)${getImpact(loadPercent)}`
    );

    // Resource Loading
    console.log("\n  Resources:");

    const reqDiff = opt.totalRequests - base.totalRequests;
    const reqPercent = calculatePercentChange(
      base.totalRequests,
      opt.totalRequests
    );
    console.log(
      `    Requests:     ${base.totalRequests} → ${opt.totalRequests} (${formatDiff(reqDiff, "count")}, ${reqPercent.toFixed(1)}%)${getImpact(reqPercent, 10)}`
    );

    const bytesDiff = opt.totalBytes - base.totalBytes;
    const bytesPercent = calculatePercentChange(
      base.totalBytes,
      opt.totalBytes
    );
    console.log(
      `    Total Size:   ${formatBytes(base.totalBytes)} → ${formatBytes(opt.totalBytes)} (${formatDiff(bytesDiff, "bytes")}, ${bytesPercent.toFixed(1)}%)${getImpact(bytesPercent, 10)}`
    );

    const jsDiff = opt.jsBytes - base.jsBytes;
    const jsPercent = calculatePercentChange(base.jsBytes, opt.jsBytes);
    console.log(
      `    JS Size:      ${formatBytes(base.jsBytes)} → ${formatBytes(opt.jsBytes)} (${formatDiff(jsDiff, "bytes")}, ${jsPercent.toFixed(1)}%)${getImpact(jsPercent, 10)}`
    );

    const jsReqDiff = opt.jsRequests - base.jsRequests;
    const jsReqPercent = calculatePercentChange(
      base.jsRequests,
      opt.jsRequests
    );
    console.log(
      `    JS Requests:  ${base.jsRequests} → ${opt.jsRequests} (${formatDiff(jsReqDiff, "count")}, ${jsReqPercent.toFixed(1)}%)${getImpact(jsReqPercent, 10)}`
    );
  }

  // Overall Summary
  console.log(
    "\n\n═══════════════════════════════════════════════════════════════════"
  );
  console.log(
    "                      OVERALL SUMMARY                              "
  );
  console.log(
    "═══════════════════════════════════════════════════════════════════\n"
  );

  const baseAvg = {
    fcp:
      baseline.results.reduce((sum, r) => sum + r.median.fcp, 0) /
      baseline.results.length,
    ttfb:
      baseline.results.reduce((sum, r) => sum + r.median.ttfb, 0) /
      baseline.results.length,
    dcl:
      baseline.results.reduce((sum, r) => sum + r.median.domContentLoaded, 0) /
      baseline.results.length,
    load:
      baseline.results.reduce((sum, r) => sum + r.median.loadComplete, 0) /
      baseline.results.length,
    requests:
      baseline.results.reduce((sum, r) => sum + r.median.totalRequests, 0) /
      baseline.results.length,
    bytes:
      baseline.results.reduce((sum, r) => sum + r.median.totalBytes, 0) /
      baseline.results.length,
    jsBytes:
      baseline.results.reduce((sum, r) => sum + r.median.jsBytes, 0) /
      baseline.results.length,
    jsRequests:
      baseline.results.reduce((sum, r) => sum + r.median.jsRequests, 0) /
      baseline.results.length
  };

  const optAvg = {
    fcp:
      optimized.results.reduce((sum, r) => sum + r.median.fcp, 0) /
      optimized.results.length,
    ttfb:
      optimized.results.reduce((sum, r) => sum + r.median.ttfb, 0) /
      optimized.results.length,
    dcl:
      optimized.results.reduce((sum, r) => sum + r.median.domContentLoaded, 0) /
      optimized.results.length,
    load:
      optimized.results.reduce((sum, r) => sum + r.median.loadComplete, 0) /
      optimized.results.length,
    requests:
      optimized.results.reduce((sum, r) => sum + r.median.totalRequests, 0) /
      optimized.results.length,
    bytes:
      optimized.results.reduce((sum, r) => sum + r.median.totalBytes, 0) /
      optimized.results.length,
    jsBytes:
      optimized.results.reduce((sum, r) => sum + r.median.jsBytes, 0) /
      optimized.results.length,
    jsRequests:
      optimized.results.reduce((sum, r) => sum + r.median.jsRequests, 0) /
      optimized.results.length
  };

  console.log("  Average Across All Pages:\n");

  const metrics = [
    { name: "FCP", base: baseAvg.fcp, opt: optAvg.fcp, unit: "ms" as const },
    { name: "TTFB", base: baseAvg.ttfb, opt: optAvg.ttfb, unit: "ms" as const },
    {
      name: "DOM Content Loaded",
      base: baseAvg.dcl,
      opt: optAvg.dcl,
      unit: "ms" as const
    },
    {
      name: "Load Complete",
      base: baseAvg.load,
      opt: optAvg.load,
      unit: "ms" as const
    },
    {
      name: "Total Requests",
      base: baseAvg.requests,
      opt: optAvg.requests,
      unit: "count" as const
    },
    {
      name: "Total Size",
      base: baseAvg.bytes,
      opt: optAvg.bytes,
      unit: "bytes" as const
    },
    {
      name: "JS Size",
      base: baseAvg.jsBytes,
      opt: optAvg.jsBytes,
      unit: "bytes" as const
    },
    {
      name: "JS Requests",
      base: baseAvg.jsRequests,
      opt: optAvg.jsRequests,
      unit: "count" as const
    }
  ];

  metrics.forEach((metric) => {
    const diff = metric.opt - metric.base;
    const percent = calculatePercentChange(metric.base, metric.opt);
    const baseStr =
      metric.unit === "bytes"
        ? formatBytes(metric.base)
        : metric.unit === "ms"
          ? formatTime(metric.base)
          : metric.base.toFixed(1);
    const optStr =
      metric.unit === "bytes"
        ? formatBytes(metric.opt)
        : metric.unit === "ms"
          ? formatTime(metric.opt)
          : metric.opt.toFixed(1);

    console.log(
      `    ${metric.name.padEnd(20)} ${baseStr.padEnd(10)} → ${optStr.padEnd(10)} (${formatDiff(diff, metric.unit).padEnd(12)}, ${percent.toFixed(1).padStart(6)}%)${getImpact(percent, 5)}`
    );
  });

  console.log("\n  Key Findings:\n");

  let improvements = 0;
  let regressions = 0;

  metrics.forEach((metric) => {
    const percent = calculatePercentChange(metric.base, metric.opt);
    if (Math.abs(percent) >= 5) {
      if (percent < 0) improvements++;
      else regressions++;
    }
  });

  if (improvements > 0) {
    console.log(
      `    ✅ ${improvements} significant improvement${improvements === 1 ? "" : "s"}`
    );
  }
  if (regressions > 0) {
    console.log(
      `    ⚠️  ${regressions} significant regression${regressions === 1 ? "" : "s"}`
    );
  }

  // Specific findings
  const reqPercent = calculatePercentChange(baseAvg.requests, optAvg.requests);
  if (reqPercent < -5) {
    console.log(
      `    🎯 Reduced HTTP requests by ${Math.abs(reqPercent).toFixed(1)}%`
    );
  }

  const jsPercent = calculatePercentChange(baseAvg.jsBytes, optAvg.jsBytes);
  if (jsPercent < -5) {
    console.log(
      `    📦 Reduced JS bundle size by ${Math.abs(jsPercent).toFixed(1)}%`
    );
  }

  const loadPercent = calculatePercentChange(baseAvg.load, optAvg.load);
  if (Math.abs(loadPercent) < 5) {
    console.log(
      `    ⚖️  Load time remained stable (${Math.abs(loadPercent).toFixed(1)}% change)`
    );
  }

  console.log("\n");
}

function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error("Usage: bun run compare.ts <baseline.json> <optimized.json>");
    process.exit(1);
  }

  const [baselinePath, optimizedPath] = args;

  try {
    const baseline: TestOutput = JSON.parse(
      readFileSync(baselinePath, "utf-8")
    );
    const optimized: TestOutput = JSON.parse(
      readFileSync(optimizedPath, "utf-8")
    );

    compareResults(baseline, optimized);
  } catch (error) {
    console.error("Error reading or parsing files:", error);
    process.exit(1);
  }
}

main();
