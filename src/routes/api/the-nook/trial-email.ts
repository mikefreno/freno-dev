import type { APIEvent } from "@solidjs/start/server";
import { NookConnectionFactory } from "~/server/db-connections";
import { nookSchemaBootstrap, setTrialEmail } from "~/server/nook";
import { json, error, isUuid } from "./_lib";

/**
 * POST /api/the-nook/trial-email
 * Body: { fingerprint, email }
 *
 * Attaches the email a user gave at trial start (the optional first-launch
 * prompt) to their `trials` row and adds it to the Brevo trial list. The
 * response is the same whether the trial row existed or not, so the client
 * learns nothing it doesn't already know.
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
  const email =
    typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return error("Invalid email", 400);
  }

  await nookSchemaBootstrap;
  const stored = await setTrialEmail(fingerprint, email);
  return json({ success: stored });
}
