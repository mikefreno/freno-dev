import { NextRequest, NextResponse } from "next/server";
import { ConnectionFactory } from "@/app/utils";
import { CommentReactionInput } from "@/types/input-types";
import { CommentReaction } from "@/types/model-types";

export async function POST(
  input: NextRequest,
  context: { params: Promise<{ type: string }> },
) {
  const readyParams = await context.params;
  const inputData = (await input.json()) as CommentReactionInput;
  const { comment_id, user_id } = inputData;
  const conn = ConnectionFactory();
  const query = `
    INSERT INTO CommentReaction (type, comment_id, user_id)
    VALUES (?, ?, ?)
    `;
  const params = [readyParams.type, comment_id, user_id];
  await conn.execute({ sql: query, args: params });
  const followUpQuery = `SELECT * FROM CommentReaction WHERE comment_id = ?`;
  const followUpParams = [comment_id];
  const res = await conn.execute({ sql: followUpQuery, args: followUpParams });
  const data = (res.rows as unknown as CommentReaction[]).filter(
    (commentReaction) => commentReaction.comment_id == comment_id,
  );
  return NextResponse.json({ commentReactions: data || [] });
}
