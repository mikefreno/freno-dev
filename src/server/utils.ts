import jwt, { JwtPayload } from "jsonwebtoken";
import { cookies } from "next/headers";

export const LINEAGE_JWT_EXPIRY = "14d";

export async function getPrivilegeLevel(): Promise<
  "anonymous" | "admin" | "user"
> {
  try {
    const userIDToken = (await cookies()).get("userIDToken");

    if (userIDToken) {
      const decoded = await new Promise<JwtPayload | undefined>((resolve) => {
        jwt.verify(
          userIDToken.value,
          env.JWT_SECRET_KEY,
          async (err, decoded) => {
            if (err) {
              console.log("Failed to authenticate token.");
              (await cookies()).set({
                name: "userIDToken",
                value: "",
                maxAge: 0,
                expires: new Date("2016-10-05"),
              });
              resolve(undefined);
            } else {
              resolve(decoded as JwtPayload);
            }
          },
        );
      });

      if (decoded) {
        return decoded.id === env.ADMIN_ID ? "admin" : "user";
      }
    }
  } catch (e) {
    return "anonymous";
  }
  return "anonymous";
}
export async function getUserID(): Promise<string | null> {
  try {
    const userIDToken = (await cookies()).get("userIDToken");

    if (userIDToken) {
      const decoded = await new Promise<JwtPayload | undefined>((resolve) => {
        jwt.verify(
          userIDToken.value,
          env.JWT_SECRET_KEY,
          async (err, decoded) => {
            if (err) {
              console.log("Failed to authenticate token.");
              (await cookies()).set({
                name: "userIDToken",
                value: "",
                maxAge: 0,
                expires: new Date("2016-10-05"),
              });
              resolve(undefined);
            } else {
              resolve(decoded as JwtPayload);
            }
          },
        );
      });

      if (decoded) {
        return decoded.id;
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

import { createClient, Row } from "@libsql/client/web";
import { env } from "@/env.mjs";

// Turso
export function ConnectionFactory() {
  const config = {
    url: env.TURSO_DB_URL,
    authToken: env.TURSO_DB_TOKEN,
  };

  const conn = createClient(config);
  return conn;
}

export function LineageConnectionFactory() {
  const config = {
    url: env.TURSO_LINEAGE_URL,
    authToken: env.TURSO_LINEAGE_TOKEN,
  };

  const conn = createClient(config);
  return conn;
}

import { v4 as uuid } from "uuid";
import { createClient as createAPIClient } from "@tursodatabase/api";
import { checkPassword } from "./api/passwordHashing";
import { OAuth2Client } from "google-auth-library";

export async function LineageDBInit() {
  const turso = createAPIClient({
    org: "mikefreno",
    token: env.TURSO_DB_API_TOKEN,
  });

  const db_name = uuid();
  const db = await turso.databases.create(db_name, { group: "default" });

  const token = await turso.databases.createToken(db_name, {
    authorization: "full-access",
  });

  const conn = PerUserDBConnectionFactory(db.name, token.jwt);
  await conn.execute(`
  CREATE TABLE checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_updated TEXT NOT NULL,
    player_age INTEGER NOT NULL,
    player_data TEXT,
    time_data TEXT,
    dungeon_data TEXT,
    character_data TEXT,
    shops_data TEXT
  )
`);

  return { token: token.jwt, dbName: db.name };
}

export function PerUserDBConnectionFactory(dbName: string, token: string) {
  const config = {
    url: `libsql://${dbName}-mikefreno.turso.io`,
    authToken: token,
  };
  const conn = createClient(config);
  return conn;
}

export async function dumpAndSendDB({
  dbName,
  dbToken,
  sendTarget,
}: {
  dbName: string;
  dbToken: string;
  sendTarget: string;
}): Promise<{
  success: boolean;
  reason?: string;
}> {
  const res = await fetch(`https://${dbName}-mikefreno.turso.io/dump`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${dbToken}`,
    },
  });
  if (!res.ok) {
    console.error(res);
    return { success: false, reason: "bad dump request response" };
  }
  const text = await res.text();
  const base64Content = Buffer.from(text, "utf-8").toString("base64");

  const apiKey = env.SENDINBLUE_KEY as string;
  const apiUrl = "https://api.brevo.com/v3/smtp/email";

  const emailPayload = {
    sender: {
      name: "no_reply@freno.me",
      email: "no_reply@freno.me",
    },
    to: [
      {
        email: sendTarget,
      },
    ],
    subject: "Your Lineage Database Dump",
    htmlContent:
      "<html><body><p>Please find the attached database dump. This contains the state of your person remote Lineage remote saves. Should you ever return to Lineage, you can upload this file to reinstate the saves you had.</p></body></html>",
    attachment: [
      {
        content: base64Content,
        name: "database_dump.txt",
      },
    ],
  };
  const sendRes = await fetch(apiUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(emailPayload),
  });

  if (!sendRes.ok) {
    return { success: false, reason: "email send failure" };
  } else {
    return { success: true };
  }
}

export async function validateLineageRequest({
  auth_token,
  userRow,
}: {
  auth_token: string;
  userRow: Row;
}): Promise<boolean> {
  const { provider, email } = userRow;
  if (provider === "email") {
    const decoded = jwt.verify(
      auth_token,
      env.JWT_SECRET_KEY,
    ) as jwt.JwtPayload;
    if (email !== decoded.email) {
      return false;
    }
  } else if (provider == "apple") {
    const { apple_user_string } = userRow;
    if (apple_user_string !== auth_token) {
      return false;
    }
  } else if (provider == "google") {
    const CLIENT_ID = env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_MAGIC_DELVE;
    const client = new OAuth2Client(CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: auth_token,
      audience: CLIENT_ID,
    });
    if (ticket.getPayload()?.email !== email) {
      return false;
    }
  } else {
    return false;
  }
  return true;
}
