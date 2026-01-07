import type { APIEvent } from "@solidjs/start/server";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/utils";

export async function GET(event: APIEvent) {
  const url = new URL(event.request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  console.log("[GitHub OAuth Callback] Request received:", {
    hasCode: !!code,
    codeLength: code?.length,
    error
  });

  if (error) {
    console.error("[GitHub OAuth Callback] OAuth error from provider:", error);
    return new Response(null, {
      status: 302,
      headers: { Location: `/login?error=${encodeURIComponent(error)}` }
    });
  }

  if (!code) {
    console.error("[GitHub OAuth Callback] Missing authorization code");
    return new Response(null, {
      status: 302,
      headers: { Location: "/login?error=missing_code" }
    });
  }

  try {
    console.log("[GitHub OAuth Callback] Creating tRPC caller...");
    const ctx = await createTRPCContext(event);
    const caller = appRouter.createCaller(ctx);

    console.log("[GitHub OAuth Callback] Calling githubCallback procedure...");
    const result = await caller.auth.githubCallback({ code });

    console.log("[GitHub OAuth Callback] Result:", result);

    if (result.success) {
      console.log(
        "[GitHub OAuth Callback] Login successful, redirecting to:",
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
        "[GitHub OAuth Callback] Login failed (result.success=false)"
      );
      return new Response(null, {
        status: 302,
        headers: { Location: "/login?error=auth_failed" }
      });
    }
  } catch (error) {
    console.error("[GitHub OAuth Callback] Error caught:", error);

    if (error && typeof error === "object" && "code" in error) {
      const trpcError = error as { code: string; message?: string };

      console.error("[GitHub OAuth Callback] tRPC error:", {
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
