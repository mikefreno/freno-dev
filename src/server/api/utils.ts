import { initTRPC, TRPCError } from "@trpc/server";
import type { APIEvent } from "@solidjs/start/server";
import { getCookie, setCookie } from "vinxi/http";
import { jwtVerify, type JWTPayload } from "jose";
import { env } from "~/env/server";
import { logVisit, enrichAnalyticsEntry } from "~/server/analytics";
import { getRequestIP } from "vinxi/http";

export type Context = {
  event: APIEvent;
  userId: string | null;
  privilegeLevel: "anonymous" | "user" | "admin";
};

async function createContextInner(event: APIEvent): Promise<Context> {
  const userIDToken = getCookie(event.nativeEvent, "userIDToken");

  let userId: string | null = null;
  let privilegeLevel: "anonymous" | "user" | "admin" = "anonymous";

  if (userIDToken) {
    try {
      const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
      const { payload } = await jwtVerify(userIDToken, secret);

      if (payload.id && typeof payload.id === "string") {
        userId = payload.id;
        privilegeLevel = payload.id === env.ADMIN_ID ? "admin" : "user";
      }
    } catch (err) {
      setCookie(event.nativeEvent, "userIDToken", "", {
        maxAge: 0,
        expires: new Date("2016-10-05")
      });
    }
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
  const sessionId = getCookie(event.nativeEvent, "session_id") || undefined;

  // Don't log the performance logging endpoint itself to avoid circular tracking
  if (!path.includes("analytics.logPerformance")) {
    logVisit(
      enrichAnalyticsEntry({
        userId,
        path,
        method,
        userAgent,
        referrer,
        ipAddress,
        sessionId
      })
    );
  }

  return {
    event,
    userId,
    privilegeLevel
  };
}

export const createTRPCContext = (event: APIEvent) => {
  return createContextInner(event);
};

export const t = initTRPC.context<Context>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId || ctx.privilegeLevel === "anonymous") {
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
  if (ctx.privilegeLevel !== "admin") {
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

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
export const adminProcedure = t.procedure.use(enforceUserIsAdmin);
