import type { APIEvent } from "@solidjs/start/server";
import { NookConnectionFactory } from "~/server/db-connections";
import { nookSchemaBootstrap, emailLicenseKey } from "~/server/nook";
import { json, error } from "./_lib";

/**
 * POST /api/the-nook/resend-license
 * Body: { email }
 *
 * Re-sends the most recent license key to a buyer who lost it. If the email
 * owns a license, the key is emailed; otherwise nothing is sent. The response
 * is identical either way so callers can't learn whether an email has a
 * license — only validation failures differ.
 */
export async function POST(event: APIEvent) {
  let body: unknown;
  try {
    body = await event.request.json();
  } catch {
    return error("Invalid JSON", 400);
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return error("Invalid email", 400);
  }

  await nookSchemaBootstrap;
  const conn = NookConnectionFactory();

  const res = await conn.execute({
    sql: "SELECT key FROM licenses WHERE lower(email) = lower(?) ORDER BY created_at DESC LIMIT 1",
    args: [email]
  });

  if (res.rows.length > 0) {
    const { key } = res.rows[0] as { key: string };
    await emailLicenseKey(email, key);
  }

  return json({ success: true });
}
