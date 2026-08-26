import type { APIEvent } from "@solidjs/start/server";
import { env } from "~/env/server";
import { TURNSTILE_CONFIG } from "~/config";
import { verifyTurnstileToken } from "~/server/fetch-utils";
import { json, error } from "./_lib";

/**
 * POST /api/the-nook/checkout
 * Body: { turnstileToken }
 *
 * Verifies the Cloudflare Turnstile token, then creates a Stripe Checkout
 * session for the one-time $10 The Nook license. Returns the hosted
 * checkout URL for the client to redirect to.
 *
 * Uses raw `fetch` (Node 24 / Vercel Node functions have global fetch) — no
 * `stripe` npm dependency added.
 */
export async function POST(event: APIEvent) {
  let body: unknown;
  try {
    body = await event.request.json();
  } catch {
    return error("Invalid JSON", 400);
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const turnstileToken = typeof b.turnstileToken === "string" ? b.turnstileToken : "";

  const turnstileValid = await verifyTurnstileToken(
    turnstileToken,
    env.TURNSTILE_SECRET_KEY,
    TURNSTILE_CONFIG.VERIFY_URL,
    TURNSTILE_CONFIG.RESPONSE_TIMEOUT_MS
  );
  if (!turnstileValid) {
    return error("Security verification failed", 403);
  }

  const params = new URLSearchParams({
    mode: "payment",
    "line_items[0][price]": env.NOOK_STRIPE_PRICE_ID,
    "line_items[0][quantity]": "1",
    success_url: "https://nook.freno.me/success?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "https://nook.freno.me/checkout"
  });

  let stripeRes: Response;
  try {
    stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NOOK_STRIPE_SK}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    });
  } catch {
    return error("Stripe unreachable", 502);
  }

  if (!stripeRes.ok) {
    const stripeError = await stripeRes.text();
    console.error("Stripe checkout error:", stripeError);
    return error(`Stripe error: ${stripeError}`, 502);
  }

  const data = (await stripeRes.json()) as { url?: string };
  if (!data.url) {
    return error("Stripe returned no checkout URL", 502);
  }
  return json({ checkoutUrl: data.url });
}
