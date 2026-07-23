// ───────────────────────────────────────────────────────────────────────
// Clerk webhook → local `users` table sync
//
// Clerk emits `user.created` / `user.updated` events (signed via Svix) whenever
// a user signs up or their profile/email changes. This module verifies the
// Svix signature with `NESSA_CLERK_WEBHOOK_SECRET` and upserts the
// corresponding row in the Nessa `users` table, keyed by `clerkUserId`.
//
// The local UUID is generated here ("shadow" account) — Clerk is the identity
// provider; the Nessa DB only stores a denormalized copy for-fast-lookup and
// for rows that reference `users.id` (workouts, plans, community posts, etc.).
//
// All signature verification + DB mutation lives in `handleClerkUserWebhook`
// so it can be exercised directly by tests with an in-memory SQLite DB and a
// real Svix-signed payload.
// ───────────────────────────────────────────────────────────────────────

import { Webhook } from "svix";

/** Minimal libsql-shaped connection (same contract as NessaConnectionFactory). */
export interface NessaConn {
  execute: (stmt: { sql: string; args?: (string | number | null)[] }) => Promise<{
    rows: unknown[];
    rowsAffected?: number;
  }>;
}

/** Svix signature headers Clerk (and Svix) attach to every webhook. */
export interface ClerkWebhookHeaders {
  "svix-id": string;
  "svix-timestamp": string;
  "svix-signature": string;
}

interface ClerkEmailAddress {
  id: string;
  email_address: string;
  verification?: { status?: string } | null;
}

interface ClerkUserData {
  id: string;
  email_addresses?: ClerkEmailAddress[];
  primary_email_address_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  image_url?: string | null;
}

interface ClerkWebhookEvent {
  object: "event";
  type: string;
  data: ClerkUserData;
}

export type WebhookResult = { status: number; body: unknown };

/** Resolve the user's primary email address from the Clerk payload. */
function resolveEmail(data: ClerkUserData): string | null {
  const addresses = data.email_addresses ?? [];
  const primaryId = data.primary_email_address_id ?? null;
  const primary =
    addresses.find((e) => e.id === primaryId) ?? addresses[0] ?? null;
  return primary?.email_address ?? null;
}

/** Resolve the primary email's verification status (1 = verified, 0 = unverified). */
function resolveEmailVerified(data: ClerkUserData): number {
  const addresses = data.email_addresses ?? [];
  const primaryId = data.primary_email_address_id ?? null;
  const primary =
    addresses.find((e) => e.id === primaryId) ?? addresses[0] ?? null;
  return primary?.verification?.status === "verified" ? 1 : 0;
}

/** Resolve a display name (first + last, falling back to username). */
function resolveDisplayName(data: ClerkUserData): string | null {
  const first = (data.first_name ?? "").trim();
  const last = (data.last_name ?? "").trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  return data.username?.trim() || null;
}

// The `users` table predates Clerk — the `clerkUserId` column is added lazily
// (idempotently) so the migration runs against existing dev/prod databases
// without a separate deploy step. SQLite's `ALTER TABLE ... ADD COLUMN` does
// not support `IF NOT EXISTS`, so a duplicate-column error is the expected
// "already migrated" signal.
let columnMigrationDone = false;

/** Test-only: reset the module-level migration flag so each test gets a fresh DB. */
export function __resetClerkWebhookMigrationForTests(): void {
  columnMigrationDone = false;
}

export async function ensureClerkUsersColumn(conn: NessaConn): Promise<void> {
  if (columnMigrationDone) return;
  try {
    await conn.execute({
      sql: "ALTER TABLE users ADD COLUMN clerkUserId TEXT"
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : err == null ? String(err) : String(err);
    // "duplicate column name" (SQLite) is the expected success-already case.
    if (!/duplicate column/i.test(msg)) {
      throw err;
    }
  }
  try {
    await conn.execute({
      sql: "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerkUserId ON users(clerkUserId)"
    });
  } catch (err) {
    // Best-effort: if the index already exists or creation is unsupported in
    // the test harness, fall through. The ON CONFLICT(clerkUserId) upsert
    // requires a unique constraint; in tests we create the index in the
    // schema instead.
  }
  columnMigrationDone = true;
}

/**
 * Verify a Clerk webhook and upsert the user row.
 *
 * @returns a `{ status, body }` describing the HTTP response to send.
 */
export async function handleClerkUserWebhook(opts: {
  rawBody: string;
  headers: ClerkWebhookHeaders;
  webhookSecret: string;
  conn: NessaConn;
}): Promise<WebhookResult> {
  const { rawBody, headers, webhookSecret, conn } = opts;

  // Reject unsigned / partially-signed requests before touching the DB.
  if (
    !headers["svix-id"] ||
    !headers["svix-timestamp"] ||
    !headers["svix-signature"]
  ) {
    return {
      status: 400,
      body: { error: "Missing Svix signature headers" }
    };
  }

  let evt: ClerkWebhookEvent;
  try {
    const wh = new Webhook(webhookSecret);
    evt = wh.verify(rawBody, {
      "svix-id": headers["svix-id"],
      "svix-timestamp": headers["svix-timestamp"],
      "svix-signature": headers["svix-signature"]
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("Clerk webhook signature verification failed:", err);
    return { status: 401, body: { error: "Invalid signature" } };
  }

  if (evt.type !== "user.created" && evt.type !== "user.updated") {
    return {
      status: 200,
      body: { received: true, ignored: evt.type }
    };
  }

  try {
    await ensureClerkUsersColumn(conn);

    const data = evt.data;
    const clerkUserId = data.id;
    const email = resolveEmail(data);
    const emailVerified = resolveEmailVerified(data);
    const firstName = data.first_name ?? null;
    const lastName = data.last_name ?? null;
    const displayName = resolveDisplayName(data);
    const avatarUrl = data.image_url ?? null;

    if (evt.type === "user.created") {
      // Upsert by clerkUserId — Clerk may replay the same event, so insert
      // ON CONFLICT instead of erroring on a duplicate.
      await conn.execute({
        sql: `INSERT INTO users
                (id, clerkUserId, email, emailVerified, firstName, lastName, displayName, avatarUrl, provider, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'clerk', 'active')
              ON CONFLICT(clerkUserId) DO UPDATE SET
                email = excluded.email,
                emailVerified = excluded.emailVerified,
                firstName = excluded.firstName,
                lastName = excluded.lastName,
                displayName = excluded.displayName,
                avatarUrl = excluded.avatarUrl,
                updatedAt = datetime('now')`,
        args: [
          crypto.randomUUID(),
          clerkUserId,
          email,
          emailVerified,
          firstName,
          lastName,
          displayName,
          avatarUrl
        ]
      });
    } else {
      // user.updated — mutate identity fields only; never change clerkUserId.
      await conn.execute({
        sql: `UPDATE users SET
                email = ?,
                emailVerified = ?,
                firstName = ?,
                lastName = ?,
                displayName = ?,
                avatarUrl = ?,
                updatedAt = datetime('now')
              WHERE clerkUserId = ?`,
        args: [email, emailVerified, firstName, lastName, displayName, avatarUrl, clerkUserId]
      });
    }

    return { status: 200, body: { success: true, type: evt.type } };
  } catch (error) {
    console.error("Clerk webhook DB sync failed:", error);
    return {
      status: 500,
      body: { error: "Failed to sync user" }
    };
  }
}
