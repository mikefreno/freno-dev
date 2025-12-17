import { NextResponse } from "next/server";
import activities from "@/lineage-json/misc-route/activities.json";
import investments from "@/lineage-json/misc-route/investments.json";
import jobs from "@/lineage-json/misc-route/jobs.json";
import manaOptions from "@/lineage-json/misc-route/manaOptions.json";
import otherOptions from "@/lineage-json/misc-route/otherOptions.json";
import healthOptions from "@/lineage-json/misc-route/healthOptions.json";
import sanityOptions from "@/lineage-json/misc-route/sanityOptions.json";
import pvpRewards from "@/lineage-json/misc-route/pvpRewards.json";

export async function GET() {
  return NextResponse.json({
    ok: true,
    activities,
    investments,
    jobs,
    manaOptions,
    otherOptions,
    healthOptions,
    sanityOptions,
    pvpRewards,
  });
}
