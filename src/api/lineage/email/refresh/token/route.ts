import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { env } from "@/env.mjs";
import { LINEAGE_JWT_EXPIRY } from "@/app/utils";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new NextResponse(JSON.stringify({ valid: false }), { status: 401 });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET_KEY) as jwt.JwtPayload;

    const newToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email },
      env.JWT_SECRET_KEY,
      { expiresIn: LINEAGE_JWT_EXPIRY },
    );

    return NextResponse.json({
      status: 200,
      ok: true,
      valid: true,
      token: newToken,
      email: decoded.email,
    });
  } catch (error) {
    return NextResponse.json({ status: 401, ok: false });
  }
}
