import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { newEmailInput } from "@/types/input-types";
import { ConnectionFactory } from "@/app/utils";

export async function POST(input: NextRequest) {
  const inputData = (await input.json()) as newEmailInput;
  const { id, newEmail } = inputData;
  const oldEmail = (await cookies()).get("emailToken");
  const conn = ConnectionFactory();
  const query = `UPDATE User SET email = ? WHERE id = ? AND email = ?`;
  const params = [newEmail, id, oldEmail];
  try {
    const res = await conn.execute({ sql: query, args: params as string[] });
    return NextResponse.json({ res: res }, { status: 202 });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ status: 400 });
  }
}
