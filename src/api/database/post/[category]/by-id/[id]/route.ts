import { NextRequest, NextResponse } from "next/server";
import { ConnectionFactory } from "@/app/utils";

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ category: string; id: string }> },
) {
  const readyParams = await context.params;
  if (readyParams.category !== "blog" && readyParams.category !== "project") {
    return NextResponse.json(
      { error: "invalid category value" },
      { status: 400 },
    );
  } else {
    try {
      const conn = ConnectionFactory();
      const query = `SELECT * FROM Post WHERE id = ?`;
      const params = [parseInt(readyParams.id)];
      const results = await conn.execute({ sql: query, args: params });
      const tagQuery = `SELECT * FROM Tag WHERE post_id = ?`;
      const tagRes = await conn.execute({ sql: tagQuery, args: params });
      if (results.rows[0]) {
        return NextResponse.json(
          {
            post: results.rows[0],
            tags: tagRes.rows,
          },
          { status: 200 },
        );
      } else {
        return NextResponse.json(
          {
            post: [],
          },
          { status: 204 },
        );
      }
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: e }, { status: 400 });
    }
  }
}
