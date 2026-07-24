import { authRouter } from "./routers/auth";
import { auditRouter } from "./routers/audit";
import { analyticsRouter } from "./routers/analytics";
import { databaseRouter } from "./routers/database";
import { lineageRouter } from "./routers/lineage";
// Re-exported so the REST shim (src/routes/api/lineage/[...path].ts) can mount
// ONLY the lineage sub-router as the trpc-openapi REST surface — not the
// whole appRouter. Keeps nessa/community/auth/audit routers unreachable via
// `/api/lineage/*`.
export { lineageRouter };
import { miscRouter } from "./routers/misc";
import { userRouter } from "./routers/user";
import { blogRouter } from "./routers/blog";
import { gitActivityRouter } from "./routers/git-activity";
import { postHistoryRouter } from "./routers/post-history";
import { infillRouter } from "./routers/infill";
import { accountRouter } from "./routers/account";
import { downloadsRouter } from "./routers/downloads";
import { nessaDbRouter } from "./routers/nessa";
import { nessaCommunityRouter } from "./routers/nessa-community";
import { appleNotificationsRouter } from "./routers/apple-notifications";
import { createTRPCRouter, createTRPCContext, t } from "./utils";
import type { H3Event } from "h3";
import type { APIEvent } from "@solidjs/start/server";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  audit: auditRouter,
  analytics: analyticsRouter,
  database: databaseRouter,
  lineage: lineageRouter,
  misc: miscRouter,
  user: userRouter,
  blog: blogRouter,
  gitActivity: gitActivityRouter,
  postHistory: postHistoryRouter,
  infill: infillRouter,
  account: accountRouter,
  downloads: downloadsRouter,
  nessaDb: nessaDbRouter,
  // Community features (clubs, challenges, social feed) — ported from the
  // standalone nessa-api Express prototype. Exposes nessa.community.*.
  nessa: createTRPCRouter({ community: nessaCommunityRouter }),
  appleNotifications: appleNotificationsRouter
});

export type AppRouter = typeof appRouter;

/** Server-side caller factory using the modern tRPC pattern */
export const createCallerFactory = t.createCallerFactory(appRouter);

/**
 * Create a server-side caller for tRPC procedures from H3Event (vinxi/http getEvent)
 * Used in server functions within route files
 */
export const createCaller = async (event: H3Event) => {
  const apiEvent = { nativeEvent: event, request: event.node.req } as any;
  const ctx = await createTRPCContext(apiEvent);
  return createCallerFactory(ctx);
};

/**
 * Create a server-side caller for tRPC procedures from APIEvent
 * Used in API route handlers
 */
export const createServerCaller = async (event: APIEvent) => {
  const ctx = await createTRPCContext(event);
  return createCallerFactory(ctx);
};
