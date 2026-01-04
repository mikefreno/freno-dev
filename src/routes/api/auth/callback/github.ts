import type { APIEvent } from "@solidjs/start/server";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/utils";

export async function GET(event: APIEvent) {
  const url = new URL(event.request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return new Response(null, {
      status: 302,
      headers: { Location: `/login?error=${encodeURIComponent(error)}` }
    });
  }

  if (!code) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/login?error=missing_code" }
    });
  }

  try {
    const ctx = await createTRPCContext(event);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.githubCallback({ code });

    if (result.success) {
      return new Response(null, {
        status: 302,
        headers: { Location: result.redirectTo || "/account" }
      });
    } else {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login?error=auth_failed" }
      });
    }
  } catch (error) {
    console.error("GitHub OAuth callback error:", error);

    if (error && typeof error === "object" && "code" in error) {
      const trpcError = error as { code: string; message?: string };

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
