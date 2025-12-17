import { ConnectionFactory } from "@/app/utils";
import { PostLikeInput } from "@/types/input-types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(input: NextRequest) {
  const inputData = (await input.json()) as PostLikeInput;
  const { user_id, post_id } = inputData;
  const conn = ConnectionFactory();
  const query = `
    DELETE FROM PostLike
    WHERE user_id = ? AND post_id = ? 
    `;
  const params = [user_id, post_id];
  await conn.execute({ sql: query, args: params });
  const followUpQuery = `SELECT * FROM PostLike WHERE post_id=?`;
  const followUpParams = [post_id];
  const res = await conn.execute({ sql: followUpQuery, args: followUpParams });
  return NextResponse.json({ newLikes: res.rows });
}
