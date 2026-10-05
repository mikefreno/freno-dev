import { describe, expect, it, mock, beforeEach } from "bun:test";

// The lifecycle job's contracts:
//   1. Auth is Bearer-only; an unconfigured secret denies everything (fail
//      closed) — an unauthenticated trigger would re-email real users.
//   2. Trials younger than 11 days get nothing; at ≥ 11 days the reminder is
//      sent and the row is marked, so a re-run never double-sends.
//   3. A trial address that already bought a license is skipped (marked, no
//      buy reminder).
//   4. Licenses get the testimonial ask at ≥ 3 days and the review ask at
//      ≥ 14 days, each once.
// DB + email sends are mocked; the route module is imported after mocks.

const UUID = "a1b2c3d4-e5f6-4a1b-8c2d-1234567890ab";
const NOW = Date.now();
const daysAgo = (n: number) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();

let trialRows: Record<string, unknown>[] = [];
let licenseRows: Record<string, unknown>[] = [];
const updates: { sql: string; args?: unknown[] }[] = [];
const sent: string[] = [];

const fakeConn = {
  execute: async (q: { sql: string; args?: unknown[] } | string) => {
    const { sql, args } =
      typeof q === "string" ? { sql: q, args: undefined } : q;
    if (sql.startsWith("SELECT fingerprint")) {
      return { rows: trialRows, rowsAffected: 0 };
    }
    if (sql.startsWith("SELECT id, email")) {
      return { rows: licenseRows, rowsAffected: 0 };
    }
    if (sql.startsWith("SELECT 1 FROM licenses")) {
      const email = args?.[0];
      const owned = licenseRows.some((r) => r.email === email);
      return { rows: owned ? [{ 1: 1 }] : [], rowsAffected: 0 };
    }
    if (sql.startsWith("UPDATE")) {
      updates.push({ sql, args });
      return { rows: [], rowsAffected: 1 };
    }
    return { rows: [], rowsAffected: 0 };
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
    updates.push({ sql: "setTrialEmail", args: [fingerprint, email] });
    return true;
  },
  verifyLicenseKey: () => true
}));

mock.module("~/server/nook-lifecycle", () => ({
  emailTrialReminder: async (to: string) => {
    sent.push(`reminder:${to}`);
    return true;
  },
  emailTestimonialAsk: async (to: string) => {
    sent.push(`testimonial:${to}`);
    return true;
  },
  emailReviewAsk: async (to: string) => {
    sent.push(`review:${to}`);
    return true;
  }
}));

mock.module("~/env/server", () => ({
  env: {
    NOOK_LIFECYCLE_SECRET: "sekrit",
    SENDINBLUE_KEY: "test-sendinblue",
    NOOK_LICENSE_PRIVATE_KEY: "test",
    NOOK_STRIPE_WEBHOOK_SECRET: "test",
    AWS_REGION: "us-east-1",
    MY_AWS_ACCESS_KEY: "test-key",
    MY_AWS_SECRET_KEY: "test-secret",
    VITE_DOWNLOAD_BUCKET_STRING: "test-bucket"
  }
}));

const { GET } = await import("./lifecycle");

function request(auth?: string): any {
  return {
    request: { headers: new Headers(auth ? { authorization: auth } : {}) }
  };
}

describe("GET /api/the-nook/lifecycle", () => {
  beforeEach(() => {
    trialRows = [];
    licenseRows = [];
    updates.length = 0;
    sent.length = 0;
  });

  it("denies missing, wrong, and unconfigured secrets", async () => {
    const noHeader = await GET(request());
    expect(noHeader.status).toBe(401);
    const wrong = await GET(request("Bearer nope"));
    expect(wrong.status).toBe(401);
    expect(sent).toHaveLength(0);
  });

  it("sends the D+11 reminder to an aged trial and marks it", async () => {
    trialRows = [
      { fingerprint: UUID, email: "trial@example.com", started_at: daysAgo(11) }
    ];
    const res = await GET(request("Bearer sekrit"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reminders).toBe(1);
    expect(sent).toEqual(["reminder:trial@example.com"]);
    expect(
      updates.some((u) => u.sql.includes("reminder_sent_at"))
    ).toBe(true);
  });

  it("skips young trials entirely", async () => {
    trialRows = [
      { fingerprint: UUID, email: "young@example.com", started_at: daysAgo(3) }
    ];
    const res = await GET(request("Bearer sekrit"));
    const body = await res.json();
    expect(body.reminders).toBe(0);
    expect(sent).toHaveLength(0);
    expect(
      updates.some((u) => u.sql.includes("reminder_sent_at"))
    ).toBe(false);
  });

  it("marks but does not remind a trial that already bought", async () => {
    trialRows = [
      { fingerprint: UUID, email: "bought@example.com", started_at: daysAgo(12) }
    ];
    licenseRows = [{ id: "l1", email: "bought@example.com", created_at: daysAgo(1) }];
    const res = await GET(request("Bearer sekrit"));
    const body = await res.json();
    expect(body.reminders).toBe(0);
    expect(sent).toHaveLength(0);
    expect(
      updates.some((u) => u.sql.includes("reminder_sent_at"))
    ).toBe(true);
  });

  it("asks for a testimonial at D+3 but not a review until D+14", async () => {
    licenseRows = [
      {
        id: "l1",
        email: "buyer@example.com",
        created_at: daysAgo(5),
        testimonial_asked_at: null,
        review_asked_at: null
      }
    ];
    const res = await GET(request("Bearer sekrit"));
    const body = await res.json();
    expect(body.testimonials).toBe(1);
    expect(body.reviews).toBe(0);
    expect(sent).toEqual(["testimonial:buyer@example.com"]);
  });

  it("sends both asks for an old license and never twice", async () => {
    licenseRows = [
      {
        id: "l1",
        email: "buyer@example.com",
        created_at: daysAgo(20),
        testimonial_asked_at: null,
        review_asked_at: null
      }
    ];
    const res = await GET(request("Bearer sekrit"));
    const body = await res.json();
    expect(body.testimonials).toBe(1);
    expect(body.reviews).toBe(1);
    expect(sent.sort()).toEqual([
      "review:buyer@example.com",
      "testimonial:buyer@example.com"
    ]);

    // Second run: both columns are now set — nothing re-sends.
    sent.length = 0;
    licenseRows = [
      {
        id: "l1",
        email: "buyer@example.com",
        created_at: daysAgo(20),
        testimonial_asked_at: daysAgo(1),
        review_asked_at: daysAgo(1)
      }
    ];
    const res2 = await GET(request("Bearer sekrit"));
    const body2 = await res2.json();
    expect(body2.testimonials).toBe(0);
    expect(body2.reviews).toBe(0);
    expect(sent).toHaveLength(0);
  });
});
