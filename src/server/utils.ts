import { getCookie, setCookie, type H3Event } from "vinxi/http";
import { jwtVerify, type JWTPayload, SignJWT } from "jose";
import { env } from "~/env/server";
import { createClient, Row } from "@libsql/client/web";
import { v4 as uuid } from "uuid";
import { createClient as createAPIClient } from "@tursodatabase/api";
import { OAuth2Client } from "google-auth-library";
import * as bcrypt from "bcrypt";

export const LINEAGE_JWT_EXPIRY = "14d";

// Helper function to get privilege level from H3Event (for use outside tRPC)
export async function getPrivilegeLevel(
  event: H3Event
): Promise<"anonymous" | "admin" | "user"> {
  try {
    const userIDToken = getCookie(event, "userIDToken");

    if (userIDToken) {
      try {
        const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
        const { payload } = await jwtVerify(userIDToken, secret);

        if (payload.id && typeof payload.id === "string") {
          return payload.id === env.ADMIN_ID ? "admin" : "user";
        }
      } catch (err) {
        console.log("Failed to authenticate token.");
        setCookie(event, "userIDToken", "", {
          maxAge: 0,
          expires: new Date("2016-10-05")
        });
      }
    }
  } catch (e) {
    return "anonymous";
  }
  return "anonymous";
}

// Helper function to get user ID from H3Event (for use outside tRPC)
export async function getUserID(event: H3Event): Promise<string | null> {
  try {
    const userIDToken = getCookie(event, "userIDToken");

    if (userIDToken) {
      try {
        const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
        const { payload } = await jwtVerify(userIDToken, secret);

        if (payload.id && typeof payload.id === "string") {
          return payload.id;
        }
      } catch (err) {
        console.log("Failed to authenticate token.");
        setCookie(event, "userIDToken", "", {
          maxAge: 0,
          expires: new Date("2016-10-05")
        });
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

// Turso - Connection Pooling Implementation
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

export async function validateLineageRequest({
  auth_token,
  userRow
}: {
  auth_token: string;
  userRow: Row;
}): Promise<boolean> {
  const { provider, email } = userRow;
  if (provider === "email") {
    try {
      const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
      const { payload } = await jwtVerify(auth_token, secret);
      if (email !== payload.email) {
        return false;
      }
    } catch (err) {
      return false;
    }
  } else if (provider == "apple") {
    const { apple_user_string } = userRow;
    if (apple_user_string !== auth_token) {
      return false;
    }
  } else if (provider == "google") {
    // Note: Using client env var - should be available via import.meta.env in actual runtime
    const CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID_MAGIC_DELVE;
    if (!CLIENT_ID) {
      console.error("Missing VITE_GOOGLE_CLIENT_ID_MAGIC_DELVE");
      return false;
    }
    const client = new OAuth2Client(CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: auth_token,
      audience: CLIENT_ID
    });
    if (ticket.getPayload()?.email !== email) {
      return false;
    }
  } else {
    return false;
  }
  return true;
}

// Password hashing utilities
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  const salt = await bcrypt.genSalt(saltRounds);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}

export async function checkPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const match = await bcrypt.compare(password, hash);
  return match;
}

// Email service utilities
export async function sendEmailVerification(userEmail: string): Promise<{
  success: boolean;
  messageId?: string;
  message?: string;
}> {
  const apiKey = env.SENDINBLUE_KEY;
  const apiUrl = "https://api.brevo.com/v3/smtp/email";

  const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
  const token = await new SignJWT({ email: userEmail })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .sign(secret);

  const domain =
    env.VITE_DOMAIN || env.NEXT_PUBLIC_DOMAIN || "https://freno.me";

  const emailPayload = {
    sender: {
      name: "MikeFreno",
      email: "lifeandlineage_no_reply@freno.me"
    },
    to: [
      {
        email: userEmail
      }
    ],
    htmlContent: `<html>
<head>
    <style>
        .center {
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            text-align: center;
            text-decoration: none;
            color: #ffffff;
            background-color: #007BFF;
            border-radius: 6px;
            transition: background-color 0.3s;
        }
        .button:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="center">
        <p>Click the button below to verify email</p>
    </div>
    <br/>
    <div class="center">
        <a href="${domain}/api/lineage/email/verification/${userEmail}/?token=${token}" class="button">Verify Email</a>
    </div>
</body>
</html>
`,
    subject: `Life and Lineage email verification`
  };

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(emailPayload)
    });

    if (!res.ok) {
      return { success: false, message: "Failed to send email" };
    }

    const json = (await res.json()) as { messageId?: string };
    if (json.messageId) {
      return { success: true, messageId: json.messageId };
    }
    return { success: false, message: "No messageId in response" };
  } catch (error) {
    console.error("Email sending error:", error);
    return { success: false, message: "Email service error" };
  }
}
