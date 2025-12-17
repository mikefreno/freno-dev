import { LINEAGE_JWT_EXPIRY, LineageConnectionFactory } from "@/app/utils";
import { NextRequest, NextResponse } from "next/server";
import { checkPassword } from "../../../passwordHashing";
import jwt from "jsonwebtoken";
import { env } from "@/env.mjs";

interface InputData {
  email: string;
  password: string;
}

export async function POST(input: NextRequest) {
  const inputData = (await input.json()) as InputData;
  const { email, password } = inputData;
  if (email && password) {
    if (password.length < 8) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: "Invalid Credentials",
        }),
        { status: 401, headers: { "content-type": "application/json" } },
      );
    }
    const conn = LineageConnectionFactory();
    const query = `SELECT * FROM User WHERE email = ? AND provider = ? LIMIT 1`;
    const params = [email, "email"];
    const res = await conn.execute({ sql: query, args: params });
    if (res.rows.length == 0) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: "Invalid Credentials",
        }),
        { status: 401, headers: { "content-type": "application/json" } },
      );
    }
    const user = res.rows[0];
    if (user.email_verified === 0) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: "Email not yet verified!",
        }),
        { status: 401, headers: { "content-type": "application/json" } },
      );
    }
    const valid = await checkPassword(password, user.password_hash as string);
    if (!valid) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: "Invalid Credentials",
        }),
        { status: 401, headers: { "content-type": "application/json" } },
      );
    }

    // create token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      env.JWT_SECRET_KEY,
      { expiresIn: LINEAGE_JWT_EXPIRY },
    );

    return NextResponse.json({
      success: true,
      message: "Login successful",
      token: token,
      email: email,
    });
  } else {
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: "Missing required fields",
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
}
