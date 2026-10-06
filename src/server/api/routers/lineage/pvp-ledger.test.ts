import { describe, it, expect, beforeEach } from "vitest";
import { Database } from "bun:sqlite";
import {
  PVP_PURCHASE_COOLDOWN_MS,
  PVP_PURCHASE_COSTS
} from "~/server/pvp-rewards";
import {
  purchaseReward,
  recordBattleResult,
  registerPvpCharacter,
  type PvpLedgerConn,
  type RegisteredCharacter
} from "./pvp-ledger";

/**
 * FRE-142 ledger tests: the earn/spend authorization and atomicity decisions
 * behind `lineage.pvp`, exercised against an in-memory SQLite database
 * wrapped to the libsql `execute({ sql, args }) -> { rows, rowsAffected }`
 * contract the router uses (same pattern as nessa-community-authz.test.ts).
 *
 * Casts to `any` are fine in test fixtures per the repo conventions where
 * stub rows are simplified objects.
 */

let db: Database;
let conn: PvpLedgerConn;

function makeConn(): PvpLedgerConn {
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
        return { rows: rows as Record<string, unknown>[] };
      }
      const result = stmt.run(...(args ?? []));
      return { rows: [], rowsAffected: Number(result.changes) };
    }
  };
}

function character(
  overrides: Partial<RegisteredCharacter> = {}
): RegisteredCharacter {
  return {
    playerClass: "mage",
    blessing: null,
    name: "Test Mage",
    maxHealth: 100,
    maxSanity: 50,
    maxMana: 100,
    baseManaRegen: 5,
    strength: 10,
    intelligence: 12,
    dexterity: 8,
    resistanceTable: "{}",
    damageTable: "{}",
    attackStrings: "[]",
    knownSpells: "[]",
    ...overrides
  };
}

/** Register a character and seed a token balance in one step. */
async function seedRow(
  linkID: string,
  ownerUserId: string | null,
  tokens: number
): Promise<void> {
  await registerPvpCharacter(conn, {
    character: character(),
    linkID,
    ownerUserId,
    seedTokens: tokens
  });
}

beforeEach(() => {
  db = new Database(":memory:");
  conn = makeConn();
});

describe("registerPvpCharacter", () => {
  it("creates a bound, seeded row for a new character", async () => {
    const result = await registerPvpCharacter(conn, {
      character: character(),
      linkID: "link-1",
      ownerUserId: "user-1",
      seedTokens: 7
    });
    expect(result.status).toBe(201);
    expect(result.pvpTokens).toBe(7);
    expect(result.winCount).toBe(0);

    const row = db
      .query(`SELECT pvpTokens, ownerUserId FROM PvP_Characters WHERE linkID = 'link-1'`)
      .get() as { pvpTokens: number; ownerUserId: string };
    expect(row.pvpTokens).toBe(7);
    expect(row.ownerUserId).toBe("user-1");
  });

  it("seeds a NULL balance exactly once — the server value wins afterwards", async () => {
    await seedRow("link-1", "user-1", 12);

    // A second register with a *different* claimed balance: the stored 12
    // is authoritative, so 12 is returned and the claim is ignored.
    const result = await registerPvpCharacter(conn, {
      character: character(),
      linkID: "link-1",
      ownerUserId: "user-1",
      seedTokens: 999
    });
    expect(result.status).toBe(200);
    expect(result.pvpTokens).toBe(12);
  });

  it("never rebinds an owned row to another user", async () => {
    await seedRow("link-1", "user-1", 5);

    await registerPvpCharacter(conn, {
      character: character(),
      linkID: "link-1",
      ownerUserId: "user-2",
      seedTokens: 5
    });

    const row = db
      .query(`SELECT ownerUserId FROM PvP_Characters WHERE linkID = 'link-1'`)
      .get() as { ownerUserId: string };
    expect(row.ownerUserId).toBe("user-1");
  });

  it("binds an unbound legacy row on first authenticated register", async () => {
    await seedRow("legacy", null, 3);

    await registerPvpCharacter(conn, {
      character: character(),
      linkID: "legacy",
      ownerUserId: "user-1",
      seedTokens: null
    });

    const row = db
      .query(`SELECT ownerUserId, pvpTokens FROM PvP_Characters WHERE linkID = 'legacy'`)
      .get() as { ownerUserId: string; pvpTokens: number };
    expect(row.ownerUserId).toBe("user-1");
    // NULL seed does not overwrite the existing balance.
    expect(row.pvpTokens).toBe(3);
  });
});

describe("recordBattleResult", () => {
  it("credits the winner with a formula-based reward and returns the balance", async () => {
    await seedRow("winner", "user-1", 10);
    await seedRow("loser", "user-2", 0);

    const before = db
      .query(`SELECT winCount, lossCount FROM PvP_Characters WHERE linkID = 'loser'`)
      .get() as { winCount: number; lossCount: number };

    const result = await recordBattleResult(conn, {
      winnerLinkID: "winner",
      loserLinkID: "loser",
      callerUserId: "user-1"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.credited).toBe(true);
    // Formula: 1 * winRatio(loser 0-0 → 1.0) * power(≈1.0) * class(1.1
    // mirror) = 1.1 → clamps/rounds within [1, 5].
    expect(result.pvpTokens).toBeGreaterThanOrEqual(10 + 1);
    expect(result.pvpTokens).toBeLessThanOrEqual(10 + 5);

    const tallies = db
      .query(`SELECT winCount, lossCount FROM PvP_Characters WHERE linkID = 'loser'`)
      .get() as { winCount: number; lossCount: number };
    expect(tallies.lossCount).toBe(before.lossCount + 1);
    expect(tallies.winCount).toBe(before.winCount);
  });

  it("tallies but credits nothing when the loser reports", async () => {
    await seedRow("winner", "user-1", 10);
    await seedRow("loser", "user-2", 0);

    const result = await recordBattleResult(conn, {
      winnerLinkID: "winner",
      loserLinkID: "loser",
      callerUserId: "user-2"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.credited).toBe(false);

    const balance = db
      .query(`SELECT pvpTokens FROM PvP_Characters WHERE linkID = 'winner'`)
      .get() as { pvpTokens: number };
    expect(balance.pvpTokens).toBe(10);
  });

  it("rejects a report from a non-participant", async () => {
    await seedRow("winner", "user-1", 10);
    await seedRow("loser", "user-2", 0);

    const result = await recordBattleResult(conn, {
      winnerLinkID: "winner",
      loserLinkID: "loser",
      callerUserId: "user-3"
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("not_participant");

    // Nothing was tallied or credited.
    const tallies = db
      .query(`SELECT winCount, lossCount FROM PvP_Characters WHERE linkID = 'winner'`)
      .get() as { winCount: number; lossCount: number };
    expect(tallies.winCount).toBe(0);
  });

  it("treats an unregistered loser as a zero-credit win", async () => {
    await seedRow("winner", "user-1", 4);

    const result = await recordBattleResult(conn, {
      winnerLinkID: "winner",
      loserLinkID: "ghost",
      callerUserId: "user-1"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.credited).toBe(false);

    const balance = db
      .query(`SELECT pvpTokens FROM PvP_Characters WHERE linkID = 'winner'`)
      .get() as { pvpTokens: number };
    expect(balance.pvpTokens).toBe(4);
  });
});

describe("purchaseReward", () => {
  it("spends atomically and returns the new balance", async () => {
    await seedRow("link-1", "user-1", PVP_PURCHASE_COSTS[2]);

    const result = await purchaseReward(conn, {
      linkID: "link-1",
      callerUserId: "user-1",
      rewardId: 2,
      now: 1_000_000
    });

    expect(result.ok).toBe(true);
    expect(result.pvpTokens).toBe(0);
    const row = db
      .query(`SELECT pvpTokens, lastPurchaseAt FROM PvP_Characters WHERE linkID = 'link-1'`)
      .get() as { pvpTokens: number; lastPurchaseAt: number };
    expect(row.pvpTokens).toBe(0);
    expect(row.lastPurchaseAt).toBe(1_000_000);
  });

  it("refuses an unknown reward id without touching the row", async () => {
    await seedRow("link-1", "user-1", 100);

    const result = await purchaseReward(conn, {
      linkID: "link-1",
      callerUserId: "user-1",
      rewardId: 99
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("unknown_reward");
  });

  it("refuses purchases on a row the caller does not own", async () => {
    await seedRow("link-1", "user-1", 100);

    const result = await purchaseReward(conn, {
      linkID: "link-1",
      callerUserId: "user-2",
      rewardId: 5
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("not_found");
  });

  it("refuses purchases on an unregistered linkID", async () => {
    const result = await purchaseReward(conn, {
      linkID: "ghost",
      callerUserId: "user-1",
      rewardId: 5
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("not_found");
  });

  it("refuses an insufficient balance", async () => {
    await seedRow("link-1", "user-1", 3);

    const result = await purchaseReward(conn, {
      linkID: "link-1",
      callerUserId: "user-1",
      rewardId: 1 // costs 5
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("insufficient_tokens");

    const balance = db
      .query(`SELECT pvpTokens FROM PvP_Characters WHERE linkID = 'link-1'`)
      .get() as { pvpTokens: number };
    expect(balance.pvpTokens).toBe(3);
  });

  it("refuses a purchase inside the cooldown window, then allows it after", async () => {
    await seedRow("link-1", "user-1", 1000);

    const first = await purchaseReward(conn, {
      linkID: "link-1",
      callerUserId: "user-1",
      rewardId: 5,
      now: 1_000_000
    });
    expect(first.ok).toBe(true);

    const throttled = await purchaseReward(conn, {
      linkID: "link-1",
      callerUserId: "user-1",
      rewardId: 5,
      now: 1_000_000 + PVP_PURCHASE_COOLDOWN_MS - 1
    });
    expect(throttled.ok).toBe(false);
    expect(throttled.reason).toBe("throttled");

    const allowed = await purchaseReward(conn, {
      linkID: "link-1",
      callerUserId: "user-1",
      rewardId: 5,
      now: 1_000_000 + PVP_PURCHASE_COOLDOWN_MS
    });
    expect(allowed.ok).toBe(true);
  });

  it("treats a NULL (unseeded) balance as insufficient", async () => {
    // A row that exists but was never seeded (pre-FRE-142 shape).
    await seedRow("legacy", null, 0);
    db.run(`UPDATE PvP_Characters SET pvpTokens = NULL WHERE linkID = 'legacy'`);
    db.run(`UPDATE PvP_Characters SET ownerUserId = 'user-1' WHERE linkID = 'legacy'`);

    const result = await purchaseReward(conn, {
      linkID: "legacy",
      callerUserId: "user-1",
      rewardId: 1
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("insufficient_tokens");
  });
});
