/**
 * Blood Token win-reward calculation (FRE-142), server-side authority.
 *
 * Ported from the lineage client (`entities/AIPlayerCharacter.ts`) so the
 * server credits the same reward a win would have earned client-side. The
 * client's copy remains for UI display only ("Reward For Winning"); the
 * server's result is authoritative.
 *
 * One deliberate difference: the client computes the *winner's* power from
 * the live player state; the server uses the winner's registered character
 * snapshot (refreshed on every arena visit), so the two can drift slightly
 * within a session — never enough to leave the [1, 5] clamp range in a way
 * that matters.
 */

/** Minimum reward (in Blood Tokens) a player can earn per PVP win. */
export const PVP_REWARD_MIN = 1;

/** Maximum reward a player can earn per PVP win. */
export const PVP_REWARD_MAX = 5;

/** Base reward before multipliers are applied. */
const PVP_REWARD_BASE = 1;

/** Clamp `value` to the inclusive range [`min`, `max`]. */
export function clampReward(
  value: number,
  min = PVP_REWARD_MIN,
  max = PVP_REWARD_MAX
): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Win-ratio → multiplier factor.
 *
 * - 0% win rate → 0.5×
 * - 50% win rate → 1.0× (neutral)
 * - 100% win rate → 1.5×
 *
 * When the opponent has no recorded fights (total === 0) the factor is 1.0.
 */
export function winRatioFactor(winCount: number, lossCount: number): number {
  const total = winCount + lossCount;
  if (total <= 0) return 1.0;
  const ratio = winCount / total;
  return 0.5 + ratio;
}

/**
 * Power-distance factor: compare the loser's raw combat stats against the
 * winner's to reward riskier fights. Clamped to [0.5, 2.0].
 */
export function powerDistanceFactor(
  loserPower: number,
  winnerPower: number
): number {
  if (winnerPower <= 0) return 1.0;
  const ratio = loserPower / winnerPower;
  return Math.max(0.5, Math.min(2.0, ratio));
}

/** Rough power-level proxy: strength + intelligence + dexterity + maxHealth. */
export function computeCombatPower(
  strength: number,
  intelligence: number,
  dexterity: number,
  maxHealth: number
): number {
  return strength + intelligence + dexterity + maxHealth;
}

/** Server-side purchase rate limit window (ms), mirrors the lineage
 * client's `PURCHASE_COOLDOWN_MS`. Enforced via the `lastPurchaseAt`
 * column so it survives serverless cold starts. */
export const PVP_PURCHASE_COOLDOWN_MS = 1000;

/**
 * Blood Token cost per reward id. Mirrors the lineage client's
 * `assets/json/pvpRewards.json` — the client's copy is display-only; this
 * table is authoritative. Costs must never be accepted from the client.
 */
export const PVP_PURCHASE_COSTS: Record<number, number> = {
  1: 5, // respec potion
  2: 15, // tome of knowledge (1 skill point)
  3: 20, // potion of undeath (age reduction)
  4: 25, // elixir of renewal (full restore)
  5: 15, // bag of gold (500 gold)
  6: 40 // scroll of mastery (3 skill points)
};

/** A mirror match (same class) is slightly harder — 10% reward boost. */
export function classMatchupFactor(
  winnerClass: string,
  loserClass: string
): number {
  return winnerClass === loserClass ? 1.1 : 1.0;
}

/** The registered-character fields the reward computation reads. */
export interface PvpCombatantRow {
  playerClass: string;
  strength: number;
  intelligence: number;
  dexterity: number;
  maxHealth: number;
  winCount: number;
  lossCount: number;
}

/**
 * Compute the Blood Token reward the winner earns for defeating the loser,
 * from both combatants' registered rows.
 */
export function computeWinReward(
  winner: PvpCombatantRow,
  loser: PvpCombatantRow
): number {
  const wFactor = winRatioFactor(loser.winCount, loser.lossCount);
  const loserPower = computeCombatPower(
    loser.strength,
    loser.intelligence,
    loser.dexterity,
    loser.maxHealth
  );
  const winnerPower = computeCombatPower(
    winner.strength,
    winner.intelligence,
    winner.dexterity,
    winner.maxHealth
  );
  const pFactor = powerDistanceFactor(loserPower, winnerPower);
  const cFactor = classMatchupFactor(winner.playerClass, loser.playerClass);

  return clampReward(PVP_REWARD_BASE * wFactor * pFactor * cFactor);
}
