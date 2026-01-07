import type { APIEvent } from "@solidjs/start/server";
import { getEvent, clearSession } from "vinxi/http";
import { sessionConfig } from "~/server/session-config";

export async function POST() {
  "use server";
  const event = getEvent()!;

  // Clear Vinxi session
  await clearSession(event, sessionConfig);

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/"
    }
  });
}
