import type { APIEvent } from "@solidjs/start/server";
import {
  createAuthCallbackHandler,
  redirectError
} from "~/lib/auth-callback-utils";

export async function GET(event: APIEvent) {
  const url = new URL(event.request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return redirectError(error);
  }

  if (!code) {
    return redirectError("missing_code");
  }

  const handler = createAuthCallbackHandler<{ code: string }>(
    "githubCallback",
    (caller, params) => caller.auth.githubCallback(params)
  );

  return handler(event, { code });
}
