import { createClient } from "@libsql/client/web";
import { createClient as createAPIClient } from "@tursodatabase/api";
import { v4 as uuid } from "uuid";
import { env } from "~/env/server";
import type { H3Event } from "vinxi/http";
import {
  fetchWithTimeout,
  checkResponse,
  fetchWithRetry,
  NetworkError,
  TimeoutError,
  APIError
} from "~/server/fetch-utils";

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
  try {
    const res = await fetchWithTimeout(
      `https://${dbName}-mikefreno.turso.io/dump`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${dbToken}`
        },
        timeout: 30000
      }
    );

    await checkResponse(res);
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

    await fetchWithRetry(
      async () => {
        const sendRes = await fetchWithTimeout(apiUrl, {
          method: "POST",
          headers: {
            accept: "application/json",
            "api-key": apiKey,
            "content-type": "application/json"
          },
          body: JSON.stringify(emailPayload),
          timeout: 20000
        });

        await checkResponse(sendRes);
        return sendRes;
      },
      {
        maxRetries: 2,
        retryDelay: 2000
      }
    );

    return { success: true };
  } catch (error) {
    if (error instanceof TimeoutError) {
      console.error("Database dump timeout:", error.message);
      return { success: false, reason: "Database dump timed out" };
    } else if (error instanceof NetworkError) {
      console.error("Network error during database dump:", error.message);
      return { success: false, reason: "Network error" };
    } else if (error instanceof APIError) {
      console.error(
        "API error during database dump:",
        error.status,
        error.statusText
      );
      return { success: false, reason: `API error: ${error.statusText}` };
    }

    console.error("Unexpected error during database dump:", error);
    return { success: false, reason: "Unknown error occurred" };
  }
}

export async function getUserBasicInfo(event: H3Event): Promise<{
  email: string | null;
  isAuthenticated: boolean;
} | null> {
  // Lazy import to avoid circular dependency
  const { getUserID } = await import("./auth");
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
