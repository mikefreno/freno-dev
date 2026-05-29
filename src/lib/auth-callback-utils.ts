import type { APIEvent } from "@solidjs/start/server";
import { createServerCaller } from "~/server/api/root";

/**
 * Result from an auth callback tRPC procedure
 */
interface AuthCallbackResult {
  success: boolean;
  redirectTo?: string;
}

/**
 * Handle a successful auth callback result by redirecting
 */
export function redirectSuccess(result: AuthCallbackResult) {
  return new Response(null, {
    status: 302,
    headers: { Location: result.redirectTo || "/account" }
  });
}

/**
 * Redirect to login with an error parameter
 */
export function redirectError(error: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: `/login?error=${encodeURIComponent(error)}` }
  });
}

/**
 * Handle tRPC CONFLICT error (email already in use)
 */
export function isConflictError(error: unknown): boolean {
  return (
    error != null &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code: string }).code === "CONFLICT"
  );
}

/**
 * Create an auth callback handler that calls a tRPC procedure and redirects
 */
export function createAuthCallbackHandler<Params extends object>(
  procedureName: string,
  callProcedure: (
    caller: ReturnType<typeof createServerCaller> extends Promise<infer T>
      ? T
      : never,
    params: Params
  ) => Promise<AuthCallbackResult>,
  handleError?: (error: unknown) => Response
) {
  return async (event: APIEvent, params: Params) => {
    try {
      const caller = await createServerCaller(event);
      const result = await callProcedure(caller, params);

      if (result.success) {
        return redirectSuccess(result);
      }

      return redirectError("auth_failed");
    } catch (error) {
      if (handleError) {
        return handleError(error);
      }

      if (isConflictError(error)) {
        return redirectError("email_in_use");
      }

      return redirectError("server_error");
    }
  };
}
