import { LineageConnectionFactory, validateLineageRequest } from "@/app/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({
      status: 401,
      ok: false,
      message: "Missing or invalid authorization header.",
    });
  }
  const auth_token = authHeader.split(" ")[1];

  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({
      status: 400,
      ok: false,
      message: "Email is required to cancel the cron job.",
    });
  }

  const conn = LineageConnectionFactory();

  const resUser = await conn.execute({
    sql: `SELECT * FROM User WHERE email = ?;`,
    args: [email],
  });
  if (resUser.rows.length === 0) {
    return NextResponse.json({
      status: 404,
      ok: false,
      message: "User not found.",
    });
  }
  const userRow = resUser.rows[0];
  if (!userRow) {
    return NextResponse.json({ status: 404, ok: false });
  }

  const valid = await validateLineageRequest({ auth_token, userRow });
  if (!valid) {
    return NextResponse.json({
      status: 401,
      ok: false,
      message: "Invalid credentials for cancelation.",
    });
  }

  const result = await conn.execute({
    sql: `DELETE FROM cron WHERE email = ?;`,
    args: [email],
  });

  if (result.rowsAffected > 0) {
    return NextResponse.json({
      status: 200,
      ok: true,
      message: "Cron job(s) canceled successfully.",
    });
  } else {
    return NextResponse.json({
      status: 404,
      ok: false,
      message: "No cron job found for the given email.",
    });
  }
}
