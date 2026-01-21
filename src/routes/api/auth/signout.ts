import { getEvent } from "vinxi/http";
import { clearAuthToken } from "~/server/auth";

export async function POST() {
  "use server";
  const event = getEvent()!;

  clearAuthToken(event);

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/"
    }
  });
}
