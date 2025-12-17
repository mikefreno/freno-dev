import dungeons from "@/lineage-json/dungeon-route/dungeons.json";
import specialEncounters from "@/lineage-json/dungeon-route/specialEncounters.json";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, dungeons, specialEncounters });
}
