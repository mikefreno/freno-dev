/**
 * Google OAuth ID-token verification tests
 * Regression tests for p8-009: replace deprecated `tokeninfo` endpoint with
 * `google-auth-library` `verifyIdToken` and enforce the `aud` (audience) claim
 * against `env.GOOGLE_CLIENT_ID`.
 *
 * These tests mock `google-auth-library`'s `OAuth2Client.verifyIdToken` so we
 * can simulate the three verification outcomes the real library produces:
 *   - token minted for a different audience → verifyIdToken throws
 *   - tampered / malformed / expired token      → verifyIdToken throws
 *   - valid token with correct audience + email → returns a payload
 *
 * The mocked `verifyIdToken` itself enforces the audience check (just like the
 * real library), so a token carrying the wrong `aud` claim is rejected at the
 * verification layer — before any Nessa DB query runs.
 */

import { describe, it, expect, mock, beforeEach } from "bun:test";

// ─── The iOS app's Google client ID (audience the server must accept) ─────────
const GOOGLE_CLIENT_ID =
  "test-ios-client-id.apps.googleusercontent.com";

// ─── env mock (registered before importing ./nessa) ─────────────────────────
// nessa.ts imports `env` from ~/env/server at module load via nessa-auth /
// db-connections, and the SSR guard would throw under bun without this mock.
mock.module("~/env/server", () => ({
  env: {
    GOOGLE_CLIENT_ID,
    NESSA_JWT_SECRET: "test-jwt-secret",
    NESSA_DB_URL: "libsql://nessa-test.turso.io",
    NESSA_DB_TOKEN: "test-token",
    TURSO_DB_URL: "libsql://test.turso.io",
    TURSO_DB_TOKEN: "test-token",
    TURSO_LINEAGE_URL: "libsql://lineage-test.turso.io",
    TURSO_LINEAGE_TOKEN: "test-token",
    TURSO_DB_API_TOKEN: "test-token",
    NODE_ENV: "test"
  },
  validateServerEnv: () => ({}),
  isMissingEnvVar: () => false,
  getMissingEnvVars: () => []
}));

// ─── DB mock: NessaConnectionFactory returns a controllable mock conn ─────────
const executeMock = mock(async (_req?: unknown) => ({
  rows: [],
  rowsAffected: 0,
  lastInsertRowid: 0n
})) as unknown as ReturnType<typeof mock>;

mock.module("~/server/database", () => ({
  // Connection factories return a controllable mock conn so googleSignIn's
  // upsert queries never hit the network.
  NessaConnectionFactory: () => ({ execute: executeMock }),
  ConnectionFactory: () => ({ execute: executeMock }),
  LineageConnectionFactory: () => ({ execute: executeMock }),
  PerUserDBConnectionFactory: (_dbName: string, _token: string) => ({ execute: executeMock }),
  // Stubbed-no-op re-exports consumed by ~/server/utils.
  LineageDBInit: async () => {},
  dumpAndSendDB: async () => {},
  getUserBasicInfo: async () => ({ id: "", email: null })
}));

// ─── google-auth-library mock ────────────────────────────────────────────────
// verifyIdToken is wired to `verifyImpl` which each test swaps out. The
// default impl mirrors the real library: it throws when the token's `aud`
// claim !== the configured audience, and otherwise returns a Ticket whose
// getPayload() yields the decoded payload.
type VerifyOpts = { idToken: string; audience: string };
interface FakeTicket {
  getPayload(): Record<string, unknown> | undefined;
}
type VerifyImpl = (opts: VerifyOpts) => Promise<FakeTicket>;

let verifyImpl: VerifyImpl;

class MockOAuth2Client {
  constructor(public clientId: string) {}
  async verifyIdToken(opts: VerifyOpts): Promise<FakeTicket> {
    return verifyImpl(opts);
  }
}

const OAuth2ClientConstructor = mock((_clientId: string) => new MockOAuth2Client(_clientId));

mock.module("google-auth-library", () => ({
  OAuth2Client: OAuth2ClientConstructor
}));

// ─── nessa-auth mock (signNessaToken is a real-ish no-op) ────────────────────
const signNessaTokenMock = mock(async (userId: string) => `signed-jwt-${userId}`);
mock.module("~/server/nessa-auth", () => ({
  signNessaToken: signNessaTokenMock,
  verifyNessaToken: mock(async () => ({ sub: "u" })),
  NESSA_JWT_EXPIRY: "30d"
}));

// ─── helpers ─────────────────────────────────────────────────────────────────
function validPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    iss: "accounts.google.com",
    sub: "google-sub-123",
    email: "user@example.com",
    email_verified: true,
    name: "Test User",
    given_name: "Test",
    family_name: "User",
    picture: "https://img.example.com/me.png",
    aud: GOOGLE_CLIENT_ID,
    azp: GOOGLE_CLIENT_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides
  };
}

// A realistic verifyImpl: rejects wrong audience / tampered tokens, returns
// the payload otherwise. `idToken` is an opaque string in tests, so behaviour
// is driven by `overrides` + whether the token "looks tampered".
function makeVerifyImpl(
  payloadOverrides: Record<string, unknown> = {}
): VerifyImpl {
  return async (opts) => {
    // Real google-auth-library throws when aud !== configured audience.
    const payload = validPayload(payloadOverrides);
    if (payload.aud !== opts.audience) {
      throw new Error("Token was issued for a different audience");
    }
    return { getPayload: () => payload };
  };
}

// ─── test setup ─────────────────────────────────────────────────────────────
let nessaDbRouter: any;

beforeEach(async () => {
  executeMock.mockReset();
  executeMock.mockImplementation(async () => ({
    rows: [],
    rowsAffected: 0,
    lastInsertRowid: 0n
  }));
  signNessaTokenMock.mockReset();
  signNessaTokenMock.mockImplementation(async (userId: string) => `signed-jwt-${userId}`);
  OAuth2ClientConstructor.mockReset();
  OAuth2ClientConstructor.mockImplementation((_clientId: string) => new MockOAuth2Client(_clientId));
  verifyImpl = makeVerifyImpl();

  const mod = await import("./nessa");
  nessaDbRouter = mod.nessaDbRouter;
});

function caller() {
  // googleSignIn is a publicProcedure → no auth context required.
  return nessaDbRouter.createCaller({} as any);
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe("googleSignIn: audience enforcement (p8-009)", () => {
  it("constructs OAuth2Client with env.GOOGLE_CLIENT_ID", async () => {
    await caller().mutation("googleSignIn", {
      idToken: "valid-id-token",
      email: "user@example.com"
    }).catch(() => {});

    expect(OAuth2ClientConstructor).toHaveBeenCalledWith(GOOGLE_CLIENT_ID);
  });

  it("calls verifyIdToken with the id token AND env.GOOGLE_CLIENT_ID as audience", async () => {
    let captured: VerifyOpts | null = null;
    const spyImpl: VerifyImpl = async (opts) => {
      captured = opts;
      return { getPayload: () => validPayload() };
    };
    verifyImpl = spyImpl;

    await caller().mutation("googleSignIn", {
      idToken: "valid-id-token",
      email: "user@example.com"
    }).catch(() => {});

    expect(captured).toEqual({
      idToken: "valid-id-token",
      audience: GOOGLE_CLIENT_ID
    });
  });

  it("rejects a token minted for a DIFFERENT client ID (aud mismatch → UNAUTHORIZED)", async () => {
    // verifyImpl enforces aud === opts.audience; payload carries a foreign aud.
    verifyImpl = makeVerifyImpl({ aud: "other-client-id.apps.googleusercontent.com" });

    await expect(
      caller().mutation("googleSignIn", {
        idToken: "token-for-different-audience",
        email: "user@example.com"
      })
    ).rejects.toThrow(/UNAUTHORIZED|Invalid Google ID token/i);

    // No DB writes should happen on a failed verification.
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("rejects a tampered / malformed ID token (verifyIdToken throws → UNAUTHORIZED)", async () => {
    verifyImpl = async () => {
      throw new Error("Verification failed: signature mismatch");
    };

    await expect(
      caller().mutation("googleSignIn", {
        idToken: "tampered.id.token",
        email: "user@example.com"
      })
    ).rejects.toThrow(/UNAUTHORIZED|Invalid Google ID token/i);

    expect(executeMock).not.toHaveBeenCalled();
  });

  it("rejects an expired token (verifyIdToken throws → UNAUTHORIZED)", async () => {
    verifyImpl = async () => {
      throw new Error("Token used too late, 1716000000 > 1715000000");
    };

    await expect(
      caller().mutation("googleSignIn", {
        idToken: "expired-id-token",
        email: "user@example.com"
      })
    ).rejects.toThrow(/UNAUTHORIZED|Invalid Google ID token/i);
  });

  it("rejects a token whose email is not verified", async () => {
    verifyImpl = makeVerifyImpl({
      email: "unverified@example.com",
      email_verified: false
    });

    await expect(
      caller().mutation("googleSignIn", {
        idToken: "valid-id-token",
        email: "unverified@example.com"
      })
    ).rejects.toThrow(/UNAUTHORIZED|not verified/i);
  });

  it("accepts a valid token with correct audience + verified email, upserting the user", async () => {
    const userIdReturned = "new-user-uuid";
    executeMock.mockImplementation(async (req?: unknown) => {
      const r = req as { sql?: string } | undefined;
      // First query: existingByGoogle → empty (no existing user).
      if (r?.sql?.includes("SELECT userId FROM authProviders")) {
        return { rows: [], rowsAffected: 0, lastInsertRowid: 0n } as any;
      }
      if (r?.sql?.includes("SELECT id FROM users WHERE email")) {
        return { rows: [], rowsAffected: 0, lastInsertRowid: 0n } as any;
      }
      // INSERTs/UPDATEs → return a synthetic row id so the upsert path can complete.
      return { rows: [{ id: userIdReturned }], rowsAffected: 1, lastInsertRowid: 0n } as any;
    });

    const result = await caller().mutation("googleSignIn", {
      idToken: "valid-id-token",
      email: "user@example.com",
      firstName: "Test",
      lastName: "User"
    });

    expect(result.success).toBe(true);
    expect(result.userId).toBeDefined();
    // signNessaToken was called with the resolved userId → a session JWT issued.
    expect(signNessaTokenMock).toHaveBeenCalled();
    // The Google `sub` (stable Google user ID) was used as providerUserId.
    const insertCalls = (executeMock.mock.calls as unknown[]).map(
      (c) => (c[0] as { sql?: string; args?: unknown[] })?.sql
    );
    expect(
      insertCalls.some(
        (sql) =>
          typeof sql === "string" &&
          sql.includes("INSERT INTO authProviders") &&
          // google-sub-123 is the payload.sub from validPayload()
          (executeMock.mock.calls.some(
            (c) =>
              Array.isArray((c[0] as any)?.args) &&
              ((c[0] as any).args as unknown[]).includes("google-sub-123")
          ))
      )
    ).toBe(true);
  });
});

// ─── static audit: the migration is complete in source ──────────────────────

describe("static audit: deprecated tokeninfo removed, verifyIdToken present", () => {
  it("no tokeninfo fetch URL remains in nessa.ts", async () => {
    const source = await Bun.file(import.meta.dir + "/nessa.ts").text();
    expect(source.includes("oauth2.googleapis.com/tokeninfo")).toBe(false);
    expect(source.toLowerCase().includes("tokeninfo")).toBe(false);
  });

  it("verifyIdToken with audience is used in googleSignIn", async () => {
    const source = await Bun.file(import.meta.dir + "/nessa.ts").text();
    expect(source.includes("verifyIdToken")).toBe(true);
    expect(source.includes("audience: env.GOOGLE_CLIENT_ID")).toBe(true);
  });

  it("GOOGLE_CLIENT_ID is required (non-optional) in env schema", async () => {
    const source = await Bun.file(
      import.meta.dir + "/../../../env/server.ts"
    ).text();
    expect(/^\s*GOOGLE_CLIENT_ID:\s*z\.string\(\)\.min\(1\)\s*,?\s*$/m.test(source)).toBe(true);
    expect(/^\s*GOOGLE_CLIENT_ID:.*optional/m.test(source)).toBe(false);
  });
});
