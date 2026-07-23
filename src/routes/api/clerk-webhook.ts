import type { APIEvent } from "@solidjs/start/server";
import { env } from "~/env/server";
import { NessaConnectionFactory } from "~/server/database";
import { handleClerkUserWebhook } from "~/server/clerk-user-webhook";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

/**
 * Clerk webhook endpoint — receives `user.created` / `user.updated` events.
 *
 * Configure the endpoint URL in the Clerk Dashboard → Webhooks
 * (e.g. https://freno.me/api/clerk-webhook in prod, or an ngrok/dev url for
 * local dev). The signing secret (`whsec_...`) is stored in
 * `NESSA_CLERK_WEBHOOK_SECRET` and used to verify each request via Svix.
 *
 * The raw body is read verbatim from the inflight request so the Svix
 * signature is computed over the exact bytes Clerk sent.
 */
export async function POST(event: APIEvent) {
  const svixId = event.request.headers.get("svix-id");
  const svixTimestamp = event.request.headers.get("svix-timestamp");
  const svixSignature = event.request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return json(400, { error: "Missing Svix signature headers" });
  }

  let rawBody: string;
  try {
    rawBody = await event.request.text();
  } catch {
    return json(400, { error: "Missing request body" });
  }

  const result = await handleClerkUserWebhook({
    rawBody,
    headers: {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature
    },
    webhookSecret: env.NESSA_CLERK_WEBHOOK_SECRET,
    conn: NessaConnectionFactory()
  });

  return json(result.status, result.body);
}
