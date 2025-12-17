import { JwtPayload } from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { env } from "@/env.mjs";
import { cookies } from "next/headers";
import { User } from "@/types/model-types";
import { ConnectionFactory } from "@/app/utils";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ email: string }> },
) {
  const readyParams = await context.params;
  const secretKey = env.JWT_SECRET_KEY;
  const params = request.nextUrl.searchParams;
  const token = params.get("token");
  const userEmail = readyParams.email;
  try {
    if (token) {
      const decoded = jwt.verify(token, secretKey) as JwtPayload;
      if (decoded.email == userEmail) {
        const conn = ConnectionFactory();
        const query = `SELECT * FROM User WHERE email = ?`;
        const params = [decoded.email];
        const res = await conn.execute({ sql: query, args: params });
        const token = jwt.sign(
          { id: (res.rows[0] as unknown as User).id },
          env.JWT_SECRET_KEY,
          {
            expiresIn: 60 * 60 * 24 * 14, // expires in 14 days
          },
        );
        if (decoded.rememberMe) {
          (await cookies()).set({
            name: "userIDToken",
            value: token,
            maxAge: 60 * 60 * 24 * 14,
          });
        } else {
          (await cookies()).set({
            name: "userIDToken",
            value: token,
          });
        }
        return NextResponse.redirect(`${env.NEXT_PUBLIC_DOMAIN}/account`);
      }
    }
    return NextResponse.json(
      JSON.stringify({
        success: false,
        message: `authentication failed: no token`,
      }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  } catch (err) {
    return NextResponse.json(
      JSON.stringify({
        success: false,
        message: `authentication failed: ${err}`,
      }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }
}
