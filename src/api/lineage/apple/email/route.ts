import { LineageConnectionFactory } from "@/app/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { userString } = await req.json();
  if (!userString) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: "Missing required fields",
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  const conn = LineageConnectionFactory();
  const query = "SELECT * FROM User WHERE apple_user_string = ?";
  const res = await conn.execute({ sql: query, args: [userString] });
  if (res.rows.length > 0) {
    return NextResponse.json(
      { success: true, email: res.rows[0].email },
      { status: 200 },
    );
  } else {
    return NextResponse.json({ success: false }, { status: 404 });
  }
}
