import playerAttacks from "@/lineage-json/attack-route/playerAttacks.json";
import mageBooks from "@/lineage-json/attack-route/mageBooks.json";
import mageSpells from "@/lineage-json/attack-route/mageSpells.json";
import necroBooks from "@/lineage-json/attack-route/necroBooks.json";
import necroSpells from "@/lineage-json/attack-route/necroSpells.json";
import rangerBooks from "@/lineage-json/attack-route/rangerBooks.json";
import rangerSpells from "@/lineage-json/attack-route/rangerSpells.json";
import paladinBooks from "@/lineage-json/attack-route/paladinBooks.json";
import paladinSpells from "@/lineage-json/attack-route/paladinSpells.json";
import summons from "@/lineage-json/attack-route/summons.json";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    playerAttacks,
    mageBooks,
    mageSpells,
    necroBooks,
    necroSpells,
    rangerBooks,
    rangerSpells,
    paladinBooks,
    paladinSpells,
    summons,
  });
}
