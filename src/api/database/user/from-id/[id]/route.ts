import { User } from "@/types/model-types";
import { ConnectionFactory } from "@/app/utils";
import { NextResponse } from "next/server";
export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const conn = ConnectionFactory();
    const userQuery = "SELECT * FROM User WHERE id =?";
    const params = await context.params;
    const userParams = [params.id];
    const res = await conn.execute({ sql: userQuery, args: userParams });
    if (res.rows[0]) {
      const user = res.rows[0] as unknown as User;
      if (user && user.display_name !== "user deleted")
        return NextResponse.json(
          {
            id: user.id,
            email: user.email,
            emailVerified: user.email_verified,
            image: user.image,
            displayName: user.display_name,
            provider: user.provider,
            hasPassword: !!user.password_hash,
          },
          { status: 202 },
        );
    }
    return NextResponse.json({}, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({}, { status: 200 });
  }
}
