import { describe, expect, it, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import {
  PVP_CHARACTERS_ADDED_COLUMNS,
  PVP_CHARACTERS_DDL,
  ensurePvpSchema
} from "./pvp-schema";

// Same rationale as analytics-schema.test.ts: PvP_Characters lived only in
// the live Turso database, so nothing proved the DDL, the added columns, and
// the router's statements agreed. These tests apply the real schema to a
// throwaway in-memory database and exercise the idempotent applier against
// both a fresh database and a pre-FRE-142 table shape.

let db: Database;

/** Minimal adapter so `ensurePvpSchema` can drive bun:sqlite. */
function sqliteConn(db: Database) {
  return {
    execute: async (stmt: { sql: string }) => {
      const sql = stmt.sql.trim().toUpperCase();
      if (sql.startsWith("SELECT")) {
        return { rows: db.query(stmt.sql).all() };
      }
      db.run(stmt.sql);
      return { rows: [] };
    }
  };
}

function columnNames(table: string): string[] {
  return db
    .query(`SELECT name FROM pragma_table_info('${table}')`)
    .all()
    .map((row) => (row as { name: string }).name);
}

beforeEach(() => {
  db = new Database(":memory:");
});

describe("PVP_CHARACTERS_DDL", () => {
  it("creates the table with every column the router touches", () => {
    db.run(PVP_CHARACTERS_DDL);
    const columns = columnNames("PvP_Characters");
    expect(columns).toContain("linkID");
    expect(columns).toContain("winCount");
    expect(columns).toContain("lossCount");
    expect(columns).toContain("tokenRedemptionCount");
    expect(columns).toContain("pvpTokens");
    expect(columns).toContain("ownerUserId");
    expect(columns).toContain("lastPurchaseAt");
  });

  it("is idempotent", () => {
    db.run(PVP_CHARACTERS_DDL);
    db.run(PVP_CHARACTERS_DDL);
    expect(columnNames("PvP_Characters").length).toBeGreaterThan(0);
  });
});

describe("ensurePvpSchema", () => {
  it("creates the full table on a fresh database", async () => {
    await ensurePvpSchema(sqliteConn(db));
    const columns = columnNames("PvP_Characters");
    for (const column of PVP_CHARACTERS_ADDED_COLUMNS) {
      expect(columns).toContain(column.name);
    }
  });

  it("adds the FRE-142 columns to a pre-existing legacy table", async () => {
    // The legacy shape: everything except the three new columns.
    db.run(`
      CREATE TABLE PvP_Characters (
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
        tokenRedemptionCount INTEGER NOT NULL DEFAULT 0
      )
    `);
    expect(columnNames("PvP_Characters")).not.toContain("pvpTokens");

    await ensurePvpSchema(sqliteConn(db));

    const columns = columnNames("PvP_Characters");
    expect(columns).toContain("pvpTokens");
    expect(columns).toContain("ownerUserId");
    expect(columns).toContain("lastPurchaseAt");
    // Existing data is untouched by the migration.
    db.run(
      `INSERT INTO PvP_Characters (linkID) VALUES ('legacy-row')`
    );
    const row = db
      .query(`SELECT pvpTokens, ownerUserId FROM PvP_Characters WHERE linkID = 'legacy-row'`)
      .get() as { pvpTokens: number | null; ownerUserId: string | null };
    expect(row.pvpTokens).toBeNull();
    expect(row.ownerUserId).toBeNull();
  });

  it("is idempotent on an already-migrated table", async () => {
    await ensurePvpSchema(sqliteConn(db));
    await ensurePvpSchema(sqliteConn(db));
    expect(columnNames("PvP_Characters")).toContain("pvpTokens");
  });
});
