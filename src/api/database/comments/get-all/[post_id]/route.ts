import { ConnectionFactory } from "@/app/utils";
import { NextResponse } from "next/server";

export async function GET(
  _: Request,
  context: {
    params: Promise<{ post_id: string }>;
  },
) {
  const readyParams = await context.params;
  const conn = ConnectionFactory();
  const query = `SELECT * FROM Comment WHERE post_id = ?`;
  const params = [readyParams.post_id];
  const res = await conn.execute({ sql: query, args: params });
  return NextResponse.json({ comments: res.rows }, { status: 302 });
}
