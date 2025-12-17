import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidV4 } from "uuid";
import { env } from "@/env.mjs";
import { cookies } from "next/headers";
import { User } from "@/types/model-types";
import jwt from "jsonwebtoken";
import { ConnectionFactory } from "@/app/utils";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  if (code) {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: code,
        client_id: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: "https://www.freno.me/api/auth/callback/google",
        grant_type: "authorization_code",
      }),
    });

    const { access_token } = await tokenResponse.json();

    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
    );

    const userData = await userResponse.json();
    console.log(userData);
    const name = userData.name;
    const image = userData.picture;
    const email = userData.email;
    const email_verified = userData.email_verified;

    const conn = ConnectionFactory();

    const query = `SELECT * FROM User WHERE provider = ? AND email = ?`;
    const params = ["google", email];
    const res = await conn.execute({ sql: query, args: params });
    if (res.rows[0]) {
      const token = jwt.sign(
        { id: (res.rows[0] as unknown as User).id },
        env.JWT_SECRET_KEY,
        {
          expiresIn: 60 * 60 * 24 * 14, // expires in 14 days
        },
      );
      (await cookies()).set({
        name: "userIDToken",
        value: token,
        maxAge: 60 * 60 * 24 * 14,
      });
    } else {
      const userId = uuidV4();

      const insertQuery = `INSERT INTO User (id, email, email_verified, display_name, provider, image) VALUES (?, ?, ?, ?, ?, ?)`;
      const insertParams = [
        userId,
        email,
        email_verified,
        name,
        "google",
        image,
      ];
      await conn.execute({
        sql: insertQuery,
        args: insertParams,
      });
      const token = jwt.sign({ id: userId }, env.JWT_SECRET_KEY, {
        expiresIn: 60 * 60 * 24 * 14, // expires in 14 days
      });
      (await cookies()).set({
        name: "userIDToken",
        value: token,
        maxAge: 60 * 60 * 24 * 14,
      });
    }

    return NextResponse.redirect(`${env.NEXT_PUBLIC_DOMAIN}/account`);
  } else {
    return NextResponse.json(
      JSON.stringify({
        success: false,
        message: `authentication failed: no code on callback`,
      }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }
}
