import { describe, expect, it, mock, beforeEach } from "bun:test";

// The route's contracts:
//   1. Both fingerprint (UUID) and email are validated — bad input never
//      reaches the store.
//   2. The email is normalized (trimmed, lowercased) before storage.
//   3. The response is `{ success: true }` regardless of whether a trial row
//      already existed — the client learns nothing it doesn't know.
// NookConnectionFactory and the nook helper module are mocked so the test
// needs no real DB, env, or outbound email.

const UUID = "a1b2c3d4-e5f6-4a1b-8c2d-1234567890ab";
const calls: { sql: string; args?: unknown[] }[] = [];

const fakeConn = {
  execute: async (q: { sql: string; args?: unknown[] }) => {
    calls.push(q);
    return { rows: [], rowsAffected: 1 };
  }
};

mock.module("~/server/db-connections", () => ({
  NookConnectionFactory: () => fakeConn
}));

mock.module("~/server/nook", () => ({
  // Full export surface: bun's mock registry is shared across test files in
  // one run, and a partial mock here would starve resend-license.test.ts.
  nookSchemaBootstrap: Promise.resolve(),
  emailLicenseKey: async () => {},
  issueLicense: async () => ({ key: "", id: "" }),
  grantLicense: async () => ({ key: "", id: "" }),
  setTrialEmail: async (fingerprint: string, email: string) => {
    calls.push({ sql: "setTrialEmail", args: [fingerprint, email] });
    return true;
  },
  verifyLicenseKey: () => true
}));

const { POST } = await import("./trial-email");

function request(body: unknown): any {
  return { request: { json: async () => body } };
}

describe("POST /api/the-nook/trial-email", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("rejects an invalid fingerprint", async () => {
    const res = await POST(
      request({ fingerprint: "nope", email: "a@b.co" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid fingerprint" });
  });

  it("rejects an invalid email", async () => {
    const res = await POST(
      request({ fingerprint: UUID, email: "not-an-email" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid email" });
    expect(calls).toHaveLength(0);
  });

  it("normalizes the email and stores it against the fingerprint", async () => {
    const res = await POST(
      request({ fingerprint: UUID, email: "  USER@Example.COM " })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    const stored = calls.find((c) => c.sql === "setTrialEmail");
    expect(stored?.args).toEqual([UUID, "user@example.com"]);
  });
});
