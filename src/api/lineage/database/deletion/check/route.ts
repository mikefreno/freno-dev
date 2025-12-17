import { LineageConnectionFactory } from "@/app/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const conn = LineageConnectionFactory();
  try {
    const res = await conn.execute({
      sql: `SELECT * FROM cron WHERE email = ?`,
      args: [email],
    });
    const cronRow = res.rows[0];
    if (!cronRow) {
      return NextResponse.json({ status: 204, ok: true });
    }
    return NextResponse.json({
      ok: true,
      status: 200,
      created_at: cronRow.created_at,
    });
  } catch (e) {
    return NextResponse.json({ status: 500, ok: false });
  }
}
