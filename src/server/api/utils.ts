import { initTRPC, TRPCError } from "@trpc/server";
import type { APIEvent } from "@solidjs/start/server";
import { logVisit, enrichAnalyticsEntry } from "~/server/analytics";
import { getRequestIP } from "vinxi/http";
import { verifyCairnToken } from "~/server/cairn-auth";
import { getAuthPayloadFromEvent } from "~/server/auth";

export type Context = {
  event: APIEvent;
  userId: string | null;
  isAdmin: boolean;
  cairnUserId: string | null;
};

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
    req.headers?.["user-agent"] ||
    event.request?.headers?.get("user-agent") ||
    undefined;
  const referrer =
    req.headers?.referer ||
    req.headers?.referrer ||
    event.request?.headers?.get("referer") ||
    undefined;
  const ipAddress = getRequestIP(event.nativeEvent) || undefined;
  const authHeader =
    event.request?.headers?.get("authorization") ||
    req.headers?.authorization ||
    req.headers?.Authorization ||
    null;

  let cairnUserId: string | null = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    try {
      const payload = await verifyCairnToken(token);
      cairnUserId = payload.sub;
    } catch (error) {
      console.error("Cairn JWT verification failed:", error);
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
    cairnUserId
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

const enforceCairnUser = t.middleware(({ ctx, next }) => {
  if (!ctx.cairnUserId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Cairn authentication required"
    });
  }
  return next({
    ctx: {
      ...ctx,
      cairnUserId: ctx.cairnUserId
    }
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
export const adminProcedure = t.procedure.use(enforceUserIsAdmin);
export const cairnProcedure = t.procedure.use(enforceCairnUser);
