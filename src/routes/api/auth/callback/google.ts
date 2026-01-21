import type { APIEvent } from "@solidjs/start/server";
import { createServerCaller } from "~/server/api/root";

export async function GET(event: APIEvent) {
  const url = new URL(event.request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  console.log("[Google OAuth Callback] Request received:", {
    hasCode: !!code,
    codeLength: code?.length,
    error
  });

  if (error) {
    console.error("[Google OAuth Callback] OAuth error from provider:", error);
    return new Response(null, {
      status: 302,
      headers: { Location: `/login?error=${encodeURIComponent(error)}` }
    });
  }

  if (!code) {
    console.error("[Google OAuth Callback] Missing authorization code");
    return new Response(null, {
      status: 302,
      headers: { Location: "/login?error=missing_code" }
    });
  }

  try {
    console.log("[Google OAuth Callback] Creating tRPC caller...");
    const caller = await createServerCaller(event);

    console.log("[Google OAuth Callback] Calling googleCallback procedure...");
    const result = await caller.auth.googleCallback({ code });

    console.log("[Google OAuth Callback] Result:", result);

    if (result.success) {
      console.log(
        "[Google OAuth Callback] Login successful, redirecting to:",
        result.redirectTo
      );

      // Auth handler already set cookie headers
      // Just redirect - the cookies are already in the response
      const redirectUrl = result.redirectTo || "/account";
      return new Response(null, {
        status: 302,
        headers: { Location: redirectUrl }
      });
    } else {
      console.error(
        "[Google OAuth Callback] Login failed (result.success=false)"
      );
      return new Response(null, {
        status: 302,
        headers: { Location: "/login?error=auth_failed" }
      });
    }
  } catch (error) {
    console.error("[Google OAuth Callback] Error caught:", error);

    if (error && typeof error === "object" && "code" in error) {
      const trpcError = error as { code: string; message?: string };

      console.error("[Google OAuth Callback] tRPC error:", {
        code: trpcError.code,
        message: trpcError.message
      });

      if (trpcError.code === "CONFLICT") {
        return new Response(null, {
          status: 302,
          headers: { Location: "/login?error=email_in_use" }
        });
      }
    }

    return new Response(null, {
      status: 302,
      headers: { Location: "/login?error=server_error" }
    });
  }
}
