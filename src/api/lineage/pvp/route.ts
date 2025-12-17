import { LineageConnectionFactory } from "@/app/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { character, linkID, pushToken, pushCurrentlyEnabled } =
    await req.json();

  try {
    const conn = LineageConnectionFactory();
    const res = await conn.execute({
      sql: `SELECT * FROM PvP_Characters WHERE linkID = ?`,
      args: [linkID],
    });
    if (res.rows.length == 0) {
      //create
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
      return NextResponse.json({
        ok: true,
        winCount: 0,
        lossCount: 0,
        tokenRedemptionCount: 0,
        status: 201,
      });
    } else {
      //update
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
      return NextResponse.json({
        ok: true,
        winCount: res.rows[0].winCount,
        lossCount: res.rows[0].lossCount,
        tokenRedemptionCount: res.rows[0].tokenRedemptionCount,
        status: 200,
      });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, status: 500 });
  }
}

export async function GET() {
  // Get three opponents, high, med, low, based on win/loss ratio
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
      `,
    );
    return NextResponse.json({
      ok: true,
      characters: res.rows,
      status: 200,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, status: 500 });
  }
}
