import type { APIEvent } from "@solidjs/start/server";
import { NookConnectionFactory } from "~/server/db-connections";
import { nookSchemaBootstrap, verifyLicenseKey } from "~/server/nook";
import { json, error, isUuid } from "./_lib";

/**
 * POST /api/the-nook/status
 * Body: { key, deviceFingerprint }
 *
 * POST (not GET) because the license key is sensitive in URLs/logs.
 * Returns the license state: "valid" | "revoked" | "unknown_key" with the
 * current active activation count (for the 3-seat cap display).
 */
export async function POST(event: APIEvent) {
  let body: unknown;
  try {
    body = await event.request.json();
  } catch {
    return error("Invalid JSON", 400);
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const key = typeof b.key === "string" ? b.key : "";

  if (!key) {
    return error("Invalid request", 400);
  }

  await nookSchemaBootstrap;
  const conn = NookConnectionFactory();

  const licenseRes = await conn.execute({
    sql: "SELECT id, revoked FROM licenses WHERE key = ?",
    args: [key]
  });
  if (licenseRes.rows.length === 0) {
    return json({ state: "unknown_key", activatedCount: 0 });
  }
  const license = licenseRes.rows[0] as { id: string; revoked: number };

  if (license.revoked === 1) {
    return json({ state: "revoked", activatedCount: 0 });
  }

  const countRes = await conn.execute({
    sql: "SELECT COUNT(*) AS n FROM activations WHERE license_id = ? AND deactivated_at IS NULL",
    args: [license.id]
  });
  const activatedCount = Number((countRes.rows[0] as { n: number | bigint }).n);

  return json({ state: "valid", activatedCount });
}
