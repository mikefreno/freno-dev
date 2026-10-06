import {
  createTRPCRouter,
  publicProcedure,
  csrfProtectedProcedure
} from "../../utils";
import { z } from "zod";
import { LineageConnectionFactory } from "~/server/utils";
import { verifyLineageAuthToken } from "~/server/auth";
import { TRPCError } from "@trpc/server";
import type { APIEvent } from "@solidjs/start/server";
import {
  purchaseReward,
  recordBattleResult,
  registerPvpCharacter
} from "./pvp-ledger";

const characterSchema = z.object({
  playerClass: z.string(),
  blessing: z.string().optional(),
  name: z.string(),
  maxHealth: z.number(),
  maxSanity: z.number(),
  maxMana: z.number(),
  baseManaRegen: z.number(),
  strength: z.number(),
  intelligence: z.number(),
  dexterity: z.number(),
  resistanceTable: z.string(),
  damageTable: z.string(),
  attackStrings: z.string(),
  knownSpells: z.string()
});

/**
 * Extract the caller's Lineage user id from the Authorization bearer.
 *
 * FRE-142 / p8-004: the mobile client attaches its Lineage email JWT to all
 * `/pvp*` requests (`authHeaders()` in PVPStore). Verifying it here binds
 * every earn/spend mutation to an authenticated owner — anonymous callers
 * can register (legacy behaviour) but cannot earn or spend.
 */
async function authenticatedUserId(
  event: APIEvent
): Promise<string | null> {
  const header = event.request?.headers?.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  if (!token) return null;
  const payload = await verifyLineageAuthToken(token);
  return payload?.userId ?? null;
}

export const lineagePvpRouter = createTRPCRouter({
  registerCharacter: csrfProtectedProcedure
    .input(
      z.object({
        character: characterSchema,
        linkID: z.string(),
        pushToken: z.string().optional(),
        pushCurrentlyEnabled: z.boolean().optional(),
        // The caller's cached local balance — used only to seed the
        // server-authoritative ledger exactly once (pre-FRE-142 migration).
        // After that the server value is authoritative and this is ignored.
        pvpTokens: z.number().int().min(0).nullish()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { character, linkID, pvpTokens } = input;

      try {
        const conn = LineageConnectionFactory();
        const ownerUserId = await authenticatedUserId(ctx.event);
        return await registerPvpCharacter(conn, {
          character,
          linkID,
          ownerUserId,
          seedTokens: pvpTokens ?? null
        });
      } catch (e) {
        console.error(e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to register character"
        });
      }
    }),

  getOpponents: publicProcedure
    .query(async () => {
      const conn = LineageConnectionFactory();

      try {
        const res = await conn.execute(
          `
          SELECT playerClass,
                 blessing,
                 name,
                 maxHealth,
                 maxSanity,
                 maxMana,
                 baseManaRegen,
                 strength,
                 intelligence,
                 dexterity,
                 resistanceTable,
                 damageTable,
                 attackStrings,
                 knownSpells,
                 linkID,
                 winCount,
                 lossCount
          FROM PvP_Characters
          ORDER BY RANDOM()
          LIMIT 3
        `
        );

        return {
          ok: true,
          characters: res.rows,
          status: 200
        };
      } catch (e) {
        console.error(e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get opponents"
        });
      }
    }),

  battleResult: csrfProtectedProcedure
    .input(
      z.object({
        winnerLinkID: z.string(),
        loserLinkID: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { winnerLinkID, loserLinkID } = input;

      const callerUserId = await authenticatedUserId(ctx.event);
      if (!callerUserId) {
        // p8-004: unauthenticated callers can no longer report (and mint)
        // battle results — earnings are server-authoritative (FRE-142).
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required to report battle results"
        });
      }

      const conn = LineageConnectionFactory();

      try {
        const result = await recordBattleResult(conn, {
          winnerLinkID,
          loserLinkID,
          callerUserId
        });
        if (!result.ok) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Caller is not a participant in this battle"
          });
        }
        return result;
      } catch (e) {
        if (e instanceof TRPCError) throw e;
        console.error(e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to record battle result"
        });
      }
    }),

  /**
   * FRE-142: server-authoritative Blood Token purchase. The cost comes from
   * the server's own reward table (never the client), the spend is a single
   * conditional UPDATE (atomic check-and-spend), and the cooldown is stamped
   * in the row so it survives serverless cold starts. Returns the new
   * authoritative balance on success; `reason` explains a refusal.
   */
  purchase: csrfProtectedProcedure
    .input(
      z.object({
        linkID: z.string().min(1),
        rewardId: z.number().int()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { linkID, rewardId } = input;

      const callerUserId = await authenticatedUserId(ctx.event);
      if (!callerUserId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required to purchase rewards"
        });
      }

      const conn = LineageConnectionFactory();

      try {
        return await purchaseReward(conn, {
          linkID,
          callerUserId,
          rewardId
        });
      } catch (e) {
        console.error(e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to purchase reward"
        });
      }
    })
});
