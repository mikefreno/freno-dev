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
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      },
    );
    const { access_token } = await tokenResponse.json();

    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${access_token}`,
      },
    });

    const user = await userResponse.json();
    const login = user.login;
    const conn = ConnectionFactory();

    const query = `SELECT * FROM User WHERE provider = ? AND display_name = ?`;
    const params = ["github", login];
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
      const icon = user.avatar_url;
      const email = user.email;
      const userId = uuidV4();

      const insertQuery = `INSERT INTO User (id, email, display_name, provider, image) VALUES (?, ?, ?, ?, ?)`;
      const insertParams = [userId, email, login, "github", icon];
      await conn.execute({ sql: insertQuery, args: insertParams });
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
