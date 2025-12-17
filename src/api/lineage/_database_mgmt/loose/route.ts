import { LineageConnectionFactory } from "@/app/utils";
import { env } from "@/env.mjs";
import { createClient as createAPIClient } from "@tursodatabase/api";
import { NextResponse } from "next/server";

const IGNORE = ["frenome", "magic-delve-conductor"];

export async function GET() {
  const conn = LineageConnectionFactory();
  const query = "SELECT database_url FROM User WHERE database_url IS NOT NULL";
  try {
    const res = await conn.execute(query);
    const turso = createAPIClient({
      org: "mikefreno",
      token: env.TURSO_DB_API_TOKEN,
    });
    const linkedDatabaseUrls = res.rows.map((row) => row.database_url);

    const all_dbs = await turso.databases.list();
    console.log(all_dbs);
    const dbs_to_delete = all_dbs.filter((db) => {
      return !IGNORE.includes(db.name) && !linkedDatabaseUrls.includes(db.name);
    });
    //console.log("will delete:", dbs_to_delete);
  } catch (e) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: e,
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  return new NextResponse(
    JSON.stringify({
      success: true,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
