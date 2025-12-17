import conditions from "@/lineage-json/conditions-route/conditions.json";
import debilitations from "@/lineage-json/conditions-route/debilitations.json";
import sanityDebuffs from "@/lineage-json/conditions-route/sanityDebuffs.json";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    conditions,
    debilitations,
    sanityDebuffs,
  });
}
