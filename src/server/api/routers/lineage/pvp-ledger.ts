/**
 * PvP Blood Token ledger operations (FRE-142) — the authoritative earn/spend
 * logic behind the `lineage.pvp` router.
 *
 * Extracted from the router (mirroring the nessa-community authz pattern)
 * so the authorization + atomicity decisions can be unit-tested against an
 * in-memory SQLite database wrapped to the libsql `execute` contract. The
 * router calls these helpers in the same order, so a pass here guarantees
 * the decision each endpoint makes before touching data.
 *
 * Ledger invariants:
 *  - `pvpTokens` is server-owned. NULL means "not yet seeded"; the first
 *    registerCharacter call seeds it from the client's cached balance
 *    exactly once (one-time migration of pre-FRE-142 balances).
 *  - Earnings happen only in `recordBattleResult`, computed from both
 *    combatants' registered rows via the ported reward formula — never
 *    from client-supplied amounts.
 *  - Spend happens only in `purchaseReward`, as a single conditional
 *    UPDATE (balance + cooldown checked in the WHERE clause) so it is
 *    atomic under concurrency.
 *  - `ownerUserId` (from the verified Lineage JWT) gates every mutation:
 *    a caller can only earn on, and spend from, a row they own.
 */

import { ensurePvpSchema } from "~/server/pvp-schema";
import {
  PVP_PURCHASE_COOLDOWN_MS,
  PVP_PURCHASE_COSTS,
  computeWinReward,
  type PvpCombatantRow
} from "~/server/pvp-rewards";

/** libsql-shaped connection (real client or the bun:sqlite test adapter). */
export interface PvpLedgerConn {
  execute(stmt: {
    sql: string;
    args?: (string | number | null)[];
  }): Promise<{ rows: Record<string, unknown>[]; rowsAffected?: number }>;
}

/** Registered-character fields as persisted on `PvP_Characters`. */
export interface RegisteredCharacter {
  playerClass: string;
  blessing?: string | null;
  name: string;
  maxHealth: number;
  maxSanity: number;
  maxMana: number;
  baseManaRegen: number;
  strength: number;
  intelligence: number;
  dexterity: number;
  resistanceTable: string;
  damageTable: string;
  attackStrings: string;
  knownSpells: string;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Register (or refresh) the caller's character row and reconcile the ledger.
 *
 * - New row: seeded with the caller's cached balance (`seedTokens`) — a
 *   fresh character is 0 — and bound to `ownerUserId` when the caller is
 *   authenticated.
 * - Existing row: character fields refresh; `ownerUserId` binds only if
 *   still NULL (never rebinds away from another owner); `pvpTokens` seeds
 *   only if still NULL (after that the server value is authoritative and
 *   is returned so the caller can reconcile).
 */
export async function registerPvpCharacter(
  conn: PvpLedgerConn,
  params: {
    character: RegisteredCharacter;
    linkID: string;
    ownerUserId: string | null;
    seedTokens: number | null;
  }
): Promise<{
  winCount: number;
  lossCount: number;
  tokenRedemptionCount: number;
  pvpTokens: number;
  status: number;
}> {
  const { character, linkID, ownerUserId, seedTokens } = params;
  await ensurePvpSchema(conn);

  const existing = await conn.execute({
    sql: `SELECT * FROM PvP_Characters WHERE linkID = ?`,
    args: [linkID]
  });

  if (existing.rows.length === 0) {
    await conn.execute({
      sql: `INSERT INTO PvP_Characters (
              linkID,
              blessing,
              playerClass,
              name,
              maxHealth,
              maxSanity,
              maxMana,
              baseManaRegen,
              strength,
              intelligence,
              dexterity,
              resistanceTable,
              damageTable,
              attackStrings,
              knownSpells,
              pushToken,
              pushCurrentlyEnabled,
              pvpTokens,
              ownerUserId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        linkID,
        character.blessing ?? null,
        character.playerClass,
        character.name,
        character.maxHealth,
        character.maxSanity,
        character.maxMana,
        character.baseManaRegen,
        character.strength,
        character.intelligence,
        character.dexterity,
        character.resistanceTable,
        character.damageTable,
        character.attackStrings,
        character.knownSpells,
        null,
        null,
        seedTokens ?? 0,
        ownerUserId
      ]
    });

    return {
      winCount: 0,
      lossCount: 0,
      tokenRedemptionCount: 0,
      pvpTokens: seedTokens ?? 0,
      status: 201
    };
  }

  const row = existing.rows[0];
  await conn.execute({
    sql: `UPDATE PvP_Characters SET
            playerClass = ?,
            blessing = ?,
            name = ?,
            maxHealth = ?,
            maxSanity = ?,
            maxMana = ?,
            baseManaRegen = ?,
            strength = ?,
            intelligence = ?,
            dexterity = ?,
            resistanceTable = ?,
            damageTable = ?,
            attackStrings = ?,
            knownSpells = ?,
            ownerUserId = COALESCE(ownerUserId, ?),
            pvpTokens = COALESCE(pvpTokens, ?)
          WHERE linkID = ?`,
    args: [
      character.playerClass,
      character.blessing ?? null,
      character.name,
      character.maxHealth,
      character.maxSanity,
      character.maxMana,
      character.baseManaRegen,
      character.strength,
      character.intelligence,
      character.dexterity,
      character.resistanceTable,
      character.damageTable,
      character.attackStrings,
      character.knownSpells,
      ownerUserId,
      seedTokens,
      linkID
    ]
  });

  // The post-update balance is authoritative (seeded now if it was NULL).
  const reconciled = await conn.execute({
    sql: `SELECT pvpTokens FROM PvP_Characters WHERE linkID = ?`,
    args: [linkID]
  });
  const pvpTokens = num(reconciled.rows[0]?.pvpTokens);

  return {
    winCount: num(row.winCount),
    lossCount: num(row.lossCount),
    tokenRedemptionCount: num(row.tokenRedemptionCount),
    pvpTokens,
    status: 200
  };
}

/**
 * Record a battle outcome and credit the winner's Blood Tokens.
 *
 * The caller (verified via `callerUserId`) must own either the winner's or
 * the loser's row — battle results reported by non-participants are
 * rejected. Only a caller who owns the *winner's* row earns tokens; the
 * reward is computed server-side from both registered rows, so the
 * client-supplied linkIDs cannot influence the amount beyond picking the
 * participants.
 */
export async function recordBattleResult(
  conn: PvpLedgerConn,
  params: {
    winnerLinkID: string;
    loserLinkID: string;
    callerUserId: string;
  }
): Promise<
  | { ok: true; status: number; pvpTokens: number; credited: boolean }
  | { ok: false; status: number; reason: "not_participant" }
> {
  const { winnerLinkID, loserLinkID, callerUserId } = params;
  await ensurePvpSchema(conn);

  const callerRows = await conn.execute({
    sql: `SELECT linkID FROM PvP_Characters WHERE ownerUserId = ?`,
    args: [callerUserId]
  });
  const callerLinkIDs = new Set(callerRows.rows.map((row) => String(row.linkID)));

  if (!callerLinkIDs.has(winnerLinkID) && !callerLinkIDs.has(loserLinkID)) {
    return { ok: false, status: 403, reason: "not_participant" };
  }

  await conn.execute({
    sql: `
      UPDATE PvP_Characters
      SET
        winCount = winCount + CASE WHEN linkID = ? THEN 1 ELSE 0 END,
        lossCount = lossCount + CASE WHEN linkID = ? THEN 1 ELSE 0 END
      WHERE linkID IN (?, ?)
    `,
    args: [winnerLinkID, loserLinkID, winnerLinkID, loserLinkID]
  });

  const callerIsWinner = callerLinkIDs.has(winnerLinkID);
  if (!callerIsWinner) {
    // The loser reports the same outcome for tally purposes; no tokens move.
    return { ok: true, status: 200, pvpTokens: 0, credited: false };
  }

  const winnerRes = await conn.execute({
    sql: `SELECT * FROM PvP_Characters WHERE linkID = ?`,
    args: [winnerLinkID]
  });
  const loserRes = await conn.execute({
    sql: `SELECT * FROM PvP_Characters WHERE linkID = ?`,
    args: [loserLinkID]
  });
  if (winnerRes.rows.length === 0 || loserRes.rows.length === 0) {
    // An unregistered combatant cannot be rewarded — but the tallies above
    // still applied to whatever rows exist, matching pre-FRE-142 behaviour.
    return { ok: true, status: 200, pvpTokens: 0, credited: false };
  }

  const winnerRow = winnerRes.rows[0];
  const loserRow = loserRes.rows[0];
  const reward = computeWinReward(
    {
      playerClass: String(winnerRow.playerClass),
      strength: num(winnerRow.strength),
      intelligence: num(winnerRow.intelligence),
      dexterity: num(winnerRow.dexterity),
      maxHealth: num(winnerRow.maxHealth),
      winCount: num(winnerRow.winCount),
      lossCount: num(winnerRow.lossCount)
    } satisfies PvpCombatantRow,
    {
      playerClass: String(loserRow.playerClass),
      strength: num(loserRow.strength),
      intelligence: num(loserRow.intelligence),
      dexterity: num(loserRow.dexterity),
      maxHealth: num(loserRow.maxHealth),
      winCount: num(loserRow.winCount),
      lossCount: num(loserRow.lossCount)
    } satisfies PvpCombatantRow
  );

  await conn.execute({
    sql: `UPDATE PvP_Characters
          SET pvpTokens = COALESCE(pvpTokens, 0) + ?
          WHERE linkID = ?`,
    args: [reward, winnerLinkID]
  });

  const balance = await conn.execute({
    sql: `SELECT pvpTokens FROM PvP_Characters WHERE linkID = ?`,
    args: [winnerLinkID]
  });

  return {
    ok: true,
    status: 200,
    pvpTokens: num(balance.rows[0]?.pvpTokens),
    credited: true
  };
}

/**
 * Spend Blood Tokens on a reward atomically.
 *
 * The balance check, cooldown check, spend, and cooldown stamp all happen in
 * one conditional UPDATE — under concurrency exactly one caller can commit
 * a spend that satisfies the WHERE clause. `reason` explains a refusal:
 * unknown reward id, no owned row for the linkID, insufficient tokens, or
 * cooldown in effect.
 */
export async function purchaseReward(
  conn: PvpLedgerConn,
  params: {
    linkID: string;
    callerUserId: string;
    rewardId: number;
    now?: number;
  }
): Promise<{
  ok: boolean;
  pvpTokens?: number;
  reason?: "unknown_reward" | "not_found" | "insufficient_tokens" | "throttled";
}> {
  const { linkID, callerUserId, rewardId } = params;
  await ensurePvpSchema(conn);

  const cost = PVP_PURCHASE_COSTS[rewardId];
  if (cost === undefined) {
    return { ok: false, reason: "unknown_reward" };
  }

  const now = params.now ?? Date.now();
  const spend = await conn.execute({
    sql: `UPDATE PvP_Characters
          SET pvpTokens = pvpTokens - ?,
              lastPurchaseAt = ?
          WHERE linkID = ?
            AND ownerUserId = ?
            AND pvpTokens IS NOT NULL
            AND pvpTokens >= ?
            AND (lastPurchaseAt IS NULL OR ? - lastPurchaseAt >= ?)`,
    args: [
      cost,
      now,
      linkID,
      callerUserId,
      cost,
      now,
      PVP_PURCHASE_COOLDOWN_MS
    ]
  });

  if ((spend.rowsAffected ?? 0) === 1) {
    const balance = await conn.execute({
      sql: `SELECT pvpTokens FROM PvP_Characters WHERE linkID = ?`,
      args: [linkID]
    });
    return { ok: true, pvpTokens: num(balance.rows[0]?.pvpTokens) };
  }

  // The conditional UPDATE refused — determine why, for observability and
  // a precise client message.
  const row = (
    await conn.execute({
      sql: `SELECT ownerUserId, pvpTokens, lastPurchaseAt FROM PvP_Characters WHERE linkID = ?`,
      args: [linkID]
    })
  ).rows[0];

  if (!row || row.ownerUserId !== callerUserId) {
    return { ok: false, reason: "not_found" };
  }
  if (row.pvpTokens === null || row.pvpTokens === undefined) {
    return { ok: false, reason: "insufficient_tokens" };
  }
  if (num(row.pvpTokens) < cost) {
    return { ok: false, reason: "insufficient_tokens" };
  }
  return { ok: false, reason: "throttled" };
}
