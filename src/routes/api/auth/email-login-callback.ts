import type { APIEvent } from "@solidjs/start/server";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/utils";

export async function GET(event: APIEvent) {
  const url = new URL(event.request.url);
  const email = url.searchParams.get("email");
  const token = url.searchParams.get("token");
  const rememberMeParam = url.searchParams.get("rememberMe");

  // Parse rememberMe parameter
  const rememberMe = rememberMeParam === "true";

  // Missing required parameters
  if (!email || !token) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/login?error=missing_params" },
    });
  }

  try {
    // Create tRPC caller to invoke the emailLogin procedure
    const ctx = await createTRPCContext(event);
    const caller = appRouter.createCaller(ctx);

    // Call the email login handler
    const result = await caller.auth.emailLogin({
      email,
      token,
      rememberMe,
    });

    if (result.success) {
      // Redirect to account page on success
      return new Response(null, {
        status: 302,
        headers: { Location: result.redirectTo || "/account" },
      });
    } else {
      // Redirect to login with error
      return new Response(null, {
        status: 302,
        headers: { Location: "/login?error=auth_failed" },
      });
    }
  } catch (error) {
    console.error("Email login callback error:", error);
    
    // Check if it's a token expiration error
    const errorMessage = error instanceof Error ? error.message : "server_error";
    const isTokenError = errorMessage.includes("expired") || errorMessage.includes("invalid");
    
    return new Response(null, {
      status: 302,
      headers: { 
        Location: isTokenError 
          ? "/login?error=link_expired" 
          : "/login?error=server_error" 
      },
    });
  }
}
