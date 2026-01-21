import { ConnectionFactory } from "~/server/utils";
import type { AppleNotification } from "~/server/apple-notification";
import { TRPCError } from "@trpc/server";
import { linkProvider } from "~/server/provider-helpers";

export async function storeAppleNotificationUser(
  notification: AppleNotification
): Promise<void> {
  const conn = ConnectionFactory();
  const { sub, email } = notification;

  if (!sub) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Missing user identifier"
    });
  }

  const existingByApple = await conn.execute({
    sql: "SELECT * FROM User WHERE apple_user_string = ?",
    args: [sub]
  });

  if (existingByApple.rows.length > 0) {
    await conn.execute({
      sql: "UPDATE User SET email = COALESCE(?, email), provider = ?, apple_user_string = ? WHERE id = ?",
      args: [email ?? null, "apple", sub, (existingByApple.rows[0] as any).id]
    });
    await ensureAppleProvider((existingByApple.rows[0] as any).id, sub, email);
    return;
  }

  if (email) {
    const existingByEmail = await conn.execute({
      sql: "SELECT * FROM User WHERE email = ?",
      args: [email]
    });

    if (existingByEmail.rows.length > 0) {
      const userId = (existingByEmail.rows[0] as any).id as string;
      await conn.execute({
        sql: "UPDATE User SET provider = ?, apple_user_string = ? WHERE id = ?",
        args: ["apple", sub, userId]
      });
      await ensureAppleProvider(userId, sub, email);
      return;
    }
  }

  const userId = crypto.randomUUID();
  await conn.execute({
    sql: "INSERT INTO User (id, email, email_verified, provider, apple_user_string) VALUES (?, ?, ?, ?, ?)",
    args: [userId, email ?? null, email ? 1 : 0, "apple", sub]
  });

  await ensureAppleProvider(userId, sub, email ?? undefined);
}

async function ensureAppleProvider(
  userId: string,
  sub: string,
  email?: string
) {
  try {
    await linkProvider(
      userId,
      "apple",
      {
        providerUserId: sub,
        email: email
      },
      {
        sendEmail: false
      }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("already linked")) {
      return;
    }
    throw error;
  }
}
