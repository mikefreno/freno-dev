import type { APIEvent } from "@solidjs/start/server";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/utils";
import { getResponseHeaders } from "vinxi/http";

export async function GET(event: APIEvent) {
  const url = new URL(event.request.url);
  const email = url.searchParams.get("email");
  const token = url.searchParams.get("token");
  const rememberMeParam = url.searchParams.get("rememberMe");

  console.log("[Email Login Callback] Request received:", {
    email,
    hasToken: !!token,
    tokenLength: token?.length,
    rememberMeParam
  });

  // Parse rememberMe parameter
  const rememberMe = rememberMeParam === "true";

  if (!email || !token) {
    console.error("[Email Login Callback] Missing required parameters:", {
      hasEmail: !!email,
      hasToken: !!token
    });
    return new Response(null, {
      status: 302,
      headers: { Location: "/login?error=missing_params" }
    });
  }

  try {
    console.log("[Email Login Callback] Creating tRPC caller...");
    // Create tRPC caller to invoke the emailLogin procedure
    const ctx = await createTRPCContext(event);
    const caller = appRouter.createCaller(ctx);

    console.log("[Email Login Callback] Calling emailLogin procedure...");
    // Call the email login handler
    const result = await caller.auth.emailLogin({
      email,
      token,
      rememberMe
    });

    console.log("[Email Login Callback] Login result:", result);

    if (result.success) {
      console.log(
        "[Email Login Callback] Login successful, redirecting to:",
        result.redirectTo
      );

      // Get the response headers that were set by the session (includes Set-Cookie)
      const responseHeaders = getResponseHeaders(event.nativeEvent);
      console.log(
        "[Email Login Callback] Response headers from event:",
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

        console.log("[Email Login Callback] Found cookies:", cookies.length);
        cookies.forEach((cookie) => {
          headers.append("Set-Cookie", cookie);
          console.log(
            "[Email Login Callback] Adding cookie:",
            cookie.substring(0, 50) + "..."
          );
        });
      } else {
        console.error("[Email Login Callback] NO SET-COOKIE HEADER FOUND!");
        console.error("[Email Login Callback] All headers:", responseHeaders);
      }

      return new Response(null, {
        status: 302,
        headers
      });
    } else {
      console.error(
        "[Email Login Callback] Login failed (result.success=false)"
      );
      return new Response(null, {
        status: 302,
        headers: { Location: "/login?error=auth_failed" }
      });
    }
  } catch (error) {
    console.error("[Email Login Callback] Error caught:", error);

    // Check if it's a token expiration error
    const errorMessage =
      error instanceof Error ? error.message : "server_error";
    const isTokenError =
      errorMessage.includes("expired") || errorMessage.includes("invalid");

    console.error("[Email Login Callback] Error details:", {
      errorMessage,
      isTokenError,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: isTokenError
          ? "/login?error=link_expired"
          : "/login?error=server_error"
      }
    });
  }
}
