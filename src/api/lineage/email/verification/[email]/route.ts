import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env.mjs";
import jwt, { JwtPayload } from "jsonwebtoken";
import { LineageConnectionFactory, LineageDBInit } from "@/app/utils";
import { createClient as createAPIClient } from "@tursodatabase/api";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ email: string }> },
) {
  const secretKey = env.JWT_SECRET_KEY;
  const params = request.nextUrl.searchParams;
  const token = params.get("token");
  const userEmail = (await context.params).email;

  let conn;
  let dbName;
  let dbToken;

  try {
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication failed: no token" },
        { status: 401, headers: { "content-type": "application/json" } },
      );
    }

    const decoded = jwt.verify(token, secretKey) as JwtPayload;
    if (decoded.email !== userEmail) {
      return NextResponse.json(
        { success: false, message: "Authentication failed: email mismatch" },
        { status: 401, headers: { "content-type": "application/json" } },
      );
    }

    conn = LineageConnectionFactory();
    const dbInit = await LineageDBInit();
    dbName = dbInit.dbName;
    dbToken = dbInit.token;

    const query = `UPDATE User SET email_verified = ?, database_name = ?, database_token = ? WHERE email = ?`;
    const queryParams = [true, dbName, dbToken, userEmail];
    const res = await conn.execute({ sql: query, args: queryParams });

    if (res.rowsAffected === 0) {
      throw new Error("User not found or update failed");
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        message:
          "Email verification success. You may close this window and sign in within the app.",
      }),
      { status: 202, headers: { "content-type": "application/json" } },
    );
  } catch (err) {
    console.error("Error in email verification:", err);

    // Delete the database if it was created
    if (dbName) {
      try {
        const turso = createAPIClient({
          org: "mikefreno",
          token: env.TURSO_DB_API_TOKEN,
        });
        await turso.databases.delete(dbName);
        console.log(`Database ${dbName} deleted due to error`);
      } catch (deleteErr) {
        console.error("Error deleting database:", deleteErr);
      }
    }

    // Attempt to revert the User table update if conn is available
    if (conn) {
      try {
        await conn.execute({
          sql: `UPDATE User SET email_verified = ?, database_name = ?, database_token = ? WHERE email = ?`,
          args: [false, null, null, userEmail],
        });
        console.log("User table update reverted");
      } catch (revertErr) {
        console.error("Error reverting User table update:", revertErr);
      }
    }

    return new NextResponse(
      JSON.stringify({
        success: false,
        message:
          "Authentication failed: An error occurred during email verification. Please try again.",
      }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}
