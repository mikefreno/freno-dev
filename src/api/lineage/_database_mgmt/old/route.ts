import { LineageConnectionFactory } from "@/app/utils";
import { env } from "@/env.mjs";

import { createClient as createAPIClient } from "@tursodatabase/api";
import { NextResponse } from "next/server";

export async function GET() {
  const conn = LineageConnectionFactory();
  const query =
    "SELECT * FROM User WHERE datetime(db_destroy_date) < datetime('now');";
  try {
    const res = await conn.execute(query);
    const turso = createAPIClient({
      org: "mikefreno",
      token: env.TURSO_DB_API_TOKEN,
    });

    res.rows.forEach(async (row) => {
      const db_url = row.database_url;

      await turso.databases.delete(db_url as string);
      const query =
        "UPDATE User SET database_url = ?, database_token = ?, db_destroy_date = ? WHERE id = ?";
      const params = [null, null, null, row.id];
      conn.execute({ sql: query, args: params });
    });
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
