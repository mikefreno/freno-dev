import { LineageConnectionFactory } from "@/app/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const {
    playerID,
    dungeonProgression,
    playerClass,
    spellCount,
    proficiencies,
    jobs,
    resistanceTable,
    damageTable,
  } = await req.json();
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
    console.log(res);

    return NextResponse.json({ status: 200 });
  } catch (e) {
    console.error(e);

    return NextResponse.json({ status: 500 });
  }
}
