import type { APIEvent } from "@solidjs/start/server";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/utils";
import { getResponseHeaders } from "vinxi/http";

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
    const ctx = await createTRPCContext(event);
    const caller = appRouter.createCaller(ctx);

    console.log("[Google OAuth Callback] Calling googleCallback procedure...");
    const result = await caller.auth.googleCallback({ code });

    console.log("[Google OAuth Callback] Result:", result);

    if (result.success) {
      console.log(
        "[Google OAuth Callback] Login successful, redirecting to:",
        result.redirectTo
      );

      // Get the response headers that were set by the session (includes Set-Cookie)
      const responseHeaders = getResponseHeaders(event.nativeEvent);
      console.log(
        "[Google OAuth Callback] Response headers from event:",
        Object.keys(responseHeaders)
      );

      // Create redirect response with the session cookie
      const redirectUrl = result.redirectTo || "/account";
      const headers = new Headers({
        Location: redirectUrl
      });

      // Copy Set-Cookie headers from the session response
      if (responseHeaders["set-cookie"]) {
        const cookies = Array.isArray(responseHeaders["set-cookie"])
          ? responseHeaders["set-cookie"]
          : [responseHeaders["set-cookie"]];

        console.log("[Google OAuth Callback] Found cookies:", cookies.length);
        cookies.forEach((cookie) => {
          headers.append("Set-Cookie", cookie);
          console.log(
            "[Google OAuth Callback] Adding cookie:",
            cookie.substring(0, 50) + "..."
          );
        });
      } else {
        console.error("[Google OAuth Callback] NO SET-COOKIE HEADER FOUND!");
        console.error("[Google OAuth Callback] All headers:", responseHeaders);
      }

      return new Response(null, {
        status: 302,
        headers
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
