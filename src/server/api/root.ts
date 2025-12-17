import { exampleRouter } from "./routers/example";
import { authRouter } from "./routers/auth";
import { databaseRouter } from "./routers/database";
import { lineageRouter } from "./routers/lineage";
import { miscRouter } from "./routers/misc";
import { userRouter } from "./routers/user";
import { createTRPCRouter } from "./utils";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  auth: authRouter,
  database: databaseRouter,
  lineage: lineageRouter,
  misc: miscRouter,
  user: userRouter
});

export type AppRouter = typeof appRouter;
