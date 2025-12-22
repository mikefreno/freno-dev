import type { APIEvent } from "@solidjs/start/server";
import { getCookie, getEvent, setCookie } from "vinxi/http";

export async function POST() {
  "use server";
  const event = getEvent()!;

  // Clear the userIDToken cookie (the actual session cookie)
  setCookie(event, "userIDToken", "", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0, // Expire immediately
    expires: new Date(0) // Set expiry to past date
  });

  // Redirect to home page
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/"
    }
  });
}
