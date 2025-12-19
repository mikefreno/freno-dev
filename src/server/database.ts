import { createClient } from "@libsql/client/web";
import { createClient as createAPIClient } from "@tursodatabase/api";
import { v4 as uuid } from "uuid";
import { env } from "~/env/server";
import type { H3Event } from "vinxi/http";
import { getUserID } from "./auth";

let mainDBConnection: ReturnType<typeof createClient> | null = null;
let lineageDBConnection: ReturnType<typeof createClient> | null = null;

export function ConnectionFactory() {
  if (!mainDBConnection) {
    const config = {
      url: env.TURSO_DB_URL,
      authToken: env.TURSO_DB_TOKEN
    };
    mainDBConnection = createClient(config);
  }
  return mainDBConnection;
}

export function LineageConnectionFactory() {
  if (!lineageDBConnection) {
    const config = {
      url: env.TURSO_LINEAGE_URL,
      authToken: env.TURSO_LINEAGE_TOKEN
    };
    lineageDBConnection = createClient(config);
  }
  return lineageDBConnection;
}

export async function LineageDBInit() {
  const turso = createAPIClient({
    org: "mikefreno",
    token: env.TURSO_DB_API_TOKEN
  });

  const db_name = uuid();
  const db = await turso.databases.create(db_name, { group: "default" });

  const token = await turso.databases.createToken(db_name, {
    authorization: "full-access"
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
    authToken: token
  };
  const conn = createClient(config);
  return conn;
}

export async function dumpAndSendDB({
  dbName,
  dbToken,
  sendTarget
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
      Authorization: `Bearer ${dbToken}`
    }
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
      email: "no_reply@freno.me"
    },
    to: [
      {
        email: sendTarget
      }
    ],
    subject: "Your Lineage Database Dump",
    htmlContent:
      "<html><body><p>Please find the attached database dump. This contains the state of your person remote Lineage remote saves. Should you ever return to Lineage, you can upload this file to reinstate the saves you had.</p></body></html>",
    attachment: [
      {
        content: base64Content,
        name: "database_dump.txt"
      }
    ]
  };
  const sendRes = await fetch(apiUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify(emailPayload)
  });

  if (!sendRes.ok) {
    return { success: false, reason: "email send failure" };
  } else {
    return { success: true };
  }
}

export async function getUserBasicInfo(event: H3Event): Promise<{
  email: string | null;
  isAuthenticated: boolean;
} | null> {
  const userId = await getUserID(event);

  if (!userId) {
    return { email: null, isAuthenticated: false };
  }

  try {
    const conn = ConnectionFactory();
    const res = await conn.execute({
      sql: "SELECT email FROM User WHERE id = ?",
      args: [userId]
    });

    if (res.rows.length === 0) {
      return { email: null, isAuthenticated: false };
    }

    const user = res.rows[0] as { email: string | null };
    return {
      email: user.email,
      isAuthenticated: true
    };
  } catch (error) {
    console.error("Error fetching user basic info:", error);
    return { email: null, isAuthenticated: false };
  }
}
