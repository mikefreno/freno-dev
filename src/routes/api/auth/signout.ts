import type { APIEvent } from "@solidjs/start/server";
import { getCookie, getEvent, setCookie } from "vinxi/http";

export async function POST() {
  "use server";
  const event = getEvent()!;

  setCookie(event, "userIDToken", "", {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
    expires: new Date(0)
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/"
    }
  });
}
