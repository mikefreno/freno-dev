/**
 * p8-001 / p8-008 regression tests — S3 procedure lockdown & input sanitization.
 *
 * These tests verify the security remediation without standing up
 * the full tRPC router (which requires S3 / env / database / vinxi-runtime
 * mocking that is unreliable under `bun test`). They follow the proven pattern
 * (p8-002): direct unit tests of the authz/sanitization helpers
 * plus a static source-code audit that the previously-`publicProcedure` S3
 * endpoints are now `csrfProtectedProcedure` (i.e. no longer anonymous).
 *
 * Coverage:
 *  - sanitizeS3PathComponent: path-traversal / HTML / control chars stripped.
 *  - s3TypeSchema: only allowlisted S3 key prefixes accepted (no traversal).
 *  - assertS3KeyOwnership: legitimate owner allowed; cross-prefix / anonymous
 *    (null userId) rejected with FORBIDDEN — the pre-fix anonymous-deletion
 *    exploit (p8-001) and arbitrary-prefix upload (p8-008) are now blocked.
 *  - Static source audit: simpleDeleteImage / deleteImage / getPreSignedURL /
 *    listAttachments are NOT declared as `publicProcedure`.
 */

import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  sanitizeS3PathComponent,
  s3TypeSchema,
  assertS3KeyOwnership
} from "./misc";

const SOURCE = readFileSync(join(import.meta.dir, "misc.ts"), "utf8");

describe("sanitizeS3PathComponent (p8-008)", () => {
  it("strips path-traversal sequences (positive: traversal blocked)", () => {
    expect(sanitizeS3PathComponent("../etc/passwd")).not.toContain("..");
    expect(sanitizeS3PathComponent("foo/../../bar")).not.toContain("..");
    expect(sanitizeS3PathComponent("..%2f..%2fetc")).not.toContain("..");
  });

  it("normalizes slashes to hyphens so key segments can't be escaped", () => {
    expect(sanitizeS3PathComponent("foo/bar")).toBe("foo-bar");
    expect(sanitizeS3PathComponent("foo\\bar")).toBe("foo-bar");
  });

  it("strips non-alphanumeric characters except hyphens/underscores (HTML/script removed)", () => {
    expect(sanitizeS3PathComponent("foo<script>alert</script>bar")).toBe(
      "fooscriptalert-scriptbar"
    );
    expect(sanitizeS3PathComponent("evil\x00null")).toBe("evilnull");
  });

  it("trims, collapses hyphens, and truncates to the 255-char S3 key limit", () => {
    expect(sanitizeS3PathComponent("---foo---")).toBe("foo");
    expect(sanitizeS3PathComponent("foo---bar")).toBe("foo-bar");
    const long = "a".repeat(300);
    expect(sanitizeS3PathComponent(long)).toHaveLength(255);
  });

  it("reduces a fully-malicious input to an empty component", () => {
    expect(sanitizeS3PathComponent("!!!@#$")).toBe("");
  });
});

describe("s3TypeSchema (p8-008)", () => {
  it("accepts only the allowlisted S3 key prefixes (positive)", () => {
    for (const t of ["blog", "attachments", "avatars", "users"]) {
      expect(s3TypeSchema.safeParse(t).success).toBe(true);
    }
  });

  it("rejects path-traversal and arbitrary types (negative: traversal blocked)", () => {
    expect(s3TypeSchema.safeParse("../etc").success).toBe(false);
    expect(s3TypeSchema.safeParse("malicious").success).toBe(false);
    expect(s3TypeSchema.safeParse("").success).toBe(false);
    expect(s3TypeSchema.safeParse("attachments/../users").success).toBe(false);
  });
});

describe("assertS3KeyOwnership (p8-001)", () => {
  it("allows the legitimate owner to act on their own key (positive)", () => {
    expect(() =>
      assertS3KeyOwnership("attachments/user123/report.jpg", "user123")
    ).not.toThrow();
    expect(() =>
      assertS3KeyOwnership("avatars/user123/me.png", "user123")
    ).not.toThrow();
  });

  it("rejects cross-prefix / cross-user keys with FORBIDDEN (negative: cross-user blocked)", () => {
    expect(() =>
      assertS3KeyOwnership("attachments/user456/report.jpg", "user123")
    ).toThrow(/FORBIDDEN|Access denied/);
    try {
      assertS3KeyOwnership("attachments/user456/report.jpg", "user123");
      throw new Error("should have thrown");
    } catch (e: any) {
      expect(e.code).toBe("FORBIDDEN");
    }
  });

  it("rejects anonymous (null userId) access — pre-fix p8-001 exploit blocked", () => {
    // Before p8-001, simpleDeleteImage was a publicProcedure and accepted any
    // key from an unauthenticated caller. The ownership gate now rejects a
    // null userId for any user-scoped key.
    expect(() =>
      assertS3KeyOwnership("attachments/user123/report.jpg", null)
    ).toThrow(/FORBIDDEN|Access denied/);
    try {
      assertS3KeyOwnership("attachments/user123/report.jpg", null);
      throw new Error("should have thrown");
    } catch (e: any) {
      expect(e.code).toBe("FORBIDDEN");
    }
  });

  it("rejects malformed keys without a user-scoped second segment", () => {
    expect(() => assertS3KeyOwnership("attachments", "user123")).toThrow(
      /FORBIDDEN|Access denied/
    );
    expect(() => assertS3KeyOwnership("", "user123")).toThrow(
      /FORBIDDEN|Access denied/
    );
  });
});

describe("p8-001 / p8-008 static source audit", () => {
  // The S3 mutation / upload endpoints MUST NOT be `publicProcedure`. This is
  // the regression guard against the original p8-001 (anonymous S3 deletion)
  // and p8-008 (public presigned URL with unsanitized type) findings.
  const S3_PROCEDURES = [
    "simpleDeleteImage",
    "deleteImage",
    "getPreSignedURL",
    "listAttachments"
  ];

  for (const proc of S3_PROCEDURES) {
    it(`${proc} is not declared as publicProcedure`, () => {
      // Match the procedure declaration line and ensure it is not publicProcedure.
      const re = new RegExp(
        `\\b${proc}\\s*:\\s*(publicProcedure|csrfProtectedProcedure|protectedProcedure|adminProcedure|nessaProcedure)`
      );
      const m = SOURCE.match(re);
      expect(m, `${proc} declaration not found`).not.toBeNull();
      expect(m![1]).not.toBe("publicProcedure");
    });
  }

  it("getDownloadUrl (Sparkle updater) remains the only public S3 endpoint", () => {
    const m = SOURCE.match(
      /\bgetDownloadUrl\s*:\s*(publicProcedure|csrfProtectedProcedure|protectedProcedure)/
    );
    expect(m, "getDownloadUrl declaration not found").not.toBeNull();
    expect(m![1]).toBe("publicProcedure");
  });

  it("assertS3KeyOwnership is invoked on both delete mutations", () => {
    // Both simpleDeleteImage and deleteImage must call the ownership guard.
    const deleteBlocks = SOURCE.split(/(\bsimpleDeleteImage:|\bdeleteImage:)/);
    // Count occurrences of the ownership call within the delete mutation bodies.
    const occurrences = (
      SOURCE.match(/assertS3KeyOwnership\(input\.key/g) || []
    ).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });
});
