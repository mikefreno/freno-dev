import { authRouter } from "./routers/auth";
import { auditRouter } from "./routers/audit";
import { analyticsRouter } from "./routers/analytics";
import { databaseRouter } from "./routers/database";
import { lineageRouter } from "./routers/lineage";
import { miscRouter } from "./routers/misc";
import { userRouter } from "./routers/user";
import { blogRouter } from "./routers/blog";
import { gitActivityRouter } from "./routers/git-activity";
import { postHistoryRouter } from "./routers/post-history";
import { infillRouter } from "./routers/infill";
import { createTRPCRouter, createTRPCContext } from "./utils";
import type { H3Event } from "h3";

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
  infill: infillRouter
});

export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for tRPC procedures
 * This allows calling tRPC procedures directly on the server with proper context
 */
export const createCaller = async (event: H3Event) => {
  const apiEvent = { nativeEvent: event, request: event.node.req } as any;
  const ctx = await createTRPCContext(apiEvent);
  return appRouter.createCaller(ctx);
};
