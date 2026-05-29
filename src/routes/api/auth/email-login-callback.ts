import type { APIEvent } from "@solidjs/start/server";
import {
  createAuthCallbackHandler,
  redirectError
} from "~/lib/auth-callback-utils";

export async function GET(event: APIEvent) {
  const url = new URL(event.request.url);
  const email = url.searchParams.get("email");
  const token = url.searchParams.get("token");

  if (!email || !token) {
    return redirectError("missing_params");
  }

  const handler = createAuthCallbackHandler<{
    email: string;
    token: string;
  }>(
    "emailLogin",
    (caller, params) => caller.auth.emailLogin(params),
    (error) => {
      // Check for token expiration
      const message = error instanceof Error ? error.message : "";
      const isTokenError =
        message.includes("expired") || message.includes("invalid");
      return redirectError(isTokenError ? "link_expired" : "server_error");
    }
  );

  return handler(event, { email, token });
}
