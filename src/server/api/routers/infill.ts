import { publicProcedure, createTRPCRouter } from "~/server/api/utils";
import { env } from "~/env/server";

export const infillRouter = createTRPCRouter({
  getConfig: publicProcedure.query(({ ctx }) => {
    // Only admins get the config
    if (ctx.privilegeLevel !== "admin") {
      return { endpoint: null, token: null };
    }

    // Return endpoint and token (or null if not configured)
    // Now supports both desktop and mobile (fullscreen mode)
    return {
      endpoint: env.VITE_INFILL_ENDPOINT || null,
      token: env.INFILL_BEARER_TOKEN || null
    };
  })
});
