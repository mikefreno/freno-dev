import { LineageConnectionFactory } from "@/app/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { winnerLinkID, loserLinkID } = await req.json();

  const conn = LineageConnectionFactory();

  try {
    await conn.execute({
      sql: `
    UPDATE PvP_Characters
    SET
      winCount = winCount + CASE WHEN linkID = ? THEN 1 ELSE 0 END,
      lossCount = lossCount + CASE WHEN linkID = ? THEN 1 ELSE 0 END
    WHERE linkID IN (?, ?)
  `,
      args: [winnerLinkID, loserLinkID, winnerLinkID, loserLinkID],
    });
    return NextResponse.json({
      ok: true,
      status: 200,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, status: 500 });
  }
}
