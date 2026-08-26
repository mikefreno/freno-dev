import type { APIEvent } from "@solidjs/start/server";
import { env } from "~/env/server";
import { NookConnectionFactory } from "~/server/db-connections";
import { nookSchemaBootstrap, issueLicense } from "~/server/nook";
import { json } from "../_lib";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * POST /api/the-nook/webhooks/stripe
 *
 * Verifies the Stripe webhook signature manually (no `stripe` npm package),
 * handles `checkout.session.completed`: issues a license row (idempotent via
 * the UNIQUE `stripe_session_id`) and emails the key to the buyer.
 *
 * Email failure is a logged warning, never a purchase failure — the license
 * row is written before emailing, and the success page can still fetch the
 * key via by-session.
 */

interface StripeSessionCompleted {
  id: string;
  type: string;
  customer_details?: { email?: string };
}

function verifyStripeSignature(rawBody: string, signatureHeader: string): boolean {
  const params = new Map<string, string>();
  for (const pair of signatureHeader.split(",")) {
    const eq = pair.indexOf("=");
    if (eq > 0) params.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  const t = params.get("t");
  const v1 = params.get("v1");
  if (!t || !v1) return false;

  const now = Math.floor(Date.now() / 1000);
  const ts = Number(t);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) return false;

  const expected = createHmac("sha256", env.NOOK_STRIPE_WEBHOOK_SECRET)
    .update(`${t}.${rawBody}`)
    .digest("hex");
  const provided = Buffer.from(v1, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (provided.length !== expectedBuffer.length) return false;
  return timingSafeEqual(provided, expectedBuffer);
}

async function emailLicenseKey(to: string, licenseKey: string): Promise<void> {
  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.SENDINBLUE_KEY,
        "content-type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify({
        sender: { email: env.EMAIL_FROM },
        to: [{ email: to }],
        subject: "Your The Nook license key",
        textContent:
          `Your The Nook license key is:\n\n${licenseKey}\n\n` +
          `Open The Nook, go to Settings, and enter this key to activate.\n` +
          `You can activate up to 3 devices.\n\n— The Nook`
      })
    });
  } catch (error) {
    // Purchase must not fail because email delivery did.
    console.error("Failed to email The Nook license key:", error);
  }
}

export async function POST(event: APIEvent) {
  const rawBody = await event.request.text();
  const signatureHeader = event.request.headers.get("Stripe-Signature");
  if (!signatureHeader) {
    return json({ error: "Missing signature" }, 400);
  }
  if (!verifyStripeSignature(rawBody, signatureHeader)) {
    return json({ error: "Invalid signature" }, 400);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const body = payload as StripeSessionCompleted;
  if (body.type !== "checkout.session.completed") {
    // Unknown event types are acknowledged, not retried.
    return json({ received: true });
  }

  const sessionId = body.id;
  const email = body.customer_details?.email;
  if (!sessionId || !email) {
    console.error("checkout.session.completed missing id or email:", rawBody);
    return json({ received: true });
  }

  await nookSchemaBootstrap;
  const conn = NookConnectionFactory();

  // Idempotency: a session that already produced a license is acknowledged
  // without re-issuing or re-emailing.
  const existing = await conn.execute({
    sql: "SELECT id FROM licenses WHERE stripe_session_id = ?",
    args: [sessionId]
  });
  if (existing.rows.length > 0) {
    return json({ received: true });
  }

  try {
    const { key } = await issueLicense(email, sessionId);
    await emailLicenseKey(email, key);
  } catch (error) {
    // UNIQUE stripe_session_id conflict from a racing duplicate delivery.
    console.error("Failed to issue The Nook license (webhook):", error);
  }

  return json({ received: true });
}
