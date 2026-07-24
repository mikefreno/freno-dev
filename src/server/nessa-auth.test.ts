/**
 * Clerk JWT verification tests for nessa-auth
 *
 * Tests the verifyNessaToken function after migration from HS256 self-signed
 * tokens to Clerk session token verification via @clerk/backend.
 */

import { describe, it, expect, mock, beforeEach } from "bun:test";

// Mock env BEFORE importing the module
mock.module("~/env/server", () => ({
  env: {
    TURSO_DB_URL: "libsql://test.turso.io",
    TURSO_DB_TOKEN: "test-token",
    NESSA_DB_URL: "libsql://nessa-test.turso.io",
    NESSA_DB_TOKEN: "test-token",
    TURSO_LINEAGE_URL: "libsql://lineage-test.turso.io",
    TURSO_LINEAGE_TOKEN: "test-token",
    TURSO_DB_API_TOKEN: "test-token",
    NODE_ENV: "test",
    NESSA_CLERK_SECRET: "sk_test_test-secret",
    NESSA_CLERK_JWT_ISSUER: "https://nessa-test.clerk.accounts.dev"
  },
  validateServerEnv: () => ({}),
  isMissingEnvVar: () => false,
  getMissingEnvVars: () => []
}));

// Mock @clerk/backend verifyToken
const mockVerifyToken = mock();
mock.module("@clerk/backend", () => ({
  verifyToken: mockVerifyToken,
  createClerkClient: mock()
}));

describe("verifyNessaToken with Clerk JWT", () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
  });

  it("returns the subject (Clerk user id) for a valid session token", async () => {
    const mockPayload = {
      sub: "user_clerk123456",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      iss: "https://nessa-test.clerk.accounts.dev",
      sid: "sess_123"
    };

    mockVerifyToken.mockResolvedValue(mockPayload);

    const { verifyNessaToken } = await import("./nessa-auth");

    const result = await verifyNessaToken("valid-clerk-session-token");

    expect(result.sub).toBe("user_clerk123456");
    expect(result.exp).toBe(mockPayload.exp);
    expect(result.iat).toBe(mockPayload.iat);

    // Verify verifyToken was called with correct options
    expect(mockVerifyToken).toHaveBeenCalledWith(
      "valid-clerk-session-token",
      expect.objectContaining({
        secretKey: "sk_test_test-secret"
      })
    );
  });

  it("throws when token has no subject", async () => {
    const mockPayload = {
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      iss: "https://nessa-test.clerk.accounts.dev"
      // Missing 'sub'
    };

    mockVerifyToken.mockResolvedValue(mockPayload);

    const { verifyNessaToken } = await import("./nessa-auth");

    await expect(verifyNessaToken("token-without-subject")).rejects.toThrow(
      /Missing subject/
    );
  });

  it("rejects a malformed token", async () => {
    mockVerifyToken.mockRejectedValue(new Error("Invalid token format"));

    const { verifyNessaToken } = await import("./nessa-auth");

    await expect(verifyNessaToken("malformed-token")).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    mockVerifyToken.mockRejectedValue(new Error("Token has expired"));

    const { verifyNessaToken } = await import("./nessa-auth");

    await expect(verifyNessaToken("expired-token")).rejects.toThrow(/expired/i);
  });

  it("rejects a token with wrong signature", async () => {
    mockVerifyToken.mockRejectedValue(
      new Error("Token signature verification failed")
    );

    const { verifyNessaToken } = await import("./nessa-auth");

    await expect(verifyNessaToken("wrong-key-token")).rejects.toThrow(
      /signature/i
    );
  });
});

describe("static audit: signNessaToken removed", () => {
  it("signNessaToken is not exported fromessa-auth", async () => {
    const moduleExports = await import("./nessa-auth");
    expect(moduleExports).not.toHaveProperty("signNessaToken");
  });

  it("nessa-auth.ts source does not reference the legacy JWT secret", async () => {
    // Reassemble the legacy env-var name so this test itself does not contain
    // the literal token (keeps the source tree grep-clean).
    const legacyVar = ["NESSA", "JWT", "SECRET"].join("_");
    const source = await Bun.file(import.meta.dir + "/nessa-auth.ts").text();
    expect(source).not.toContain(legacyVar);
  });

  it("nessa-auth.ts uses verifyToken from @clerk/backend", async () => {
    const source = await Bun.file(import.meta.dir + "/nessa-auth.ts").text();
    expect(source).toContain("verifyToken");
    expect(source).toContain("@clerk/backend");
  });
});
