import { ConnectionFactory } from "@/app/utils";
import { env } from "@/env.mjs";
import { changeImageInput } from "@/types/input-types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const conn = ConnectionFactory();
  const query = "SELECT * FROM User WHERE id = ?";
  const params = await context.params;
  const idArr = [params.id];
  const results = await conn.execute({ sql: query, args: idArr });
  return NextResponse.json({ user: results.rows[0] }, { status: 200 });
}
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const inputData = (await request.json()) as changeImageInput;
  const { imageURL } = inputData;
  try {
    const conn = ConnectionFactory();
    const query = `UPDATE User SET image = ? WHERE id = ?`;
    const fullURL = env.NEXT_PUBLIC_AWS_BUCKET_STRING + imageURL;
    const params = [imageURL ? fullURL : null, (await context.params).id];
    await conn.execute({ sql: query, args: params });
    return NextResponse.json({ res: "success" }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ res: err }, { status: 500 });
  }
}
