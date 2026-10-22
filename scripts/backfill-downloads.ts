import { ConnectionFactory } from "~/server/db-connections";
import { backfillDownloads } from "~/server/backfill-downloads";

// One-off: derive canonical /api/downloads/<asset> rows from download history
// recorded before `trackDownload` existed. Idempotent — re-running adds
// nothing, because derived rows carry a `backfill-<source id>` primary key.
//
//   bun --env-file=.env scripts/backfill-downloads.ts

const result = await backfillDownloads(ConnectionFactory());

if (result.length === 0) {
  console.log("Nothing to backfill: no legacy download rows left to derive.");
} else {
  for (const { asset, added } of result) {
    console.log(`${asset}: +${added}`);
  }
  console.log(
    `Total: +${result.reduce((sum, row) => sum + row.added, 0)} derived download rows.`
  );
}
