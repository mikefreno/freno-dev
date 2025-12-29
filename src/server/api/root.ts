import { exampleRouter } from "./routers/example";
import { authRouter } from "./routers/auth";
import { auditRouter } from "./routers/audit";
import { databaseRouter } from "./routers/database";
import { lineageRouter } from "./routers/lineage";
import { miscRouter } from "./routers/misc";
import { userRouter } from "./routers/user";
import { blogRouter } from "./routers/blog";
import { gitActivityRouter } from "./routers/git-activity";
import { postHistoryRouter } from "./routers/post-history";
import { infillRouter } from "./routers/infill";
import { createTRPCRouter } from "./utils";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  auth: authRouter,
  audit: auditRouter,
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
