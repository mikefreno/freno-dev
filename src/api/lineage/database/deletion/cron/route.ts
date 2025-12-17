import { dumpAndSendDB, LineageConnectionFactory } from "@/app/utils";
import { NextResponse } from "next/server";
import { createClient as createAPIClient } from "@tursodatabase/api";
import { env } from "@/env.mjs";

export async function GET() {
  const conn = LineageConnectionFactory();
  const res = await conn.execute(
    `SELECT * FROM cron WHERE created_at <= datetime('now', '-1 day');`,
  );

  if (res.rows.length > 0) {
    const executed_ids = [];
    for (const row of res.rows) {
      const { id, db_name, db_token, send_dump_target, email } = row;

      if (send_dump_target) {
        const res = await dumpAndSendDB({
          dbName: db_name as string,
          dbToken: db_token as string,
          sendTarget: send_dump_target as string,
        });
        if (res.success) {
          //const res = await turso.databases.delete(db_name as string);
          //
          const res = await fetch(
            `https://api.turso.tech/v1/organizations/mikefreno/databases/${db_name}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${env.TURSO_DB_API_TOKEN}`,
              },
            },
          );
          if (res.ok) {
            executed_ids.push(id);
            // Shouldn't fail. No idea what the response from turso would be at this point - not documented
          }
        }
      } else {
        const res = await fetch(
          `https://api.turso.tech/v1/organizations/mikefreno/databases/${db_name}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${env.TURSO_DB_API_TOKEN}`,
            },
          },
        );
        if (res.ok) {
          conn.execute({
            sql: `DELETE FROM User WHERE email = ?`,
            args: [email],
          });
          executed_ids.push(id);
          // Shouldn't fail. No idea what the response from turso would be at this point - not documented
        }
      }
    }
    if (executed_ids.length > 0) {
      const placeholders = executed_ids.map(() => "?").join(", ");
      const deleteQuery = `DELETE FROM cron WHERE id IN (${placeholders});`;
      await conn.execute({ sql: deleteQuery, args: executed_ids });

      return NextResponse.json({
        status: 200,
        message:
          "Processed databases deleted and corresponding cron rows removed.",
      });
    }
  }
  return NextResponse.json({ status: 200, ok: true });
}
