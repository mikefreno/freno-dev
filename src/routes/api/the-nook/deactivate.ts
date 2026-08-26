import type { APIEvent } from "@solidjs/start/server";
import { NookConnectionFactory } from "~/server/db-connections";
import { nookSchemaBootstrap, verifyLicenseKey } from "~/server/nook";
import { json, error, isUuid } from "./_lib";

/**
 * POST /api/the-nook/deactivate
 * Body: { key, deviceFingerprint }
 *
 * Marks the matching activation as deactivated, freeing a device seat.
 * - No activation row for this (license, fingerprint): 404.
 * - Already deactivated: idempotent success (does not error).
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

  if (!key || !isUuid(fingerprint)) {
    return error("Invalid request", 400);
  }
  if (!verifyLicenseKey(key)) {
    return error("Invalid license key", 400);
  }

  await nookSchemaBootstrap;
  const conn = NookConnectionFactory();

  const licenseRes = await conn.execute({
    sql: "SELECT id FROM licenses WHERE key = ?",
    args: [key]
  });
  if (licenseRes.rows.length === 0) {
    return error("License not found", 404);
  }
  const license = licenseRes.rows[0] as { id: string };

  const activationRes = await conn.execute({
    sql: "SELECT id FROM activations WHERE license_id = ? AND device_fingerprint = ?",
    args: [license.id, fingerprint]
  });
  if (activationRes.rows.length === 0) {
    return error("No activation found for this device", 404);
  }

  await conn.execute({
    sql: "UPDATE activations SET deactivated_at = ? WHERE id = ?",
    args: [new Date().toISOString(), (activationRes.rows[0] as { id: string }).id]
  });

  return json({ ok: true });
}
