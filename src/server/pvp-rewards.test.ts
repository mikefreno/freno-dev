import { describe, expect, it } from "bun:test";
import {
  PVP_PURCHASE_COSTS,
  clampReward,
  computeWinReward,
  winRatioFactor,
  powerDistanceFactor,
  classMatchupFactor,
  type PvpCombatantRow
} from "./pvp-rewards";

// Ported from the lineage client (`entities/__tests__/AIPlayerCharacter.test.ts`
// rewardValue blocks). These tests pin the server's copy of the formula to
// the same behaviour so the two cannot silently drift apart.

function combatant(overrides: Partial<PvpCombatantRow> = {}): PvpCombatantRow {
  return {
    playerClass: "mage",
    strength: 10,
    intelligence: 10,
    dexterity: 10,
    maxHealth: 100,
    winCount: 0,
    lossCount: 0,
    ...overrides
  };
}

describe("winRatioFactor", () => {
  it("returns 1.0 for a combatant with no recorded fights", () => {
    expect(winRatioFactor(0, 0)).toBe(1.0);
  });

  it("scales from 0.5 (all losses) to 1.5 (all wins)", () => {
    expect(winRatioFactor(0, 10)).toBe(0.5);
    expect(winRatioFactor(5, 5)).toBe(1.0);
    expect(winRatioFactor(10, 0)).toBe(1.5);
  });
});

describe("powerDistanceFactor", () => {
  it("returns 1.0 when the winner's power is non-positive", () => {
    expect(powerDistanceFactor(100, 0)).toBe(1.0);
  });

  it("clamps to [0.5, 2.0]", () => {
    expect(powerDistanceFactor(1, 100)).toBe(0.5);
    expect(powerDistanceFactor(1000, 100)).toBe(2.0);
  });

  it("is neutral for an even match", () => {
    expect(powerDistanceFactor(130, 130)).toBe(1.0);
  });
});

describe("classMatchupFactor", () => {
  it("boosts mirror matches by 10%", () => {
    expect(classMatchupFactor("warrior", "warrior")).toBe(1.1);
  });

  it("is neutral for cross-class matchups", () => {
    expect(classMatchupFactor("warrior", "mage")).toBe(1.0);
  });
});

describe("clampReward", () => {
  it("clamps to the inclusive [1, 5] range", () => {
    expect(clampReward(0.2)).toBe(1);
    expect(clampReward(3.6)).toBe(4);
    expect(clampReward(99)).toBe(5);
  });
});

describe("computeWinReward", () => {
  it("returns a value within [PVP_REWARD_MIN, PVP_REWARD_MAX]", () => {
    const reward = computeWinReward(combatant(), combatant());
    expect(reward).toBeGreaterThanOrEqual(1);
    expect(reward).toBeLessThanOrEqual(5);
  });

  it("rewards beating a stronger, winning opponent more than a weak one", () => {
    const winner = combatant();
    const strongLoser = combatant({
      strength: 50,
      intelligence: 50,
      dexterity: 50,
      maxHealth: 400,
      winCount: 8,
      lossCount: 2
    });
    const weakLoser = combatant({
      strength: 1,
      intelligence: 1,
      dexterity: 1,
      maxHealth: 10,
      winCount: 0,
      lossCount: 9
    });
    const strongReward = computeWinReward(winner, strongLoser);
    const weakReward = computeWinReward(winner, weakLoser);
    expect(strongReward).toBeGreaterThan(weakReward);
  });
});

describe("PVP_PURCHASE_COSTS", () => {
  it("has a cost for every reward id the lineage client can purchase", () => {
    // Mirror of assets/json/pvpRewards.json in the lineage repo.
    expect(PVP_PURCHASE_COSTS[1]).toBe(5);
    expect(PVP_PURCHASE_COSTS[2]).toBe(15);
    expect(PVP_PURCHASE_COSTS[3]).toBe(20);
    expect(PVP_PURCHASE_COSTS[4]).toBe(25);
    expect(PVP_PURCHASE_COSTS[5]).toBe(15);
    expect(PVP_PURCHASE_COSTS[6]).toBe(40);
    expect(Object.keys(PVP_PURCHASE_COSTS)).toHaveLength(6);
  });
});
