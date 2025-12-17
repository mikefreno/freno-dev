import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse(process.env.LINEAGE_OFFLINE_SERIALIZATION_SECRET);
}
