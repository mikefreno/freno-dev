/**
 * PvP_Characters schema — the single source of truth for the table and the
 * server-authoritative Blood Token ledger columns (FRE-142).
 *
 * Like VisitorAnalytics (see analytics-schema.ts), `PvP_Characters` has no
 * `CREATE TABLE` in this repo — it exists only in the live Turso database.
 * The definition below mirrors the columns the router reads and writes.
 * The FRE-142 columns are appended via idempotent `ALTER TABLE` statements:
 *
 *  - `pvpTokens`       — the authoritative Blood Token balance. NULL means
 *                        "not yet seeded"; the first registerCharacter call
 *                        after this ships seeds it from the client's cached
 *                        balance exactly once, then it is server-owned.
 *  - `ownerUserId`     — the User.id of the authenticated owner, extracted
 *                        from the verified Lineage JWT bearer. Purchase and
 *                        battle-result mutations only act on rows the caller
 *                        owns (p8-004: bind characters to authenticated
 *                        linkIDs).
 *  - `lastPurchaseAt` — epoch-ms timestamp of the last committed purchase,
 *                        used for server-side rate limiting.
 *
 * Pure string constants, no imports — so tests can apply them to an
 * in-memory SQLite database without a network or environment.
 */

export const PVP_CHARACTERS_DDL = `
  CREATE TABLE IF NOT EXISTS PvP_Characters (
    linkID TEXT PRIMARY KEY,
    blessing TEXT,
    playerClass TEXT,
    name TEXT,
    maxHealth INTEGER,
    maxSanity INTEGER,
    maxMana INTEGER,
    baseManaRegen INTEGER,
    strength INTEGER,
    intelligence INTEGER,
    dexterity INTEGER,
    resistanceTable TEXT,
    damageTable TEXT,
    attackStrings TEXT,
    knownSpells TEXT,
    pushToken TEXT,
    pushCurrentlyEnabled INTEGER,
    winCount INTEGER NOT NULL DEFAULT 0,
    lossCount INTEGER NOT NULL DEFAULT 0,
    tokenRedemptionCount INTEGER NOT NULL DEFAULT 0,
    pvpTokens INTEGER,
    ownerUserId TEXT,
    lastPurchaseAt INTEGER
  )
`;

/** Columns that may be missing from a table created before FRE-142. */
export const PVP_CHARACTERS_ADDED_COLUMNS = [
  {
    name: "pvpTokens",
    ddl: `ALTER TABLE PvP_Characters ADD COLUMN pvpTokens INTEGER`
  },
  {
    name: "ownerUserId",
    ddl: `ALTER TABLE PvP_Characters ADD COLUMN ownerUserId TEXT`
  },
  {
    name: "lastPurchaseAt",
    ddl: `ALTER TABLE PvP_Characters ADD COLUMN lastPurchaseAt INTEGER`
  }
];

/**
 * Apply the schema idempotently: create the table if absent and add any
 * FRE-142 columns missing from a pre-existing table. Cheap enough to run
 * before each write mutation; safe to run concurrently with itself.
 */
export async function ensurePvpSchema(conn: {
  execute: (stmt: { sql: string }) => Promise<unknown>;
}): Promise<void> {
  await conn.execute({ sql: PVP_CHARACTERS_DDL });
  const existing = await conn.execute({
    sql: `SELECT name FROM pragma_table_info('PvP_Characters')`
  });
  const present = new Set(
    (
      existing as {
        rows: Array<{ name: string } | Record<string, unknown>>;
      }
    ).rows.map((row) => {
      const r = row as Record<string, unknown>;
      return String(r.name);
    })
  );
  for (const column of PVP_CHARACTERS_ADDED_COLUMNS) {
    if (!present.has(column.name)) {
      await conn.execute({ sql: column.ddl });
    }
  }
}
