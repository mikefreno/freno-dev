import type { APIEvent } from "@solidjs/start/server";
import { verifyAppleNotification } from "~/server/apple-notification";
import { storeAppleNotificationUser } from "~/server/apple-notification-store";

export async function POST(event: APIEvent) {
  const contentType = event.request.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return new Response("Unsupported content type", { status: 415 });
  }

  try {
    const payload = await event.request.json();
    const notification = await verifyAppleNotification(payload);
    await storeAppleNotificationUser(notification);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Apple notification error:", error);
    return new Response("Notification processing failed", { status: 400 });
  }
}
