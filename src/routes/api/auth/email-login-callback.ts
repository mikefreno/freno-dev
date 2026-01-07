import type { APIEvent } from "@solidjs/start/server";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/utils";

export async function GET(event: APIEvent) {
  const url = new URL(event.request.url);
  const email = url.searchParams.get("email");
  const token = url.searchParams.get("token");

  console.log("[Email Login Callback] Request received:", {
    email,
    hasToken: !!token,
    tokenLength: token?.length
  });

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
    // Call the email login handler - rememberMe will be read from JWT payload
    const result = await caller.auth.emailLogin({
      email,
      token
    });

    console.log("[Email Login Callback] Login result:", result);

    if (result.success) {
      console.log(
        "[Email Login Callback] Login successful, redirecting to:",
        result.redirectTo
      );

      // Vinxi's updateSession already set the cookie headers automatically
      // Just redirect - the cookies are already in the response
      const redirectUrl = result.redirectTo || "/account";
      return new Response(null, {
        status: 302,
        headers: { Location: redirectUrl }
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
