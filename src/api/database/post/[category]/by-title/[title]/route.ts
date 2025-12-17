import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env.mjs";
import { ConnectionFactory } from "@/app/utils";
import { Post } from "@/types/model-types";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ category: string; title: string }> },
) {
  const readyParams = await context.params;
  if (readyParams.category !== "blog" && readyParams.category !== "project") {
    return NextResponse.json(
      { error: "invalid category value" },
      { status: 400 },
    );
  } else {
    try {
      let privilegeLevel = "anonymous";
      const token = request.cookies.get("userIDToken");
      if (token) {
        if (token.value == env.ADMIN_ID) {
          privilegeLevel = "admin";
        } else {
          privilegeLevel = "user";
        }
      }
      const conn = ConnectionFactory();

      const projectQuery =
        "SELECT p.*, c.*, l.*,t.* FROM Post p JOIN Comment c ON p.id = c.post_id JOIN PostLike l ON p.id = l.post_idJOIN Tag t ON p.id = t.post_id WHERE p.title = ? AND p.category = ? AND p.published = ?;";
      const projectParams = [readyParams.title, readyParams.category, true];
      const projectResults = await conn.execute({
        sql: projectQuery,
        args: projectParams,
      });
      if (projectResults.rows[0]) {
        const post_id = (projectResults.rows[0] as unknown as Post).id;

        const commentQuery = "SELECT * FROM Comment WHERE post_id = ?";
        const commentResults = await conn.execute({
          sql: commentQuery,
          args: [post_id],
        });

        const likeQuery = "SELECT * FROM PostLike WHERE post_id = ?";
        const likeQueryResults = await conn.execute({
          sql: likeQuery,
          args: [post_id],
        });

        const tagsQuery = "SELECT * FROM Tag WHERE post_id = ?";
        const tagResults = await conn.execute({
          sql: tagsQuery,
          args: [post_id],
        });

        return NextResponse.json(
          {
            project: projectResults.rows[0],
            comments: commentResults.rows,
            likes: likeQueryResults.rows,
            tagResults: tagResults.rows,
            privilegeLevel: privilegeLevel,
          },
          { status: 200 },
        );
      }
      return NextResponse.json({ status: 200 });
    } catch (e) {
      return NextResponse.json({ error: e }, { status: 400 });
    }
  }
}
