import { createTRPCRouter, protectedProcedure, csrfProtectedProcedure } from "../utils";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getProviderSummary, unlinkProvider } from "~/server/provider-helpers";

export const accountRouter = createTRPCRouter({
  /**
   * Get all linked authentication providers for current user
   */
  getLinkedProviders: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.userId!;
      const summary = await getProviderSummary(userId);

      return {
        success: true,
        providers: summary.providers,
        count: summary.count
      };
    } catch (error) {
      console.error("Error fetching linked providers:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch linked providers"
      });
    }
  }),

  /**
   * Unlink an authentication provider
   */
  unlinkProvider: csrfProtectedProcedure
    .input(
      z.object({
        provider: z.enum(["email", "google", "github"])
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.userId!;
        const { provider } = input;

        await unlinkProvider(userId, provider);

        return {
          success: true,
          message: `${provider} authentication unlinked successfully`
        };
      } catch (error) {
        console.error("Error unlinking provider:", error);

        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to unlink provider"
        });
      }
    })
});
