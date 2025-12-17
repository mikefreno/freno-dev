import { LineageConnectionFactory } from "@/app/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) {
    return new NextResponse(
      JSON.stringify({ success: false, message: "missing token in body" }),
      {
        status: 401,
      },
    );
  }
  const conn = LineageConnectionFactory();
  const query = "SELECT * FROM Token WHERE token = ?";
  const res = await conn.execute({ sql: query, args: [token] });
  if (res.rows.length > 0) {
    const queryUpdate =
      "UPDATE Token SET last_updated_at = datetime('now') WHERE token = ?";
    const resUpdate = await conn.execute({ sql: queryUpdate, args: [token] });
    return NextResponse.json(JSON.stringify(resUpdate));
  } else {
    const queryInsert = "INSERT INTO Token (token) VALUES (?)";
    const resInsert = await conn.execute({ sql: queryInsert, args: [token] });
    return NextResponse.json(JSON.stringify(resInsert));
  }
}
