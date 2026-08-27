import type { Client } from "@libsql/client/web";
import type { APIEvent } from "@solidjs/start/server";
import { NookConnectionFactory } from "~/server/db-connections";
import { nookSchemaBootstrap, verifyLicenseKey } from "~/server/nook";
import { json, error, isUuid } from "./_lib";

/**
 * POST /api/the-nook/activate
 * Body: { key, deviceFingerprint, deviceName }
 *
 * Re-verifies the Ed25519 license signature server-side (defense in depth —
 * the app already verified it offline), enforces the 3-device activation cap,
 * and records/refreshes an activation row. Re-activating an already-activated
 * fingerprint is idempotent and does NOT consume an extra seat.
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
  const fingerprint = b.deviceFingerprint;
  const deviceName =
    typeof b.deviceName === "string" && b.deviceName.length > 0
      ? b.deviceName
      : "Mac";

  if (!key || !isUuid(fingerprint)) {
    return error("Invalid request", 400);
  }
  if (!verifyLicenseKey(key)) {
    return error("Invalid license key", 400);
  }

  await nookSchemaBootstrap;
  const conn = NookConnectionFactory();

  const licenseRes = await conn.execute({
    sql: "SELECT id, email, revoked, max_devices FROM licenses WHERE key = ?",
    args: [key]
  });
  if (licenseRes.rows.length === 0) {
    return error("License not found", 404);
  }
  const license = licenseRes.rows[0] as {
    id: string;
    email: string;
    revoked: number;
    maxDevices: number;
  };
  if (license.revoked === 1) {
    return error("License revoked", 403);
  }

  // Idempotent re-activation: already-active fingerprint does not consume a seat.
  const existingRes = await conn.execute({
    sql: `SELECT id FROM activations
          WHERE license_id = ? AND device_fingerprint = ? AND deactivated_at IS NULL`,
    args: [license.id, fingerprint]
  });
  if (existingRes.rows.length > 0) {
    const existing = existingRes.rows[0] as { id: string }; // row we inserted as an activation
    await conn.execute({
      sql: "UPDATE activations SET activated_at = ? WHERE id = ?",
      args: [new Date().toISOString(), existing.id]
    });
    const count = await activeCount(conn, license.id);
    return json({ ok: true, email: license.email, activatedCount: count, maxDevices: license.maxDevices });
  }

  const count = await activeCount(conn, license.id);
  if (count >= license.maxDevices) {
    return error(`Activation limit reached (${license.maxDevices} devices)`, 409);
  }

  await conn.execute({
    sql: `INSERT INTO activations
          (id, license_id, device_fingerprint, device_name, activated_at, deactivated_at)
          VALUES (?, ?, ?, ?, ?, NULL)`,
    args: [
      crypto.randomUUID(),
      license.id,
      fingerprint,
      deviceName,
      new Date().toISOString()
    ]
  });
  return json({ ok: true, email: license.email, activatedCount: count + 1, maxDevices: license.maxDevices });
}

async function activeCount(
  conn: Client,
  licenseId: string
): Promise<number> {
  const res = await conn.execute({
    sql: "SELECT COUNT(*) AS n FROM activations WHERE license_id = ? AND deactivated_at IS NULL",
    args: [licenseId]
  });
  return Number((res.rows[0] as { n: number | bigint }).n);
}
