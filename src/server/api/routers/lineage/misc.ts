import { createTRPCRouter, publicProcedure } from "../../utils";
import { z } from "zod";
import { LineageConnectionFactory } from "~/server/utils";
import { env } from "~/env/server";
import { TRPCError } from "@trpc/server";

export const lineageMiscRouter = createTRPCRouter({
  analytics: publicProcedure
    .input(
      z.object({
        playerID: z.string(),
        dungeonProgression: z.record(z.unknown()),
        playerClass: z.string(),
        spellCount: z.number(),
        proficiencies: z.record(z.unknown()),
        jobs: z.record(z.unknown()),
        resistanceTable: z.record(z.unknown()),
        damageTable: z.record(z.unknown()),
      })
    )
    .mutation(async ({ input }) => {
      const {
        playerID,
        dungeonProgression,
        playerClass,
        spellCount,
        proficiencies,
        jobs,
        resistanceTable,
        damageTable,
      } = input;

      const conn = LineageConnectionFactory();

      try {
        const res = await conn.execute({
          sql: `
            INSERT OR REPLACE INTO Analytics 
              (playerID, dungeonProgression, playerClass, spellCount, proficiencies, jobs, resistanceTable, damageTable)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            playerID,
            JSON.stringify(dungeonProgression),
            playerClass,
            spellCount,
            JSON.stringify(proficiencies),
            JSON.stringify(jobs),
            JSON.stringify(resistanceTable),
            JSON.stringify(damageTable),
          ],
        });

        return { success: true, status: 200 };
      } catch (e) {
        console.error("Analytics error:", e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to store analytics",
        });
      }
    }),

  tokens: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const { token } = input;

      if (!token) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Missing token in body",
        });
      }

      const conn = LineageConnectionFactory();
      const query = "SELECT * FROM Token WHERE token = ?";
      const res = await conn.execute({ sql: query, args: [token] });

      if (res.rows.length > 0) {
        const queryUpdate =
          "UPDATE Token SET last_updated_at = datetime('now') WHERE token = ?";
        const resUpdate = await conn.execute({ sql: queryUpdate, args: [token] });
        return { success: true, action: "updated", result: resUpdate };
      } else {
        const queryInsert = "INSERT INTO Token (token) VALUES (?)";
        const resInsert = await conn.execute({ sql: queryInsert, args: [token] });
        return { success: true, action: "inserted", result: resInsert };
      }
    }),

  offlineSecret: publicProcedure.query(() => {
    return { secret: env.LINEAGE_OFFLINE_SERIALIZATION_SECRET };
  }),
});
