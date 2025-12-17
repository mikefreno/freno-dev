import { createTRPCRouter, publicProcedure } from "../../utils";
import { z } from "zod";
import { LineageConnectionFactory } from "~/server/utils";
import { TRPCError } from "@trpc/server";

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
  knownSpells: z.string(),
});

export const lineagePvpRouter = createTRPCRouter({
  registerCharacter: publicProcedure
    .input(
      z.object({
        character: characterSchema,
        linkID: z.string(),
        pushToken: z.string().optional(),
        pushCurrentlyEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { character, linkID, pushToken, pushCurrentlyEnabled } = input;

      try {
        const conn = LineageConnectionFactory();
        const res = await conn.execute({
          sql: `SELECT * FROM PvP_Characters WHERE linkID = ?`,
          args: [linkID],
        });

        if (res.rows.length === 0) {
          await conn.execute({
            sql: `INSERT INTO PvP_Characters (
                    linkID,
                    blessing,
                    playerClass, 
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
                    pushToken, 
                    pushCurrentlyEnabled
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              linkID,
              character.blessing,
              character.playerClass,
              character.name,
              character.maxHealth,
              character.maxSanity,
              character.maxMana,
              character.baseManaRegen,
              character.strength,
              character.intelligence,
              character.dexterity,
              character.resistanceTable,
              character.damageTable,
              character.attackStrings,
              character.knownSpells,
              pushToken,
              pushCurrentlyEnabled,
            ],
          });

          return {
            ok: true,
            winCount: 0,
            lossCount: 0,
            tokenRedemptionCount: 0,
            status: 201,
          };
        } else {
          await conn.execute({
            sql: `UPDATE PvP_Characters SET 
                  playerClass = ?,
                  blessing = ?,
                  name = ?, 
                  maxHealth = ?, 
                  maxSanity = ?, 
                  maxMana = ?, 
                  baseManaRegen = ?, 
                  strength = ?, 
                  intelligence = ?, 
                  dexterity = ?, 
                  resistanceTable = ?, 
                  damageTable = ?, 
                  attackStrings = ?, 
                  knownSpells = ?, 
                  pushToken = ?, 
                  pushCurrentlyEnabled = ?
                  WHERE linkID = ?`,
            args: [
              character.playerClass,
              character.blessing,
              character.name,
              character.maxHealth,
              character.maxSanity,
              character.maxMana,
              character.baseManaRegen,
              character.strength,
              character.intelligence,
              character.dexterity,
              character.resistanceTable,
              character.damageTable,
              character.attackStrings,
              character.knownSpells,
              pushToken,
              pushCurrentlyEnabled,
              linkID,
            ],
          });

          return {
            ok: true,
            winCount: res.rows[0].winCount as number,
            lossCount: res.rows[0].lossCount as number,
            tokenRedemptionCount: res.rows[0].tokenRedemptionCount as number,
            status: 200,
          };
        }
      } catch (e) {
        console.error(e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to register character",
        });
      }
    }),

  getOpponents: publicProcedure.query(async () => {
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
        status: 200,
      };
    } catch (e) {
      console.error(e);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get opponents",
      });
    }
  }),

  battleResult: publicProcedure
    .input(
      z.object({
        winnerLinkID: z.string(),
        loserLinkID: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { winnerLinkID, loserLinkID } = input;

      const conn = LineageConnectionFactory();

      try {
        await conn.execute({
          sql: `
            UPDATE PvP_Characters
            SET
              winCount = winCount + CASE WHEN linkID = ? THEN 1 ELSE 0 END,
              lossCount = lossCount + CASE WHEN linkID = ? THEN 1 ELSE 0 END
            WHERE linkID IN (?, ?)
          `,
          args: [winnerLinkID, loserLinkID, winnerLinkID, loserLinkID],
        });

        return {
          ok: true,
          status: 200,
        };
      } catch (e) {
        console.error(e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to record battle result",
        });
      }
    }),
});
