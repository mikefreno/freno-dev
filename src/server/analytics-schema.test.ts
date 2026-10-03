import { describe, expect, it, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import {
  VISITOR_ANALYTICS_ADDED_COLUMNS,
  VISITOR_ANALYTICS_COLUMNS,
  VISITOR_ANALYTICS_DDL,
  VISITOR_ANALYTICS_INSERT,
  VISITOR_ANALYTICS_INDEXES
} from "./analytics-schema";

// Why an in-memory SQLite database: VisitorAnalytics lived only in the live
// Turso database, so nothing in the repo proved the DDL and the INSERT
// agreed. These tests apply the real DDL to a throwaway database and run the
// real INSERT statement against it — the exact class of drift (a column in
// the INSERT that the table does not have) fails here instead of silently in
// production, where the buffer swallows write errors.

let db: Database;

const sampleArgs = [
  "row-1", // id
  null, // user_id
  "/nook/", // path
  "GET", // method
  "https://nook.freno.me/", // referrer
  "Mozilla/5.0 (Macintosh)", // user_agent
  "127.0.0.1", // ip_address
  "GB", // country
  "desktop", // device_type
  "safari", // browser
  "macos", // os
  "hn", // utm_source
  "post", // utm_medium
  "launch", // utm_campaign
  12, // duration_ms
  100, // fcp
  200, // lcp
  0.01, // cls
  1, // fid
  2, // inp
  3, // ttfb
  4, // dom_load
  5 // load_complete
];

beforeEach(() => {
  db = new Database(":memory:");
  db.run(VISITOR_ANALYTICS_DDL);
  for (const index of VISITOR_ANALYTICS_INDEXES) db.run(index);
});

describe("VisitorAnalytics schema", () => {
  it("creates the table idempotently", () => {
    expect(() => db.run(VISITOR_ANALYTICS_DDL)).not.toThrow();
    expect(() => {
      for (const index of VISITOR_ANALYTICS_INDEXES) db.run(index);
    }).not.toThrow();
  });

  it("defines every column the writers insert", () => {
    const columns = (
      db.prepare(`PRAGMA table_info(VisitorAnalytics)`).all() as {
        name: string;
      }[]
    ).map((c) => c.name);

    for (const column of VISITOR_ANALYTICS_COLUMNS) {
      expect(columns).toContain(column);
    }
    // The reverse direction matters too: a column the code writes but the
    // DDL omits is the failure this whole file exists to catch.
    expect(VISITOR_ANALYTICS_COLUMNS.length).toBe(23);
  });

  it("has one placeholder per inserted column", () => {
    const placeholders = (VISITOR_ANALYTICS_INSERT.match(/\?/g) ?? []).length;
    expect(placeholders).toBe(VISITOR_ANALYTICS_COLUMNS.length);
    expect(sampleArgs.length).toBe(VISITOR_ANALYTICS_COLUMNS.length);
  });

  it("accepts a full row and returns the campaign columns", () => {
    db.prepare(VISITOR_ANALYTICS_INSERT).run(...sampleArgs);

    const row = db
      .prepare(
        `SELECT path, country, utm_source, utm_medium, utm_campaign
         FROM VisitorAnalytics`
      )
      .get() as Record<string, unknown>;

    expect(row).toEqual({
      path: "/nook/",
      country: "GB",
      utm_source: "hn",
      utm_medium: "post",
      utm_campaign: "launch"
    });
  });

  it("accepts a row with no campaign tags", () => {
    const args = [...sampleArgs];
    args[11] = args[12] = args[13] = null;
    db.prepare(VISITOR_ANALYTICS_INSERT).run(...args);

    const row = db
      .prepare(`SELECT utm_source FROM VisitorAnalytics`)
      .get() as Record<string, unknown>;
    expect(row.utm_source).toBeNull();
  });

  it("adds the post-hoc columns to a table that predates them", () => {
    // Simulate the older table: create it without the utm columns, then run
    // the ALTER path the bootstrap uses and confirm the writers still work.
    const old = new Database(":memory:");
    const withoutUtm = VISITOR_ANALYTICS_COLUMNS.filter(
      (c) => !VISITOR_ANALYTICS_ADDED_COLUMNS.some((a) => a.name === c)
    );
    old.run(
      `CREATE TABLE VisitorAnalytics (${withoutUtm
        .map((c) => `${c} TEXT`)
        .join(", ")})`
    );

    const present = new Set(
      (old.prepare(`PRAGMA table_info(VisitorAnalytics)`).all() as {
        name: string;
      }[]).map((c) => c.name)
    );
    for (const column of VISITOR_ANALYTICS_ADDED_COLUMNS) {
      if (!present.has(column.name)) old.run(column.ddl);
    }

    expect(() =>
      old.prepare(VISITOR_ANALYTICS_INSERT).run(...sampleArgs)
    ).not.toThrow();
  });
});
