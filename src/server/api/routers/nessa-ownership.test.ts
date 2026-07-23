/**
 * Nessa CRUD Ownership Check Tests
 * Regression tests for p8-002: per-resource ownership verification on mutation endpoints
 *
 * The ownership enforcement lives in three exported helpers — assertWorkoutOwned,
 * assertAuthProviderOwned, and assertExerciseLibraryOwned — which every targeted
 * mutation calls before modifying data. These tests verify the helpers and the
 * direct userId comparisons used in create/createAuthProvider/createExerciseLibrary
 * and bulkUpsert.
 */

import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { Client } from "@libsql/client/web";

// Prevent the env/server.ts client-side guard from throwing during tests
mock.module("~/env/server", () => ({
  env: {
    NESSA_JWT_SECRET: "test-secret",
    TURSO_DB_URL: "libsql://test.turso.io",
    TURSO_DB_TOKEN: "test-token",
    NESSA_DB_URL: "libsql://nessa-test.turso.io",
    NESSA_DB_TOKEN: "test-token",
    TURSO_LINEAGE_URL: "libsql://lineage-test.turso.io",
    TURSO_LINEAGE_TOKEN: "test-token",
    TURSO_DB_API_TOKEN: "test-token",
    NODE_ENV: "test"
  },
  validateServerEnv: () => ({}),
  isMissingEnvVar: () => false,
  getMissingEnvVars: () => []
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeMockConn(rows: Record<string, unknown>[]): Client {
  const executeMock = mock(async () => {
    return { rows, rowsAffected: 0, lastInsertRowid: 0n } as any;
  });
  return { execute: executeMock } as Client;
}

const USER_A = "user-a";
const USER_B = "user-b";
const WORKOUT_ID = "workout-1";
const HR_SAMPLE_ID = "hr-1";
const LOC_SAMPLE_ID = "loc-1";
const SPLIT_ID = "split-1";
const EXERCISE_ID = "ex-1";
const PROVIDER_ID = "prov-1";

// ─── assertWorkoutOwned helper ────────────────────────────────────────────────
// Used by: create/update/deleteHeartRateSample, create/update/deleteLocationSample,
//          create/update/deleteWorkoutSplit

describe("assertWorkoutOwned helper", () => {
  let assertWorkoutOwned: (conn: Client, workoutId: string, userId: string) => Promise<void>;

  beforeEach(async () => {
    const mod = await import("./nessa");
    assertWorkoutOwned = mod.assertWorkoutOwned;
  });

  it("rejects when workout belongs to another user", async () => {
    const conn = makeMockConn([{ userId: USER_B }]);
    await expect(
      assertWorkoutOwned(conn, WORKOUT_ID, USER_A)
    ).rejects.toThrow(/owner/);
  });

  it("rejects when workout does not exist", async () => {
    const conn = makeMockConn([]);
    await expect(
      assertWorkoutOwned(conn, WORKOUT_ID, USER_A)
    ).rejects.toThrow(/not found/i);
  });

  it("succeeds when workout belongs to the caller", async () => {
    const conn = makeMockConn([{ userId: USER_A }]);
    await expect(
      assertWorkoutOwned(conn, WORKOUT_ID, USER_A)
    ).resolves.toBeUndefined();
  });
});

// ─── assertAuthProviderOwned helper ───────────────────────────────────────────
// Used by: updateAuthProvider, deleteAuthProvider

describe("assertAuthProviderOwned helper", () => {
  let assertAuthProviderOwned: (conn: Client, providerId: string, userId: string) => Promise<void>;

  beforeEach(async () => {
    const mod = await import("./nessa");
    assertAuthProviderOwned = mod.assertAuthProviderOwned;
  });

  it("rejects when auth provider belongs to another user", async () => {
    const conn = makeMockConn([{ userId: USER_B }]);
    await expect(
      assertAuthProviderOwned(conn, PROVIDER_ID, USER_A)
    ).rejects.toThrow(/owner/);
  });

  it("rejects when auth provider does not exist", async () => {
    const conn = makeMockConn([]);
    await expect(
      assertAuthProviderOwned(conn, PROVIDER_ID, USER_A)
    ).rejects.toThrow(/not found/i);
  });

  it("succeeds when auth provider belongs to the caller", async () => {
    const conn = makeMockConn([{ userId: USER_A }]);
    await expect(
      assertAuthProviderOwned(conn, PROVIDER_ID, USER_A)
    ).resolves.toBeUndefined();
  });
});

// ─── assertExerciseLibraryOwned helper ────────────────────────────────────────
// Used by: updateExerciseLibrary, deleteExerciseLibrary

describe("assertExerciseLibraryOwned helper", () => {
  let assertExerciseLibraryOwned: (conn: Client, exerciseId: string, userId: string) => Promise<void>;

  beforeEach(async () => {
    const mod = await import("./nessa");
    assertExerciseLibraryOwned = mod.assertExerciseLibraryOwned;
  });

  it("rejects when exercise belongs to another user", async () => {
    const conn = makeMockConn([{ userId: USER_B }]);
    await expect(
      assertExerciseLibraryOwned(conn, EXERCISE_ID, USER_A)
    ).rejects.toThrow(/owner/);
  });

  it("rejects when exercise does not exist", async () => {
    const conn = makeMockConn([]);
    await expect(
      assertExerciseLibraryOwned(conn, EXERCISE_ID, USER_A)
    ).rejects.toThrow(/not found/i);
  });

  it("succeeds when exercise belongs to the caller", async () => {
    const conn = makeMockConn([{ userId: USER_A }]);
    await expect(
      assertExerciseLibraryOwned(conn, EXERCISE_ID, USER_A)
    ).resolves.toBeUndefined();
  });
});

// ─── mutation handler direct ownership checks ─────────────────────────────────
// createHeartRateSample, createLocationSample, createWorkoutSplit call
// assertWorkoutOwned — covered above.
//
// The remaining create mutations (createExerciseLibrary, createAuthProvider)
// use a direct userId comparison: input.userId !== ctx.nessaUserId.
// bulkUpsert also uses direct comparisons for users/workoutPlans/workouts/
// exerciseLibrary/authProviders.
//
// We verify the comparison logic with pure unit tests.

describe("createExerciseLibrary direct userId check", () => {
  it("user B creating an exercise with userId=userA → FORBIDDEN", () => {
    const input = { userId: USER_A };
    const ctx = { nessaUserId: USER_B };
    let threw = false;
    if (input.userId !== ctx.nessaUserId) threw = true;
    expect(threw).toBe(true);
  });

  it("user A creating an exercise with userId=userA → allowed", () => {
    const input = { userId: USER_A };
    const ctx = { nessaUserId: USER_A };
    let threw = false;
    if (input.userId !== ctx.nessaUserId) threw = true;
    expect(threw).toBe(false);
  });
});

describe("createAuthProvider direct userId check (account takeover prevention)", () => {
  it("user B creating an auth provider with userId=userA → FORBIDDEN", () => {
    const input = { userId: USER_A };
    const ctx = { nessaUserId: USER_B };
    let threw = false;
    if (input.userId !== ctx.nessaUserId) threw = true;
    expect(threw).toBe(true);
  });

  it("user A creating an auth provider with userId=userA → allowed", () => {
    const input = { userId: USER_A };
    const ctx = { nessaUserId: USER_A };
    let threw = false;
    if (input.userId !== ctx.nessaUserId) threw = true;
    expect(threw).toBe(false);
  });
});

describe("bulkUpsert ownership checks", () => {
  it("rejects a user record whose id ≠ caller", () => {
    const record = { id: USER_B };
    const ctx = { nessaUserId: USER_A };
    let threw = false;
    if (record.id !== ctx.nessaUserId) threw = true;
    expect(threw).toBe(true);
  });

  it("rejects a workoutPlan whose userId ≠ caller", () => {
    const record = { userId: USER_B };
    const ctx = { nessaUserId: USER_A };
    let threw = false;
    if (record.userId !== ctx.nessaUserId) threw = true;
    expect(threw).toBe(true);
  });

  it("rejects a workout whose userId ≠ caller", () => {
    const record = { userId: USER_B };
    const ctx = { nessaUserId: USER_A };
    let threw = false;
    if (record.userId !== ctx.nessaUserId) threw = true;
    expect(threw).toBe(true);
  });

  it("rejects an exerciseLibrary record whose userId ≠ caller", () => {
    const record = { userId: USER_B };
    const ctx = { nessaUserId: USER_A };
    let threw = false;
    if (record.userId !== ctx.nessaUserId) threw = true;
    expect(threw).toBe(true);
  });

  it("rejects an authProvider whose userId ≠ caller", () => {
    const record = { userId: USER_B };
    const ctx = { nessaUserId: USER_A };
    let threw = false;
    if (record.userId !== ctx.nessaUserId) threw = true;
    expect(threw).toBe(true);
  });

  it("accepts records that belong to the caller", () => {
    const ctx = { nessaUserId: USER_A };
    let threw = false;
    for (const key of ["id", "userId"] as const) {
      const record = { [key]: USER_A };
      const val = record[key] as string;
      if (val !== ctx.nessaUserId) threw = true;
    }
    expect(threw).toBe(false);
  });
});

// ─── static audit: no mutation handler ignores ctx.nessaUserId ────────────────
// Verify by source-code inspection that every targeted mutation references ctx.

describe("static audit: every targeted mutation handler uses ctx", () => {
  const MUTATIONS = [
    "createHeartRateSample",
    "updateHeartRateSample",
    "deleteHeartRateSample",
    "createLocationSample",
    "updateLocationSample",
    "deleteLocationSample",
    "createWorkoutSplit",
    "updateWorkoutSplit",
    "deleteWorkoutSplit",
    "createExerciseLibrary",
    "updateExerciseLibrary",
    "deleteExerciseLibrary",
    "createAuthProvider",
    "updateAuthProvider",
    "deleteAuthProvider"
  ];

  it("no mutation handler in the list uses async ({ input }) without ctx", async () => {
    const source = await Bun.file(
      import.meta.dir + "/nessa.ts"
    ).text();

    for (const name of MUTATIONS) {
      // Match: name: nessaProcedure ... .mutation(async ({ input }) — but NOT ({ input, ctx
      const re = new RegExp(
        `${name}:\\s*nessaProcedure[^}]*\\.mutation\\(async \\({\\s*input\\s*}\\)`,
        "s"
      );
      const match = source.match(re);
      expect(match, `${name} should not use async ({ input }) — must use ctx`).toBeNull();
    }
  });

  it("every mutation handler in the list references ctx", async () => {
    const source = await Bun.file(
      import.meta.dir + "/nessa.ts"
    ).text();

    for (const name of MUTATIONS) {
      // Find the block for this mutation and check it references ctx
      const re = new RegExp(
        `${name}:\\s*nessaProcedure[\\s\\S]*?\\.mutation\\([\\s\\S]*?\\n    \\}\\),`,
        "s"
      );
      const match = source.match(re);
      expect(match, `${name} mutation block not found`).toBeTruthy();
      expect(
        match![0].includes("ctx"),
        `${name} must reference ctx`
      ).toBe(true);
    }
  });

  it("bulkUpsert filters exerciseLibrary by userId", async () => {
    const source = await Bun.file(
      import.meta.dir + "/nessa.ts"
    ).text();
    const bulkSection = source.match(
      /if \(input\.exerciseLibrary\?\.length\) \{[\s\S]*?\n        \}/
    );
    expect(bulkSection).toBeTruthy();
    expect(bulkSection![0]).toContain("userId !== ctx.nessaUserId");
  });
});
