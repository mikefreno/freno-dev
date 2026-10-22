import { beforeEach, describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import {
  VISITOR_ANALYTICS_COLUMNS,
  VISITOR_ANALYTICS_DDL,
  VISITOR_ANALYTICS_INDEXES,
  VISITOR_ANALYTICS_INSERT
} from "./analytics-schema";
import { summariseDownloads } from "~/lib/download-asset";
import { assetFromLegacyPath, backfillDownloads } from "./backfill-downloads";

// Why a real in-memory SQLite database rather than a stub: the backfill runs
// real SQL against the live table shape, and a stub would happily accept a
// column list the real table does not have. Same reasoning as
// analytics-schema.test.ts.
//
// Nothing is module-mocked here on purpose: bun's `mock.module` is process-wide,
// so stubbing the connection factory would leak into the rate-limit and CSRF
// suites that share the same database module.

let db: Database;

/** Adapt bun:sqlite to the libsql `execute(stmt | sql)` contract. */
const conn = {
  async execute(query: string | { sql: string; args?: unknown[] }) {
    const sql = typeof query === "string" ? query : query.sql;
    const args = (
      typeof query === "string" ? [] : (query.args ?? [])
    ) as never[];
    const statement = db.query(sql);
    if (/^\s*(select|pragma|with)\b/i.test(sql)) {
      return { rows: statement.all(...args) as unknown[], rowsAffected: 0 };
    }
    return {
      rows: [] as unknown[],
      rowsAffected: statement.run(...args).changes
    };
  }
};

const LEGACY_NOOK = "/api/the-nook/download";

const trpcClick = (asset: string) =>
  `/api/trpc/downloads.getDownloadUrl?batch=1&input=%7B%220%22%3A%7B%22asset_name%22%3A%22${asset}%22%7D%7D`;

/** Columns whose value varies per row; everything else stays NULL. */
const fixedColumns: Record<string, string> = {
  method: "GET",
  referrer: "https://gaze.freno.me/",
  user_agent: "Mozilla/5.0 (Macintosh)",
  ip_address: "203.0.113.7",
  country: "GB"
};

function insertLegacy(id: string, path: string) {
  const values = VISITOR_ANALYTICS_COLUMNS.map((column) => {
    if (column === "id") return id;
    if (column === "path") return path;
    return fixedColumns[column] ?? null;
  });
  db.query(VISITOR_ANALYTICS_INSERT).run(...(values as never[]));
}

function canonicalPaths(): string[] {
  return db
    .query<{ path: string }, []>(
      `SELECT path FROM VisitorAnalytics WHERE path LIKE '/api/downloads/%' ORDER BY path`
    )
    .all()
    .map((r: { path: string }) => r.path);
}

function legacyRowCount(): number {
  return db
    .query<
      { n: number },
      [string]
    >(`SELECT COUNT(*) AS n FROM VisitorAnalytics WHERE path = ?`)
    .get(LEGACY_NOOK)!.n;
}

beforeEach(() => {
  db = new Database(":memory:");
  db.exec(VISITOR_ANALYTICS_DDL);
  for (const index of VISITOR_ANALYTICS_INDEXES) db.exec(index);
});

describe("backfillDownloads", () => {
  it("derives a canonical row from each recoverable kind of history", async () => {
    insertLegacy("nook-1", LEGACY_NOOK);
    insertLegacy("gaze-1", trpcClick("gaze"));
    insertLegacy("halo-1", trpcClick("inputhalo"));
    insertLegacy("page-1", "/nook/");

    const added = Object.fromEntries(
      (await backfillDownloads(conn)).map((r) => [r.asset, r.added])
    );

    expect(added).toEqual({ thenook: 1, gaze: 1, inputhalo: 1 });
    expect(canonicalPaths()).toEqual([
      "/api/downloads/gaze",
      "/api/downloads/inputhalo",
      "/api/downloads/thenook"
    ]);
    // A page visit is not download history and gains no derived row.
    expect(
      db
        .query(`SELECT * FROM VisitorAnalytics WHERE id = 'backfill-page-1'`)
        .all()
    ).toHaveLength(0);
  });

  it("keeps the visitor detail of the row it derives from", async () => {
    insertLegacy("nook-1", LEGACY_NOOK);

    await backfillDownloads(conn);

    expect(
      db
        .query<
          { country: string; referrer: string },
          []
        >(`SELECT country, referrer FROM VisitorAnalytics WHERE id = 'backfill-nook-1'`)
        .get()
    ).toEqual({ country: "GB", referrer: "https://gaze.freno.me/" });
  });

  it("is idempotent and never rewrites the source rows", async () => {
    insertLegacy("nook-1", LEGACY_NOOK);

    await backfillDownloads(conn);
    const second = await backfillDownloads(conn);

    expect(second).toEqual([]);
    expect(canonicalPaths()).toHaveLength(1);
    expect(legacyRowCount()).toBe(1);
  });

  it("derives nothing when there is no legacy history", async () => {
    expect(await backfillDownloads(conn)).toEqual([]);
    expect(canonicalPaths()).toEqual([]);
  });
});

describe("assetFromLegacyPath", () => {
  it("maps the Nook door to its canonical asset", () => {
    expect(assetFromLegacyPath(LEGACY_NOOK)).toBe("thenook");
  });

  it("reads the asset out of an encoded or a plain tRPC request URL", () => {
    expect(assetFromLegacyPath(trpcClick("gaze"))).toBe("gaze");
    expect(
      assetFromLegacyPath(
        '/api/trpc/downloads.getDownloadUrl?batch=1&input={"0":{"asset_name":"lineage"}}'
      )
    ).toBe("lineage");
  });

  it("returns null when there is nothing to derive", () => {
    expect(assetFromLegacyPath("/nook/")).toBeNull();
    expect(
      assetFromLegacyPath("/api/trpc/downloads.getDownloadUrl")
    ).toBeNull();
  });
});

describe("summariseDownloads", () => {
  it("labels each row by the asset in its path and totals them", () => {
    expect(
      summariseDownloads([
        { path: "/api/downloads/gaze", count: 4 },
        { path: "/api/downloads/thenook", count: 1 }
      ])
    ).toEqual({
      total: 5,
      byAsset: [
        { asset: "gaze", count: 4 },
        { asset: "thenook", count: 1 }
      ]
    });
  });

  it("reports nothing rather than throwing on an empty table", () => {
    expect(summariseDownloads([])).toEqual({ total: 0, byAsset: [] });
  });
});
