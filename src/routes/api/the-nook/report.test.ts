import { describe, expect, it, mock, beforeEach } from "bun:test";

// The route's core contracts:
//   1. A valid report is emailed to the owner with the machine snapshot
//      and description, HTML-escaped.
//   2. Invalid payloads never reach the mailer.
//   3. The rate limiter halts floods per fingerprint (falling back to IP).
// sendEmail and the limiter are mocked so the test sends no real mail.

const sentEmails: { to: string; subject: string; html: string }[] = [];
const tokenAnswers: { allowed: boolean; retryAfterSec?: number }[] = [];

mock.module("~/server/email", () => ({
  default: async (to: string, subject: string, html: string) => {
    sentEmails.push({ to, subject, html });
    return { success: true, messageId: "test" };
  }
}));

mock.module("~/server/bug-report-rate-limit", () => ({
  takeBugReportToken: () => tokenAnswers.shift() ?? { allowed: true }
}));

const { POST } = await import("./report");

/** A minimal APIEvent double: JSON body plus optional headers. */
function request(body: unknown, headers: Record<string, string> = {}) {
  return {
    request: {
      json: async () => body,
      headers: new Headers(headers)
    }
  };
}

const validPayload = {
  appVersion: "The Nook 0.2.0 (12)",
  title: "Island flickers",
  description: "It happened <twice> & stayed",
  contact: "",
  machine: {
    macOS: "macOS 15.5",
    model: "Mac15,6",
    cpu: "Apple M3 Pro",
    memoryGB: 36,
    freeDiskGB: 100,
    locale: "en_US"
  },
  displays: [
    {
      name: "Built-in",
      boundsPx: "3456×2234 pt",
      scale: "2.0x",
      hz: "120",
      builtin: true
    },
    {
      name: "DELL U2723QE",
      boundsPx: "3008×1692 pt",
      scale: "1.0x",
      hz: "120",
      builtin: false
    }
  ]
};

describe("POST /api/the-nook/report", () => {
  beforeEach(() => {
    sentEmails.length = 0;
    tokenAnswers.length = 0;
  });

  it("emails the owner a report containing the snapshot, escaped", async () => {
    const res = await POST(request(validPayload));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    expect(sentEmails).toHaveLength(1);
    const email = sentEmails[0]!;
    expect(email.subject).toBe("The Nook bug report: Island flickers");
    expect(email.to).toBe("michael@freno.me");
    for (const fact of ["Mac15,6", "Apple M3 Pro", "macOS 15.5", "36"]) {
      expect(email.html).toContain(fact);
    }
    expect(email.html).toContain("Built-in");
    expect(email.html).toContain("3456×2234 pt");
    expect(email.html).toContain("DELL U2723QE");
    expect(email.html).toContain("3008×1692 pt");
    expect(email.html).toContain("<b>builtin:</b> false");
    expect(email.html).toContain("It happened &lt;twice&gt; &amp; stayed");
  });

  it("rejects a missing, empty, or oversized title", async () => {
    const empty = await POST(request({ ...validPayload, title: "  " }));
    expect(empty.status).toBe(400);
    const missing = await POST(
      request({ ...validPayload, title: undefined })
    );
    expect(missing.status).toBe(400);
    const tooLong = await POST(
      request({ ...validPayload, title: "x".repeat(201) })
    );
    expect(tooLong.status).toBe(400);
    expect(sentEmails).toHaveLength(0);
  });

  it("rejects a malformed reply-to contact", async () => {
    const res = await POST(
      request({ ...validPayload, contact: "not-an-email" })
    );
    expect(res.status).toBe(400);
    expect(sentEmails).toHaveLength(0);
  });

  it("rejects more than eight displays", async () => {
    const displays = Array.from({ length: 9 }, () => validPayload.displays[0]!);
    const res = await POST(request({ ...validPayload, displays }));
    expect(res.status).toBe(400);
    expect(sentEmails).toHaveLength(0);
  });

  it("returns 429 with Retry-After when the limiter denies the token", async () => {
    tokenAnswers.push({ allowed: false, retryAfterSec: 3600 });
    const res = await POST(request(validPayload));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3600");
    expect(sentEmails).toHaveLength(0);
  });

  it("still succeeds when no fingerprint header exists", async () => {
    const res = await POST(
      request(validPayload, { "x-forwarded-for": "203.0.113.9, 10.0.0.1" })
    );
    expect(res.status).toBe(200);
    expect(sentEmails).toHaveLength(1);
  });
});
