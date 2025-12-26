import { publicProcedure, createTRPCRouter } from "~/server/api/utils";
import { env } from "~/env/server";

// Helper to detect mobile devices from User-Agent
const isMobileDevice = (userAgent: string | undefined): boolean => {
  if (!userAgent) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    userAgent
  );
};

export const infillRouter = createTRPCRouter({
  getConfig: publicProcedure.query(({ ctx }) => {
    // Only admins get the config
    if (ctx.privilegeLevel !== "admin") {
      return { endpoint: null, token: null };
    }

    // Get User-Agent from request headers
    const userAgent = ctx.event.nativeEvent.node.req.headers["user-agent"];

    // Block mobile devices - infill is desktop only
    if (isMobileDevice(userAgent)) {
      return { endpoint: null, token: null };
    }

    // Return endpoint and token (or null if not configured)
    return {
      endpoint: env.VITE_INFILL_ENDPOINT || null,
      token: env.INFILL_BEARER_TOKEN || null
    };
  })
});
