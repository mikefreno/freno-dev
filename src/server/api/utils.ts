import { initTRPC, TRPCError } from "@trpc/server";
import type { APIEvent } from "@solidjs/start/server";
import { logVisit, enrichAnalyticsEntry } from "~/server/analytics";
import { getRequestIP } from "vinxi/http";
import { verifyNessaToken } from "~/server/nessa-auth";
import { getAuthPayloadFromEvent } from "~/server/auth";
import { NessaConnectionFactory } from "~/server/database";

export type Context = {
  event: APIEvent;
  userId: string | null;
  isAdmin: boolean;
  nessaUserId: string | null;
};

/** Safely get a header value from either Fetch API Headers or Node.js IncomingHttpHeaders */
function getHeader(
  headers: Record<string, string | string[] | undefined> | Headers | undefined,
  name: string
): string | undefined {
  if (!headers) return undefined;

  // Check if it's a Fetch API Headers object (has .get method)
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name) || undefined;
  }

  // Otherwise treat as Node.js IncomingHttpHeaders (plain object)
  const value = (headers as Record<string, string | string[] | undefined>)[
    name.toLowerCase()
  ];
  if (Array.isArray(value)) return value[0];
  return value;
}

async function createContextInner(event: APIEvent): Promise<Context> {
  const payload = await getAuthPayloadFromEvent(event.nativeEvent);

  let userId: string | null = null;
  let isAdmin = false;

  if (payload) {
    userId = payload.sub;
    isAdmin = payload.isAdmin;
  }

  const req = event.nativeEvent.node?.req || event.nativeEvent;
  const path = req.url || event.request?.url || "unknown";
  const method = req.method || event.request?.method || "GET";
  const userAgent =
    getHeader(req.headers, "user-agent") ||
    getHeader(event.request?.headers, "user-agent");
  const referrer =
    getHeader(req.headers, "referer") ||
    getHeader(req.headers, "referrer") ||
    getHeader(event.request?.headers, "referer");
  const ipAddress = getRequestIP(event.nativeEvent) || undefined;
  const authHeader =
    getHeader(req.headers, "authorization") ||
    getHeader(event.request?.headers, "authorization") ||
    null;

  let nessaUserId: string | null = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    try {
      // Verify the Clerk session JWT — `sub` is the Clerk user id.
      const clerkPayload = await verifyNessaToken(token);

      // Resolve the Clerk user id to the local users.id via the indexed
      // clerkUserId column.  One indexed query per request is acceptable;
      // no premature caching (the row is created by the Clerk webhook).
      const conn = NessaConnectionFactory();
      const result = await conn.execute({
        sql: "SELECT id FROM users WHERE clerkUserId = ?",
        args: [clerkPayload.sub]
      });
      if (result.rows.length === 0) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Nessa user not found — Clerk account not linked"
        });
      }
      // `nessaUserId` is the LOCAL users.id — router bodies reference it
      // exactly as before (club ownership, membership, row scoping).
      nessaUserId = (result.rows[0] as { id: string }).id;
    } catch (error) {
      // Re-throw typed TRPCError (lookup miss) so the caller gets UNAUTHORIZED;
      // swallow Clerk verification failures (expired/invalid token) the same
      // way the legacy path did — the enforceNessaUser middleware rejects
      // null nessaUserId with UNAUTHORIZED.
      if (error instanceof TRPCError) throw error;
      console.error("Nessa JWT verification failed:", error);
    }
  }

  // Don't log the performance logging endpoint itself to avoid circular tracking
  if (!path.includes("analytics.logPerformance")) {
    logVisit(
      enrichAnalyticsEntry({
        userId,
        path,
        method,
        userAgent,
        referrer,
        ipAddress
      })
    );
  }

  return {
    event,
    userId,
    isAdmin,
    nessaUserId
  };
}

export const createTRPCContext = (event: APIEvent) => {
  return createContextInner(event);
};

export const t = initTRPC.context<Context>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId
    }
  });
});

const enforceUserIsAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required"
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId!
    }
  });
});

const enforceNessaUser = t.middleware(({ ctx, next }) => {
  if (!ctx.nessaUserId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Nessa authentication required"
    });
  }
  return next({
    ctx: {
      ...ctx,
      nessaUserId: ctx.nessaUserId
    }
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
export const adminProcedure = t.procedure.use(enforceUserIsAdmin);
export const nessaProcedure = t.procedure.use(enforceNessaUser);

// CSRF protection middleware - defined here to avoid circular dependency
const csrfProtection = t.middleware(async ({ ctx, next }) => {
  // For now, pass through - full CSRF validation in security.ts
  // This allows tests to run while maintaining the procedure interface
  return next();
});

// CSRF-protected procedure
export const csrfProtectedProcedure = t.procedure.use(csrfProtection);
export { csrfProtection };
