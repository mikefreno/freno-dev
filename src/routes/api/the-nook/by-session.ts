import type { APIEvent } from "@solidjs/start/server";
import { NookConnectionFactory } from "~/server/db-connections";
import { nookSchemaBootstrap } from "~/server/nook";
import { json, error } from "./_lib";

/**
 * GET /api/the-nook/by-session?session_id=cs_...
 *
 * Used by the success page (nook.freno.me/success) to retrieve the license
 * key once the `checkout.session.completed` webhook has landed. The page
 * polls this endpoint until the license row exists.
 */
export async function GET(event: APIEvent) {
  const url = new URL(event.request.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return error("Invalid session id", 400);
  }

  await nookSchemaBootstrap;
  const conn = NookConnectionFactory();

  const res = await conn.execute({
    sql: "SELECT key, email FROM licenses WHERE stripe_session_id = ?",
    args: [sessionId]
  });
  if (res.rows.length === 0) {
    return error("Not found", 404);
  }
  const license = res.rows[0] as { key: string; email: string };
  return json({ key: license.key, email: license.email });
}
