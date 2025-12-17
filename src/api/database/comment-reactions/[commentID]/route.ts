import { NextResponse } from "next/server";
import { ConnectionFactory } from "@/app/utils";

export async function GET(
  _: Request,
  context: { params: Promise<{ commentID: string }> },
) {
  const readyParams = await context.params;
  const commentID = readyParams.commentID;
  const conn = ConnectionFactory();
  const commentQuery = "SELECT * FROM CommentReaction WHERE comment_id = ?";
  const commentParams = [commentID];
  const commentResults = await conn.execute({
    sql: commentQuery,
    args: commentParams,
  });
  return NextResponse.json(
    { commentReactions: commentResults.rows },
    { status: 202 },
  );
}
