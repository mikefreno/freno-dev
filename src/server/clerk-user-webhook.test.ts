/**
 * Clerk user webhook sync tests
 *
 * Exercises `handleClerkUserWebhook` against an in-memory SQLite DB
 * (`bun:sqlite`) wrapped to match the libsql `{ execute({ sql, args }) }`
 * contract. Each event payload is Svix-signed with the same secret the
 * handler verifies against, so the signature path is exercised for real —
 * including the unsigned / wrong-signature rejection cases.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { Webhook } from "svix";
import {
  handleClerkUserWebhook,
  __resetClerkWebhookMigrationForTests,
  type NessaConn
} from "~/server/clerk-user-webhook";

// ─── harness ──────────────────────────────────────────────────────────────

const WEBHOOK_SECRET =
  "whsec_dGhpcyBpcyBhIHRlc3Qgc2VjcmV0IGtleSBmb3IgY2xlcmsgd2ViaG9va3M=";

let db: Database;
let conn: NessaConn;

function makeConn(): NessaConn {
  return {
    execute: async ({
      sql,
      args
    }: {
      sql: string;
      args?: (string | number | null)[];
    }) => {
      const stmt = db.prepare(sql);
      const upper = sql.trim().toUpperCase();
      const isRead = upper.startsWith("SELECT") || upper.startsWith("WITH");
      if (isRead) {
        const rows = stmt.all(...(args ?? []));
        return { rows: rows as unknown[] };
      }
      const info = stmt.run(...(args ?? []));
      return { rows: [] as unknown[], rowsAffected: info.changes };
    }
  };
}

function initSchema() {
  db = new Database(":memory:");
  // `users` table mirrors the Nessa production schema — note clerkUserId is
  // NOT present here so we exercise the idempotent ALTER-TABLE migration path.
  db.run(`CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT,
    emailVerified INTEGER DEFAULT 0,
    firstName TEXT,
    lastName TEXT,
    displayName TEXT,
    avatarUrl TEXT,
    provider TEXT,
    appleUserId TEXT,
    status TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    lastLoginAt TEXT
  )`);
}

beforeEach(() => {
  initSchema();
  conn = makeConn();
  __resetClerkWebhookMigrationForTests();
});

// ─── signings helpers ─────────────────────────────────────────────────────

function sign(
  payload: object,
  secret: string = WEBHOOK_SECRET
): { rawBody: string; headers: ReturnType<typeof headersFor> } {
  const rawBody = JSON.stringify(payload);
  const msgId = `msg_${Math.random().toString(36).slice(2)}`;
  const ts = new Date();
  const wh = new Webhook(secret);
  const signature = wh.sign(msgId, ts, rawBody);
  return {
    rawBody,
    headers: {
      "svix-id": msgId,
      "svix-timestamp": String(Math.floor(ts.getTime() / 1000)),
      "svix-signature": signature
    }
  };
}

// satisfy the inferred header type
function headersFor() {
  return {
    "svix-id": "",
    "svix-timestamp": "",
    "svix-signature": ""
  };
}

function userCreatedPayload(overrides: Record<string, unknown> = {}) {
  return {
    object: "event",
    type: "user.created",
    data: {
      id: "user_abc123",
      email_addresses: [
        {
          id: "idn_1",
          email_address: "jane@example.com",
          verification: { status: "verified" }
        }
      ],
      primary_email_address_id: "idn_1",
      first_name: "Jane",
      last_name: "Doe",
      username: "janedoe",
      image_url: "https://cdn.clerk.com/avatar.png",
      ...overrides
    }
  };
}

function userUpdatedPayload(overrides: Record<string, unknown> = {}) {
  return {
    object: "event",
    type: "user.updated",
    data: {
      id: "user_abc123",
      email_addresses: [
        {
          id: "idn_1",
          email_address: "jane.new@example.com",
          verification: { status: "verified" }
        }
      ],
      primary_email_address_id: "idn_1",
      first_name: "Jane",
      last_name: "Smith",
      username: "janesmith",
      image_url: "https://cdn.clerk.com/avatar2.png",
      ...overrides
    }
  };
}

async function call(
  signed: { rawBody: string; headers: ReturnType<typeof headersFor> },
  secret: string = WEBHOOK_SECRET
) {
  return handleClerkUserWebhook({
    rawBody: signed.rawBody,
    headers: signed.headers,
    webhookSecret: secret,
    conn
  });
}

function getUserByClerkId(clerkUserId: string) {
  const row = db
    .prepare(
      "SELECT id, clerkUserId, email, firstName, lastName, displayName, avatarUrl, provider, status FROM users WHERE clerkUserId = ?"
    )
    .get(clerkUserId) as
    | {
        id: string;
        clerkUserId: string;
        email: string | null;
        firstName: string | null;
        lastName: string | null;
        displayName: string | null;
        avatarUrl: string | null;
        provider: string | null;
        status: string | null;
      }
    | undefined;
  return row;
}

// ─── tests ───────────────────────────────────────────────────────────────

describe("Clerk user.created webhook", () => {
  it("creates a local users row keyed by clerkUserId", async () => {
    const res = await call(sign(userCreatedPayload()));
    expect(res.status).toBe(200);

    const user = getUserByClerkId("user_abc123");
    expect(user).toBeDefined();
    expect(user!.clerkUserId).toBe("user_abc123");
    expect(user!.email).toBe("jane@example.com");
    expect(user!.firstName).toBe("Jane");
    expect(user!.lastName).toBe("Doe");
    expect(user!.displayName).toBe("Jane Doe");
    expect(user!.avatarUrl).toBe("https://cdn.clerk.com/avatar.png");
    expect(user!.provider).toBe("clerk");
    expect(user!.status).toBe("active");
    expect(user!.id).not.toBe("user_abc123"); // a fresh local UUID, not the Clerk id
  });

  it("upserts (does not duplicate) on a replayed created event", async () => {
    const signed = sign(userCreatedPayload());
    await call(signed);
    await call(signed); // replay
    const count = (
      db.prepare("SELECT COUNT(*) as n FROM users WHERE clerkUserId = ?").get(
        "user_abc123"
      ) as { n: number }
    ).n;
    expect(count).toBe(1);
  });

  it("falls back to username when first/last name are absent", async () => {
    const res = await call(
      sign(
        userCreatedPayload({
          first_name: null,
          last_name: null
        })
      )
    );
    expect(res.status).toBe(200);
    const user = getUserByClerkId("user_abc123");
    expect(user!.displayName).toBe("janedoe");
  });
});

describe("Clerk user.updated webhook", () => {
  it("updates mutable fields and leaves clerkUserId unchanged", async () => {
    // seed via created
    await call(sign(userCreatedPayload()));

    const before = getUserByClerkId("user_abc123");
    const localId = before!.id;

    const res = await call(sign(userUpdatedPayload()));
    expect(res.status).toBe(200);

    const after = getUserByClerkId("user_abc123");
    expect(after!.id).toBe(localId); // local UUID stable
    expect(after!.clerkUserId).toBe("user_abc123");
    expect(after!.email).toBe("jane.new@example.com");
    expect(after!.lastName).toBe("Smith");
    expect(after!.displayName).toBe("Jane Smith");
    expect(after!.avatarUrl).toBe("https://cdn.clerk.com/avatar2.png");
  });

  it("is a no-op when the user does not exist (no row inserted)", async () => {
    const res = await call(sign(userUpdatedPayload()));
    expect(res.status).toBe(200);
    const count = (
      db.prepare("SELECT COUNT(*) as n FROM users").get() as { n: number }
    ).n;
    expect(count).toBe(0);
  });
});

describe("Clerk webhook signature enforcement", () => {
  it("rejects a missing-svix-header request with 400", async () => {
    const res = await handleClerkUserWebhook({
      rawBody: JSON.stringify(userCreatedPayload()),
      headers: {
        "svix-id": "",
        "svix-timestamp": "",
        "svix-signature": ""
      },
      webhookSecret: WEBHOOK_SECRET,
      conn
    });
    expect(res.status).toBe(400);
  });

  it("rejects an unsigned payload with 401", async () => {
    const res = await handleClerkUserWebhook({
      rawBody: JSON.stringify(userCreatedPayload()),
      headers: {
        "svix-id": "msg_x",
        "svix-timestamp": String(Math.floor(Date.now() / 1000)),
        "svix-signature": "v1,tampered"
      },
      webhookSecret: WEBHOOK_SECRET,
      conn
    });
    expect(res.status).toBe(401);
  });

  it("rejects a payload signed with the wrong secret with 401", async () => {
    const res = await call(
      sign(
        userCreatedPayload(),
        "whsec_YW5vdGhlcl9kaWZmZXJlbnRfc2VjcmV0X2tleV9mb3JfdGVzdHM="
      ),
      WEBHOOK_SECRET // handler uses this
    );
    expect(res.status).toBe(401);
  });

  it("ignores non user.* event types with 200", async () => {
    const res = await call(
      sign({
        object: "event",
        type: "session.created",
        data: { id: "sess_1" }
      })
    );
    expect(res.status).toBe(200);
    expect((res.body as { ignored: string }).ignored).toBe("session.created");
  });
});
