import { VISITOR_ANALYTICS_COLUMNS } from "~/server/analytics-schema";
import { downloadPath } from "~/lib/download-asset";

/**
 * Backfill canonical `downloadPath(asset)` rows from download history that was
 * recorded before `trackDownload` existed.
 *
 * Two shapes of history are recoverable, and only these two:
 *
 *  - the Nook door's own rows (`/api/the-nook/download`), and
 *  - tRPC clicks, where the asset name still sits in the request URL as
 *    `?input={"0":{"asset_name":"gaze"}}` (percent-encoded in practice).
 *
 * Every other door wrote nothing, so there is nothing to derive for them.
 *
 * Derived rows keep the source row's timestamp, visitor, campaign and country,
 * get `backfill-<source id>` as primary key and are written with
 * `INSERT OR IGNORE` — so a second run adds nothing, and the original rows are
 * left untouched (they are genuine API traffic, and the analytics page only
 * counts the canonical path).
 */

const LEGACY_NOOK_PATH = "/api/the-nook/download";
const TRPC_DOOR_PREFIX = "/api/trpc/downloads.getDownloadUrl";

/** The two libsql calls used here, narrow enough for an in-memory test client. */
export interface DownloadBackfillConn {
  execute(query: {
    sql: string;
    // `any[]` not `unknown[]`: the libsql client types its bind args as InArg[],
    // and a narrower array type here would reject the real connection.
    args?: any[];
  }): Promise<{ rows: unknown[]; rowsAffected?: number }>;
}

export interface DownloadBackfillResult {
  asset: string;
  added: number;
}

/** One statement: copy every column of the source row, override id and path. */
const INSERT_DERIVED = `INSERT OR IGNORE INTO VisitorAnalytics (${VISITOR_ANALYTICS_COLUMNS.join(", ")})
SELECT ${VISITOR_ANALYTICS_COLUMNS.map((column) =>
  column === "id"
    ? "'backfill-' || id"
    : column === "path"
      ? "?"
      : `"${column}"`
).join(", ")}
FROM VisitorAnalytics
WHERE id = ?`;

/** Pull the asset name back out of a logged tRPC request URL. */
export function assetFromLegacyPath(path: string): string | null {
  if (path === LEGACY_NOOK_PATH) return "thenook";

  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    // A malformed escape is not a reason to drop the row — match on the raw.
  }

  return /"asset_name"\s*:\s*"([^"]+)"/.exec(decoded)?.[1] ?? null;
}

export async function backfillDownloads(
  conn: DownloadBackfillConn
): Promise<DownloadBackfillResult[]> {
  const legacy = await conn.execute({
    sql: `SELECT id, path FROM VisitorAnalytics WHERE path = ? OR path LIKE ?`,
    args: [LEGACY_NOOK_PATH, `${TRPC_DOOR_PREFIX}%`]
  });

  const added = new Map<string, number>();

  for (const row of legacy.rows) {
    const { id, path } = row as { id: string; path: string };
    const asset = assetFromLegacyPath(path);
    if (!asset) continue;

    const result = await conn.execute({
      sql: INSERT_DERIVED,
      args: [downloadPath(asset), id]
    });

    if (result.rowsAffected) {
      added.set(asset, (added.get(asset) ?? 0) + result.rowsAffected);
    }
  }

  return [...added.entries()]
    .map(([asset, count]) => ({ asset, added: count }))
    .sort((a, b) => b.added - a.added);
}
