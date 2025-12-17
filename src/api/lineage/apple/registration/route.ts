import { LineageConnectionFactory, LineageDBInit } from "@/app/utils";
import { NextRequest, NextResponse } from "next/server";

import { createClient as createAPIClient } from "@tursodatabase/api";
import { env } from "@/env.mjs";

export async function POST(request: NextRequest) {
  const { email, userString } = await request.json();
  if (!userString) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: "Missing required fields",
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  let dbName;
  let dbToken;
  const conn = LineageConnectionFactory();

  try {
    let checkUserQuery = "SELECT * FROM User WHERE apple_user_string = ?";

    let args = [userString];
    if (email) {
      args.push(email);
      checkUserQuery += " OR email = ?";
    }
    const checkUserResult = await conn.execute({
      sql: checkUserQuery,
      args: args,
    });

    if (checkUserResult.rows.length > 0) {
      const setClauses = [];
      const values = [];

      if (email) {
        setClauses.push("email = ?");
        values.push(email);
      }
      setClauses.push("provider = ?", "apple_user_string = ?");
      values.push("apple", userString);
      const whereClause = `WHERE apple_user_string = ?${
        email && " OR email = ?"
      }`;
      values.push(userString);
      if (email) {
        values.push(email);
      }

      const updateQuery = `UPDATE User SET ${setClauses.join(
        ", ",
      )} ${whereClause}`;
      const updateRes = await conn.execute({
        sql: updateQuery,
        args: values,
      });
      if (updateRes.rowsAffected != 0) {
        return new NextResponse(
          JSON.stringify({
            success: true,
            message: "User information updated",
            email: checkUserResult.rows[0].email,
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
      const dbInit = await LineageDBInit();
      dbToken = dbInit.token;
      dbName = dbInit.dbName;

      try {
        const insertQuery = `
        INSERT INTO User (email, email_verified, apple_user_string, provider, database_name, database_token)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
        await conn.execute({
          sql: insertQuery,
          args: [email, true, userString, "apple", dbName, dbToken],
        });

        return new NextResponse(
          JSON.stringify({
            success: true,
            message: "New user created",
            dbName,
            dbToken,
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        );
      } catch (error) {
        const turso = createAPIClient({
          org: "mikefreno",
          token: env.TURSO_DB_API_TOKEN,
        });
        await turso.databases.delete(dbName);
        console.error(error);
      }
    }
  } catch (error) {
    if (dbName) {
      try {
        const turso = createAPIClient({
          org: "mikefreno",
          token: env.TURSO_DB_API_TOKEN,
        });
        await turso.databases.delete(dbName);
      } catch (deleteErr) {
        console.error("Error deleting database:", deleteErr);
      }
    }
    console.error("Error in Apple Sign-Up handler:", error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: "An error occurred while processing the request",
      }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}
