import { LineageConnectionFactory, LineageDBInit } from "@/app/utils";
import { NextRequest, NextResponse } from "next/server";

import { createClient as createAPIClient } from "@tursodatabase/api";
import { env } from "@/env.mjs";

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  if (!email) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: "Missing required fields",
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const conn = LineageConnectionFactory();

  try {
    // Check if the user exists
    const checkUserQuery = "SELECT * FROM User WHERE email = ?";
    const checkUserResult = await conn.execute({
      sql: checkUserQuery,
      args: [email],
    });

    if (checkUserResult.rows.length > 0) {
      const updateQuery = `
        UPDATE User 
        SET provider = ?
        WHERE email = ?
      `;
      const updateRes = await conn.execute({
        sql: updateQuery,
        args: ["google", email],
      });

      if (updateRes.rowsAffected != 0) {
        return new NextResponse(
          JSON.stringify({
            success: true,
            message: "User information updated",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      } else {
        return new NextResponse(
          JSON.stringify({
            success: false,
            message: "User update failed!",
          }),
          { status: 418, headers: { "content-type": "application/json" } },
        );
      }
    } else {
      // User doesn't exist, insert new user and init database
      let db_name;
      try {
        const { token, dbName } = await LineageDBInit();
        db_name = dbName;
        console.log("init success");
        const insertQuery = `
        INSERT INTO User (email, email_verified, provider, database_name, database_token)
        VALUES (?, ?, ?, ?, ?)
      `;
        await conn.execute({
          sql: insertQuery,
          args: [email, true, "google", dbName, token],
        });

        console.log("insert success");

        return new NextResponse(
          JSON.stringify({
            success: true,
            message: "New user created",
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        );
      } catch (error) {
        const turso = createAPIClient({
          org: "mikefreno",
          token: env.TURSO_DB_API_TOKEN,
        });
        await turso.databases.delete(db_name!);
        console.error(error);
      }
    }
  } catch (error) {
    console.error("Error in Google Sign-Up handler:", error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: "An error occurred while processing the request",
      }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}
