import { ConnectionFactory } from "./database";
import { v4 as uuid } from "uuid";
import type { VisitorAnalytics, AnalyticsQuery } from "~/db/types";

export interface AnalyticsEntry {
  userId?: string | null;
  path: string;
  method: string;
  referrer?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  country?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;
  sessionId?: string | null;
  durationMs?: number | null;
  fcp?: number | null;
  lcp?: number | null;
  cls?: number | null;
  fid?: number | null;
  inp?: number | null;
  ttfb?: number | null;
  domLoad?: number | null;
  loadComplete?: number | null;
}

export async function logVisit(entry: AnalyticsEntry): Promise<void> {
  try {
    const conn = ConnectionFactory();
    await conn.execute({
      sql: `INSERT INTO VisitorAnalytics (
        id, user_id, path, method, referrer, user_agent, ip_address, 
        country, device_type, browser, os, session_id, duration_ms,
        fcp, lcp, cls, fid, inp, ttfb, dom_load, load_complete
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        uuid(),
        entry.userId || null,
        entry.path,
        entry.method,
        entry.referrer || null,
        entry.userAgent || null,
        entry.ipAddress || null,
        entry.country || null,
        entry.deviceType || null,
        entry.browser || null,
        entry.os || null,
        entry.sessionId || null,
        entry.durationMs || null,
        entry.fcp || null,
        entry.lcp || null,
        entry.cls || null,
        entry.fid || null,
        entry.inp || null,
        entry.ttfb || null,
        entry.domLoad || null,
        entry.loadComplete || null
      ]
    });
  } catch (error) {
    console.error("Failed to log visitor analytics:", error, entry);
  }
}

export async function queryAnalytics(
  query: AnalyticsQuery
): Promise<VisitorAnalytics[]> {
  const conn = ConnectionFactory();

  let sql = "SELECT * FROM VisitorAnalytics WHERE 1=1";
  const args: any[] = [];

  if (query.userId) {
    sql += " AND user_id = ?";
    args.push(query.userId);
  }

  if (query.path) {
    sql += " AND path = ?";
    args.push(query.path);
  }

  if (query.startDate) {
    sql += " AND created_at >= ?";
    args.push(
      typeof query.startDate === "string"
        ? query.startDate
        : query.startDate.toISOString()
    );
  }

  if (query.endDate) {
    sql += " AND created_at <= ?";
    args.push(
      typeof query.endDate === "string"
        ? query.endDate
        : query.endDate.toISOString()
    );
  }

  sql += " ORDER BY created_at DESC";

  if (query.limit) {
    sql += " LIMIT ?";
    args.push(query.limit);
  }

  if (query.offset) {
    sql += " OFFSET ?";
    args.push(query.offset);
  }

  const result = await conn.execute({ sql, args });
  return result.rows.map((row) => ({
    id: row.id as string,
    user_id: row.user_id as string | null,
    path: row.path as string,
    method: row.method as string,
    referrer: row.referrer as string | null,
    user_agent: row.user_agent as string | null,
    ip_address: row.ip_address as string | null,
    country: row.country as string | null,
    device_type: row.device_type as string | null,
    browser: row.browser as string | null,
    os: row.os as string | null,
    session_id: row.session_id as string | null,
    duration_ms: row.duration_ms as number | null,
    created_at: row.created_at as string
  }));
}

export async function getAnalyticsSummary(days: number = 30): Promise<{
  totalVisits: number;
  totalPageVisits: number;
  totalApiCalls: number;
  uniqueVisitors: number;
  uniqueUsers: number;
  topPages: Array<{ path: string; count: number }>;
  topApiCalls: Array<{ path: string; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  deviceTypes: Array<{ type: string; count: number }>;
  browsers: Array<{ browser: string; count: number }>;
}> {
  const conn = ConnectionFactory();

  const totalVisitsResult = await conn.execute({
    sql: `SELECT COUNT(*) as count FROM VisitorAnalytics 
          WHERE created_at >= datetime('now', '-${days} days')`,
    args: []
  });
  const totalVisits = (totalVisitsResult.rows[0]?.count as number) || 0;

  const totalPageVisitsResult = await conn.execute({
    sql: `SELECT COUNT(*) as count FROM VisitorAnalytics 
          WHERE created_at >= datetime('now', '-${days} days')
          AND path NOT LIKE '/api/%'`,
    args: []
  });
  const totalPageVisits = (totalPageVisitsResult.rows[0]?.count as number) || 0;

  const totalApiCallsResult = await conn.execute({
    sql: `SELECT COUNT(*) as count FROM VisitorAnalytics 
          WHERE created_at >= datetime('now', '-${days} days')
          AND path LIKE '/api/%'`,
    args: []
  });
  const totalApiCalls = (totalApiCallsResult.rows[0]?.count as number) || 0;

  const uniqueVisitorsResult = await conn.execute({
    sql: `SELECT COUNT(DISTINCT ip_address) as count FROM VisitorAnalytics 
          WHERE ip_address IS NOT NULL 
          AND created_at >= datetime('now', '-${days} days')`,
    args: []
  });
  const uniqueVisitors = (uniqueVisitorsResult.rows[0]?.count as number) || 0;

  const uniqueUsersResult = await conn.execute({
    sql: `SELECT COUNT(DISTINCT user_id) as count FROM VisitorAnalytics 
          WHERE user_id IS NOT NULL 
          AND created_at >= datetime('now', '-${days} days')`,
    args: []
  });
  const uniqueUsers = (uniqueUsersResult.rows[0]?.count as number) || 0;

  const topPagesResult = await conn.execute({
    sql: `SELECT path, COUNT(*) as count FROM VisitorAnalytics 
          WHERE created_at >= datetime('now', '-${days} days')
          AND path NOT LIKE '/api/%'
          GROUP BY path 
          ORDER BY count DESC 
          LIMIT 10`,
    args: []
  });
  const topPages = topPagesResult.rows.map((row) => ({
    path: row.path as string,
    count: row.count as number
  }));

  const topApiCallsResult = await conn.execute({
    sql: `SELECT path, COUNT(*) as count FROM VisitorAnalytics 
          WHERE created_at >= datetime('now', '-${days} days')
          AND path LIKE '/api/%'
          GROUP BY path 
          ORDER BY count DESC 
          LIMIT 10`,
    args: []
  });
  const topApiCalls = topApiCallsResult.rows.map((row) => ({
    path: row.path as string,
    count: row.count as number
  }));

  const topReferrersResult = await conn.execute({
    sql: `SELECT referrer, COUNT(*) as count FROM VisitorAnalytics 
          WHERE referrer IS NOT NULL 
          AND created_at >= datetime('now', '-${days} days')
          GROUP BY referrer 
          ORDER BY count DESC 
          LIMIT 10`,
    args: []
  });
  const topReferrers = topReferrersResult.rows.map((row) => ({
    referrer: row.referrer as string,
    count: row.count as number
  }));

  const deviceTypesResult = await conn.execute({
    sql: `SELECT device_type, COUNT(*) as count FROM VisitorAnalytics 
          WHERE device_type IS NOT NULL 
          AND created_at >= datetime('now', '-${days} days')
          GROUP BY device_type 
          ORDER BY count DESC`,
    args: []
  });
  const deviceTypes = deviceTypesResult.rows.map((row) => ({
    type: row.device_type as string,
    count: row.count as number
  }));

  const browsersResult = await conn.execute({
    sql: `SELECT browser, COUNT(*) as count FROM VisitorAnalytics 
          WHERE browser IS NOT NULL 
          AND created_at >= datetime('now', '-${days} days')
          GROUP BY browser 
          ORDER BY count DESC 
          LIMIT 10`,
    args: []
  });
  const browsers = browsersResult.rows.map((row) => ({
    browser: row.browser as string,
    count: row.count as number
  }));

  return {
    totalVisits,
    totalPageVisits,
    totalApiCalls,
    uniqueVisitors,
    uniqueUsers,
    topPages,
    topApiCalls,
    topReferrers,
    deviceTypes,
    browsers
  };
}

export async function getPathAnalytics(
  path: string,
  days: number = 30
): Promise<{
  totalVisits: number;
  uniqueVisitors: number;
  avgDurationMs: number | null;
  visitsByDay: Array<{ date: string; count: number }>;
}> {
  const conn = ConnectionFactory();

  const totalVisitsResult = await conn.execute({
    sql: `SELECT COUNT(*) as count FROM VisitorAnalytics 
          WHERE path = ? 
          AND created_at >= datetime('now', '-${days} days')`,
    args: [path]
  });
  const totalVisits = (totalVisitsResult.rows[0]?.count as number) || 0;

  const uniqueVisitorsResult = await conn.execute({
    sql: `SELECT COUNT(DISTINCT ip_address) as count FROM VisitorAnalytics 
          WHERE path = ? 
          AND ip_address IS NOT NULL 
          AND created_at >= datetime('now', '-${days} days')`,
    args: [path]
  });
  const uniqueVisitors = (uniqueVisitorsResult.rows[0]?.count as number) || 0;

  const avgDurationResult = await conn.execute({
    sql: `SELECT AVG(duration_ms) as avg FROM VisitorAnalytics 
          WHERE path = ? 
          AND duration_ms IS NOT NULL 
          AND created_at >= datetime('now', '-${days} days')`,
    args: [path]
  });
  const avgDurationMs = avgDurationResult.rows[0]?.avg as number | null;

  const visitsByDayResult = await conn.execute({
    sql: `SELECT DATE(created_at) as date, COUNT(*) as count 
          FROM VisitorAnalytics 
          WHERE path = ? 
          AND created_at >= datetime('now', '-${days} days')
          GROUP BY DATE(created_at) 
          ORDER BY date DESC`,
    args: [path]
  });
  const visitsByDay = visitsByDayResult.rows.map((row) => ({
    date: row.date as string,
    count: row.count as number
  }));

  return {
    totalVisits,
    uniqueVisitors,
    avgDurationMs,
    visitsByDay
  };
}

export async function getPerformanceStats(days: number = 30): Promise<{
  avgLcp: number | null;
  avgFcp: number | null;
  avgCls: number | null;
  avgInp: number | null;
  avgTtfb: number | null;
  avgDomLoad: number | null;
  avgLoadComplete: number | null;
  p75Lcp: number | null;
  p75Fcp: number | null;
  totalWithMetrics: number;
  byPath: Array<{
    path: string;
    avgLcp: number;
    avgFcp: number;
    avgCls: number;
    avgTtfb: number;
    count: number;
  }>;
}> {
  const conn = ConnectionFactory();

  // Get average metrics
  const avgResult = await conn.execute({
    sql: `SELECT 
      AVG(lcp) as avgLcp,
      AVG(fcp) as avgFcp,
      AVG(cls) as avgCls,
      AVG(inp) as avgInp,
      AVG(ttfb) as avgTtfb,
      AVG(dom_load) as avgDomLoad,
      AVG(load_complete) as avgLoadComplete,
      COUNT(*) as total
    FROM VisitorAnalytics 
    WHERE created_at >= datetime('now', '-${days} days')
    AND fcp IS NOT NULL`,
    args: []
  });

  const avgRow = avgResult.rows[0] as any;

  // Get 75th percentile for LCP and FCP (approximation using median)
  const p75LcpResult = await conn.execute({
    sql: `SELECT lcp as p75
    FROM VisitorAnalytics 
    WHERE created_at >= datetime('now', '-${days} days')
    AND lcp IS NOT NULL
    ORDER BY lcp
    LIMIT 1 OFFSET (
      SELECT COUNT(*) * 75 / 100 
      FROM VisitorAnalytics 
      WHERE created_at >= datetime('now', '-${days} days')
      AND lcp IS NOT NULL
    )`,
    args: []
  });

  const p75FcpResult = await conn.execute({
    sql: `SELECT fcp as p75
    FROM VisitorAnalytics 
    WHERE created_at >= datetime('now', '-${days} days')
    AND fcp IS NOT NULL
    ORDER BY fcp
    LIMIT 1 OFFSET (
      SELECT COUNT(*) * 75 / 100 
      FROM VisitorAnalytics 
      WHERE created_at >= datetime('now', '-${days} days')
      AND fcp IS NOT NULL
    )`,
    args: []
  });

  // Get performance by path (only for non-API paths)
  const byPathResult = await conn.execute({
    sql: `SELECT 
      path,
      AVG(lcp) as avgLcp,
      AVG(fcp) as avgFcp,
      AVG(cls) as avgCls,
      AVG(ttfb) as avgTtfb,
      COUNT(*) as count
    FROM VisitorAnalytics 
    WHERE created_at >= datetime('now', '-${days} days')
    AND fcp IS NOT NULL
    AND path NOT LIKE '/api/%'
    GROUP BY path
    ORDER BY count DESC
    LIMIT 20`,
    args: []
  });

  const byPath = byPathResult.rows.map((row: any) => ({
    path: row.path,
    avgLcp: row.avgLcp || 0,
    avgFcp: row.avgFcp || 0,
    avgCls: row.avgCls || 0,
    avgTtfb: row.avgTtfb || 0,
    count: row.count
  }));

  return {
    avgLcp: avgRow?.avgLcp || null,
    avgFcp: avgRow?.avgFcp || null,
    avgCls: avgRow?.avgCls || null,
    avgInp: avgRow?.avgInp || null,
    avgTtfb: avgRow?.avgTtfb || null,
    avgDomLoad: avgRow?.avgDomLoad || null,
    avgLoadComplete: avgRow?.avgLoadComplete || null,
    p75Lcp: (p75LcpResult.rows[0] as any)?.p75 || null,
    p75Fcp: (p75FcpResult.rows[0] as any)?.p75 || null,
    totalWithMetrics: avgRow?.total || 0,
    byPath
  };
}

export async function cleanupOldAnalytics(
  olderThanDays: number
): Promise<number> {
  const conn = ConnectionFactory();

  const result = await conn.execute({
    sql: `DELETE FROM VisitorAnalytics 
          WHERE created_at < datetime('now', '-${olderThanDays} days')
          RETURNING id`,
    args: []
  });

  return result.rows.length;
}

function parseUserAgent(userAgent?: string): {
  deviceType: string | null;
  browser: string | null;
  os: string | null;
} {
  if (!userAgent) {
    return { deviceType: null, browser: null, os: null };
  }

  const ua = userAgent.toLowerCase();

  let deviceType: string | null = "desktop";
  if (ua.includes("mobile")) deviceType = "mobile";
  else if (ua.includes("tablet") || ua.includes("ipad")) deviceType = "tablet";

  let browser: string | null = null;
  if (ua.includes("edg")) browser = "edge";
  else if (ua.includes("chrome")) browser = "chrome";
  else if (ua.includes("firefox")) browser = "firefox";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "safari";
  else if (ua.includes("opera") || ua.includes("opr")) browser = "opera";

  let os: string | null = null;
  if (ua.includes("windows")) os = "windows";
  else if (ua.includes("mac")) os = "macos";
  else if (ua.includes("linux")) os = "linux";
  else if (ua.includes("android")) os = "android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "ios";

  return { deviceType, browser, os };
}

export function enrichAnalyticsEntry(entry: AnalyticsEntry): AnalyticsEntry {
  const { deviceType, browser, os } = parseUserAgent(
    entry.userAgent || undefined
  );

  return {
    ...entry,
    deviceType: entry.deviceType || deviceType,
    browser: entry.browser || browser,
    os: entry.os || os
  };
}
