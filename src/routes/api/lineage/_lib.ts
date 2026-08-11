// Shared REST handler for the Lineage REST shim.
//
// Each route file calls `rest()` with a function that receives a typed tRPC
// caller (scoped to `caller.lineage.*`) and the SolidStart APIEvent. The
// handler maps `TRPCError` codes → HTTP status + `{ message }` body (the
// legacy client parses `result.message` on non-OK responses), and returns
// the procedure's return value as JSON on success.

import type { APIEvent } from "@solidjs/start/server";
import { TRPCError } from "@trpc/server";
import { createServerCaller } from "~/server/api/root";

const codeToStatus: Record<string, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TIMEOUT: 408,
  PAYLOAD_TOO_LARGE: 413,
  METHOD_NOT_SUPPORTED: 405,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
};

type Caller = Awaited<ReturnType<typeof createServerCaller>>;

export async function rest(
  fn: (caller: Caller, event: APIEvent) => Promise<unknown>,
  event: APIEvent
): Promise<Response> {
  try {
    const caller = await createServerCaller(event);
    const result = await fn(caller, event);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (e) {
    if (e instanceof TRPCError) {
      const status = codeToStatus[e.code] ?? 500;
      return new Response(JSON.stringify({ message: e.message }), {
        status,
        headers: { "content-type": "application/json" }
      });
    }
    console.error("Lineage REST shim error:", e);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

/** Extract the Bearer token from the Authorization header. */
export function bearerToken(event: APIEvent): string | null {
  const auth = event.request.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? null;
}
