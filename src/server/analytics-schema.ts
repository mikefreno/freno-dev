/**
 * VisitorAnalytics schema — the single source of truth for the table, its
 * indexes, and the column list both writers insert.
 *
 * Why this file exists: `VisitorAnalytics` had no `CREATE TABLE` anywhere in
 * this repo. It existed only in the live Turso database, so a fresh or
 * restored environment had nothing to write into — and because
 * `flushAnalyticsBuffer` swallows errors by design, every insert would fail
 * silently. The definition below mirrors production exactly.
 *
 * `session_id` is deliberately kept. It is a leftover from the removed
 * analytics-page feature (added in d2ee61b, dropped from the code in
 * 58d48da) — nothing reads or writes it now, and the Nook macOS app never
 * touches this table at all. SQLite would let us `DROP COLUMN`, but the
 * column costs nothing and the live data in it may still be wanted, so the
 * schema records it rather than removing it.
 *
 * Pure string constants, no imports — so the parity test can apply them to
 * an in-memory SQLite database without a network or environment.
 */

/**
 * The table as it exists in production. `IF NOT EXISTS` makes applying this
 * a no-op against the live database; it only does work on a database that
 * has never had the table.
 */
export const VISITOR_ANALYTICS_DDL = `
  CREATE TABLE IF NOT EXISTS VisitorAnalytics (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    path TEXT NOT NULL,
    method TEXT NOT NULL,
    referrer TEXT,
    user_agent TEXT,
    ip_address TEXT,
    country TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    session_id TEXT,
    duration_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    fcp REAL,
    lcp REAL,
    cls REAL,
    fid REAL,
    inp REAL,
    ttfb REAL,
    dom_load REAL,
    load_complete REAL,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE SET NULL
  )
`;

/** Indexes the summary, funnel and path queries rely on. */
export const VISITOR_ANALYTICS_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON VisitorAnalytics(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON VisitorAnalytics(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_path ON VisitorAnalytics(path)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_ip_address ON VisitorAnalytics(ip_address)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON VisitorAnalytics(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_lcp ON VisitorAnalytics(lcp) WHERE lcp IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_fcp ON VisitorAnalytics(fcp) WHERE fcp IS NOT NULL`
];

/** Columns that may be missing from a table created before they existed. */
export const VISITOR_ANALYTICS_ADDED_COLUMNS = [
  {
    name: "utm_source",
    ddl: `ALTER TABLE VisitorAnalytics ADD COLUMN utm_source TEXT`
  },
  {
    name: "utm_medium",
    ddl: `ALTER TABLE VisitorAnalytics ADD COLUMN utm_medium TEXT`
  },
  {
    name: "utm_campaign",
    ddl: `ALTER TABLE VisitorAnalytics ADD COLUMN utm_campaign TEXT`
  }
];

/**
 * Every column both writers insert, in order. The parity test asserts these
 * all exist on the table, which is what stops the DDL and the INSERT from
 * drifting apart again.
 */
export const VISITOR_ANALYTICS_COLUMNS = [
  "id",
  "user_id",
  "path",
  "method",
  "referrer",
  "user_agent",
  "ip_address",
  "country",
  "device_type",
  "browser",
  "os",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "duration_ms",
  "fcp",
  "lcp",
  "cls",
  "fid",
  "inp",
  "ttfb",
  "dom_load",
  "load_complete"
] as const;

/**
 * The one INSERT statement used by both analytics writers — the buffered
 * writer in `analytics.ts` and the page-visit path in the tRPC router.
 * Shared so the two can never disagree about column order or count.
 */
export const VISITOR_ANALYTICS_INSERT = `INSERT INTO VisitorAnalytics (
  ${VISITOR_ANALYTICS_COLUMNS.join(", ")}
) VALUES (${VISITOR_ANALYTICS_COLUMNS.map(() => "?").join(", ")})`;
