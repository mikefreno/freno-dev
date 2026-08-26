import type { APIEvent } from "@solidjs/start/server";
import { NookConnectionFactory } from "~/server/db-connections";
import { nookSchemaBootstrap } from "~/server/nook";
import { json, error, isUuid } from "./_lib";

/**
 * POST /api/the-nook/trial
 * Body: { fingerprint, deviceName }
 *
 * Returns the canonical trial start date. If a `trials` row already exists
 * for the fingerprint it returns the STORED value (the anti-reset point) —
 * a wiped-Keychain reinstall cannot push the trial start forward.
 */
export async function POST(event: APIEvent) {
  let body: unknown;
  try {
    body = await event.request.json();
  } catch {
    return error("Invalid JSON", 400);
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const fingerprint = b.fingerprint;
  if (!isUuid(fingerprint)) {
    return error("Invalid fingerprint", 400);
  }

  await nookSchemaBootstrap;
  const conn = NookConnectionFactory();

  const existing = await conn.execute({
    sql: "SELECT started_at FROM trials WHERE fingerprint = ?",
    args: [fingerprint]
  });
  if (existing.rows.length > 0) {
    const trialStart = existing.rows[0] as { started_at: string };
    return json({ fingerprint, trialStart: trialStart.started_at, trialDays: 14 });
  }

  const trialStart = new Date().toISOString();
  await conn.execute({
    sql: "INSERT INTO trials (fingerprint, started_at) VALUES (?, ?)",
    args: [fingerprint, trialStart]
  });
  return json({ fingerprint, trialStart, trialDays: 14 });
}
