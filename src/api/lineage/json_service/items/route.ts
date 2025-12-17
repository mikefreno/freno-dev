import { NextResponse } from "next/server";
import arrows from "@/lineage-json/item-route/arrows.json";
import bows from "@/lineage-json/item-route/bows.json";
import foci from "@/lineage-json/item-route/foci.json";
import hats from "@/lineage-json/item-route/hats.json";
import junk from "@/lineage-json/item-route/junk.json";
import melee from "@/lineage-json/item-route/melee.json";
import robes from "@/lineage-json/item-route/robes.json";
import wands from "@/lineage-json/item-route/wands.json";
import ingredients from "@/lineage-json/item-route/ingredients.json";
import storyItems from "@/lineage-json/item-route/storyItems.json";
import artifacts from "@/lineage-json/item-route/artifacts.json";
import shields from "@/lineage-json/item-route/shields.json";
import bodyArmor from "@/lineage-json/item-route/bodyArmor.json";
import helmets from "@/lineage-json/item-route/helmets.json";
import suffix from "@/lineage-json/item-route/suffix.json";
import prefix from "@/lineage-json/item-route/prefix.json";
import potions from "@/lineage-json/item-route/potions.json";
import poison from "@/lineage-json/item-route/poison.json";
import staves from "@/lineage-json/item-route/staves.json";

export async function GET() {
  return NextResponse.json({
    ok: true,
    arrows,
    bows,
    foci,
    hats,
    junk,
    melee,
    robes,
    wands,
    ingredients,
    storyItems,
    artifacts,
    shields,
    bodyArmor,
    helmets,
    suffix,
    prefix,
    potions,
    poison,
    staves,
  });
}
