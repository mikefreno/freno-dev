import { publicProcedure, createTRPCRouter } from "~/server/api/utils";
import { env } from "~/env/server";

export const infillRouter = createTRPCRouter({
  getConfig: publicProcedure.query(({ ctx }) => {
    if (ctx.privilegeLevel !== "admin") {
      return { endpoint: null, token: null };
    }

    return {
      endpoint: env.VITE_INFILL_ENDPOINT || null,
      token: env.INFILL_BEARER_TOKEN || null
    };
  })
});
