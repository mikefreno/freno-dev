import { describe, expect, it, mock, beforeEach } from "bun:test";

// The route's two core contracts:
//   1. A license key is emailed only when the requested email owns one.
//   2. The HTTP response is identical whether or not a license exists —
//      callers can't learn whether an email is registered.
// NookConnectionFactory and the nook helper module are mocked so the test
// needs no real DB, env, or outbound email.

let licenseRows: { key: string }[] = [];
const sentEmails: { to: string; key: string }[] = [];
const queries: string[] = [];

const fakeConn = {
  execute: async (q: { sql: string; args?: unknown[] }) => {
    queries.push(q.sql);
    if (q.sql.includes("FROM licenses")) return { rows: licenseRows };
    return { rows: [] };
  }
};

mock.module("~/server/db-connections", () => ({
  NookConnectionFactory: () => fakeConn
}));

mock.module("~/server/nook", () => ({
  nookSchemaBootstrap: Promise.resolve(),
  emailLicenseKey: async (to: string, key: string) => {
    sentEmails.push({ to, key });
  }
}));

const { POST } = await import("./resend-license");

function request(body: unknown): any {
  return { request: { json: async () => body } };
}

describe("POST /api/the-nook/resend-license", () => {
  beforeEach(() => {
    licenseRows = [];
    sentEmails.length = 0;
    queries.length = 0;
  });

  it("rejects an invalid email", async () => {
    const res = await POST(request({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid email" });
    expect(sentEmails).toHaveLength(0);
  });

  it("emails the stored key when a license exists for the email", async () => {
    licenseRows = [{ key: "NOOK-ABC123" }];
    const res = await POST(request({ email: "USER@Example.com " }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(sentEmails).toEqual([{ to: "user@example.com", key: "NOOK-ABC123" }]);
    expect(queries.some((q) => q.toLowerCase().includes("lower(email)"))).toBe(true);
  });

  it("sends nothing when no license exists, but still succeeds", async () => {
    const res = await POST(request({ email: "nobody@example.com" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(sentEmails).toHaveLength(0);
  });

  it("returns an identical response whether or not a license exists", async () => {
    const withLicense = await POST(request({ email: "buyer@example.com" }));
    licenseRows = [{ key: "NOOK-XYZ" }];
    const withoutLicense = await POST(request({ email: "buyer@example.com" }));

    expect(withLicense.status).toBe(withoutLicense.status);
    expect(await withLicense.text()).toBe(await withoutLicense.text());
  });
});
