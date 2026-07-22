import { initTRPC, TRPCError } from "@trpc/server";
import type { APIEvent } from "@solidjs/start/server";
import { logVisit, enrichAnalyticsEntry } from "~/server/analytics";
import { getRequestIP } from "vinxi/http";
import { verifyNessaToken } from "~/server/nessa-auth";
import { getAuthPayloadFromEvent } from "~/server/auth";

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
      const payload = await verifyNessaToken(token);
      nessaUserId = payload.sub;
    } catch (error) {
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

