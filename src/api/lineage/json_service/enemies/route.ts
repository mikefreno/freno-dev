import { NextResponse } from "next/server";
import bosses from "@/lineage-json/enemy-route/bosses.json";
import enemies from "@/lineage-json/enemy-route/enemy.json";
import enemyAttacks from "@/lineage-json/enemy-route/enemyAttacks.json";

export async function GET() {
  return NextResponse.json({ ok: true, bosses, enemies, enemyAttacks });
}
