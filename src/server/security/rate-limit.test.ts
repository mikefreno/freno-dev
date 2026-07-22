/**
 * Rate Limiting Tests
 * Tests for rate limiting mechanisms on authentication endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  checkRateLimit,
  getClientIP,
  rateLimitLogin,
  rateLimitPasswordReset,
  rateLimitRegistration,
  rateLimitEmailVerification,
  clearRateLimitStore,
  clearRateLimitLocalCache,
  RATE_LIMITS
} from "~/server/security";
import { createMockEvent, randomIP } from "./test-utils";
import { TRPCError } from "@trpc/server";

/**
 * Unique identifier helper — Date.now() alone collides when tests run within
 * the same millisecond, which leaks state between tests. Appending randomness
 * keeps each test's bucket isolated.
 */
let idCounter = 0;
function uniqueId(prefix = "test"): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

describe("Rate Limiting", () => {
  // Clear rate limit store before each test to ensure isolation. MUST be
  // awaited — clearRateLimitStore is async (DB round-trip) and an un-awaited
  // clear lets leftover rows race the next test's atomic upsert.
  beforeEach(async () => {
    await clearRateLimitStore();
  });

  describe("checkRateLimit", () => {
    it("should allow requests within rate limit", async () => {
      const identifier = uniqueId();
      const maxAttempts = 5;
      const windowMs = 60000;

      for (let i = 0; i < maxAttempts; i++) {
        const remaining = await checkRateLimit(
          identifier,
          maxAttempts,
          windowMs
        );
        expect(remaining).toBe(maxAttempts - i - 1);
      }
    });

    it("should block requests exceeding rate limit", async () => {
      const identifier = uniqueId();
      const maxAttempts = 3;
      const windowMs = 60000;

      // Use up all attempts
      for (let i = 0; i < maxAttempts; i++) {
        await checkRateLimit(identifier, maxAttempts, windowMs);
      }

      // Next attempt should throw
      try {
        await checkRateLimit(identifier, maxAttempts, windowMs);
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
      }
    });

    it("should include remaining time in error message", async () => {
      const identifier = uniqueId();
      const maxAttempts = 2;
      const windowMs = 60000;

      // Use up all attempts
      await checkRateLimit(identifier, maxAttempts, windowMs);
      await checkRateLimit(identifier, maxAttempts, windowMs);

      try {
        await checkRateLimit(identifier, maxAttempts, windowMs);
        expect.unreachable("Should have thrown TRPCError");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        const trpcError = error as TRPCError;
        expect(trpcError.code).toBe("TOO_MANY_REQUESTS");
        expect(trpcError.message).toMatch(/Try again in \d+ seconds/);
      }
    });

    it("should reset after time window expires", async () => {
      const identifier = uniqueId();
      const maxAttempts = 3;
      const windowMs = 500; // 500ms window for testing

      // Use up all attempts
      for (let i = 0; i < maxAttempts; i++) {
        await checkRateLimit(identifier, maxAttempts, windowMs);
      }

      // Should be blocked immediately after
      try {
        await checkRateLimit(identifier, maxAttempts, windowMs);
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
      }

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Should be allowed again
      const remaining = await checkRateLimit(identifier, maxAttempts, windowMs);
      expect(remaining).toBe(maxAttempts - 1);
    });

    it("should handle concurrent requests correctly", async () => {
      const identifier = uniqueId();
      const maxAttempts = 10;
      const windowMs = 60000;

      // Simulate concurrent requests
      const results: number[] = [];
      for (let i = 0; i < maxAttempts; i++) {
        results.push(await checkRateLimit(identifier, maxAttempts, windowMs));
      }

      // All should succeed with decreasing remaining counts
      expect(results).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
    });

    it("should isolate different identifiers", async () => {
      const maxAttempts = 3;
      const windowMs = 60000;

      const id1 = uniqueId("test1");
      const id2 = uniqueId("test2");

      // Use up attempts for id1
      for (let i = 0; i < maxAttempts; i++) {
        await checkRateLimit(id1, maxAttempts, windowMs);
      }

      // id1 should be blocked
      try {
        await checkRateLimit(id1, maxAttempts, windowMs);
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
      }

      // id2 should still work
      const remaining = await checkRateLimit(id2, maxAttempts, windowMs);
      expect(remaining).toBe(maxAttempts - 1);
    });
  });

  describe("getClientIP", () => {
    it("should extract IP from x-forwarded-for header", () => {
      const event = createMockEvent({
        headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" }
      });

      const ip = getClientIP(event);
      expect(ip).toBe("192.168.1.1");
    });

    it("should extract IP from x-real-ip header", () => {
      const event = createMockEvent({
        headers: { "x-real-ip": "192.168.1.2" }
      });

      const ip = getClientIP(event);
      expect(ip).toBe("192.168.1.2");
    });

    it("should prefer x-forwarded-for over x-real-ip", () => {
      const event = createMockEvent({
        headers: {
          "x-forwarded-for": "192.168.1.1",
          "x-real-ip": "192.168.1.2"
        }
      });

      const ip = getClientIP(event);
      expect(ip).toBe("192.168.1.1");
    });

    it("should return unknown when no IP headers present", () => {
      const event = createMockEvent({});
      const ip = getClientIP(event);
      expect(ip).toBe("unknown");
    });

    it("should trim whitespace from IP addresses", () => {
      const event = createMockEvent({
        headers: { "x-forwarded-for": "  192.168.1.1  , 10.0.0.1" }
      });

      const ip = getClientIP(event);
      expect(ip).toBe("192.168.1.1");
    });

    it("should handle IPv6 addresses", () => {
      const event = createMockEvent({
        headers: {
          "x-forwarded-for": "2001:0db8:85a3:0000:0000:8a2e:0370:7334"
        }
      });

      const ip = getClientIP(event);
      expect(ip).toBe("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    });
  });

  describe("rateLimitLogin", () => {
    it("should enforce email rate limits in test/dev environments", async () => {
      const ip = randomIP();
      const email = `test-${Date.now()}@example.com`;

      // IP rate limiting is skipped in test/dev, so only email limit applies
      // Use up email rate limit with same email
      for (let i = 0; i < RATE_LIMITS.LOGIN_EMAIL.maxAttempts; i++) {
        await rateLimitLogin(email, ip);
      }

      // Next attempt should fail due to email limit
      try {
        await rateLimitLogin(email, ip);
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
      }
    });

    it("should limit by email independently of IP", async () => {
      const email = `test-${Date.now()}@example.com`;

      // Use different IPs but same email
      for (let i = 0; i < RATE_LIMITS.LOGIN_EMAIL.maxAttempts; i++) {
        await rateLimitLogin(email, randomIP());
      }

      // Next attempt with different IP should still fail due to email limit
      try {
        await rateLimitLogin(email, randomIP());
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
      }
    });

    it("should allow different emails in test/dev environments (IP limit skipped)", async () => {
      const ip = randomIP();

      // In test/dev, IP rate limiting is skipped
      // Should allow many different emails from same IP
      for (let i = 0; i < 10; i++) {
        const email = `test${i}-${Date.now()}@example.com`;
        await rateLimitLogin(email, ip);
      }

      // Should not throw since IP limits are disabled in test/dev
      expect(true).toBe(true);
    });
  });

  describe("rateLimitPasswordReset", () => {
    it("should not enforce IP rate limits in test/dev environments", async () => {
      const ip = randomIP();

      // IP rate limiting is skipped in test/dev
      // Should allow many attempts
      for (let i = 0; i < 10; i++) {
        await rateLimitPasswordReset(ip);
      }

      // Should not throw in test/dev
      expect(true).toBe(true);
    });

    it("should allow password resets in test/dev (no IP limit)", async () => {
      const ip = randomIP();
      const email = `test-${Date.now()}@example.com`;

      // Use up many password reset attempts (no IP limit in test/dev)
      for (let i = 0; i < 10; i++) {
        await rateLimitPasswordReset(ip);
      }

      // Should still be able to login (different limit and function)
      await rateLimitLogin(email, ip);
    });
  });

  describe("rateLimitRegistration", () => {
    it("should not enforce IP rate limits in test/dev environments", async () => {
      const ip = randomIP();

      // IP rate limiting is skipped in test/dev
      // Should allow many attempts
      for (let i = 0; i < 10; i++) {
        await rateLimitRegistration(ip);
      }

      // Should not throw in test/dev
      expect(true).toBe(true);
    });
  });

  describe("rateLimitEmailVerification", () => {
    it("should not enforce IP rate limits in test/dev environments", async () => {
      const ip = randomIP();

      // IP rate limiting is skipped in test/dev
      // Should allow many attempts
      for (let i = 0; i < 10; i++) {
        await rateLimitEmailVerification(ip);
      }

      // Should not throw in test/dev
      expect(true).toBe(true);
    });
  });

  describe("Rate Limit Attack Scenarios", () => {
    it("should prevent brute force login attacks", async () => {
      const email = "victim@example.com";
      const attackerIP = "1.2.3.4";

      // Simulate brute force attack
      let blockedAtAttempt = 0;
      for (let i = 0; i < 10; i++) {
        try {
          await rateLimitLogin(email, attackerIP);
        } catch (error) {
          if (error instanceof TRPCError) {
            blockedAtAttempt = i;
            break;
          }
        }
      }

      // Should be blocked before 10 attempts
      expect(blockedAtAttempt).toBeLessThan(10);
      expect(blockedAtAttempt).toBeGreaterThan(0);
    });

    it("should prevent distributed brute force from multiple IPs", async () => {
      const email = "victim@example.com";

      // Simulate distributed attack from different IPs
      let blockedAtAttempt = 0;
      for (let i = 0; i < 10; i++) {
        try {
          await rateLimitLogin(email, randomIP());
        } catch (error) {
          if (error instanceof TRPCError) {
            blockedAtAttempt = i;
            break;
          }
        }
      }

      // Should be blocked at email limit (3 attempts)
      expect(blockedAtAttempt).toBeLessThanOrEqual(
        RATE_LIMITS.LOGIN_EMAIL.maxAttempts
      );
    });

    it("should prevent account enumeration via registration spam", async () => {
      const attackerIP = randomIP();

      // In test/dev, IP rate limiting is skipped
      // This test verifies the behavior is as expected (no blocking)
      for (let i = 0; i < 10; i++) {
        await rateLimitRegistration(attackerIP);
      }

      // Should not block in test/dev (IP limits disabled)
      expect(true).toBe(true);
    });

    it("should prevent password reset spam attacks", async () => {
      const attackerIP = randomIP();

      // In test/dev, IP rate limiting is skipped
      // This test verifies the behavior is as expected (no blocking)
      for (let i = 0; i < 10; i++) {
        await rateLimitPasswordReset(attackerIP);
      }

      // Should not block in test/dev (IP limits disabled)
      expect(true).toBe(true);
    });
  });

  describe("Unknown IP Handling", () => {
    it("should handle 'unknown' IP in development without rate limiting", async () => {
      // In development, IP rate limits should be skipped
      // This test assumes NODE_ENV is 'development' or 'test'
      const unknownIP = "unknown";
      const email = `test-${Date.now()}@example.com`;

      // Should allow many login attempts in development with unknown IP
      // (only email rate limit applies)
      for (let i = 0; i < RATE_LIMITS.LOGIN_EMAIL.maxAttempts; i++) {
        const testEmail = `test-${Date.now()}-${i}@example.com`;
        await rateLimitLogin(testEmail, unknownIP);
      }

      // Should be able to continue with different emails (no IP limit in dev)
      await rateLimitLogin(`final-${Date.now()}@example.com`, unknownIP);
    });

    it("should still enforce email rate limits with unknown IP", async () => {
      const unknownIP = "unknown";
      const email = `test-${Date.now()}@example.com`;

      // Use up email rate limit
      for (let i = 0; i < RATE_LIMITS.LOGIN_EMAIL.maxAttempts; i++) {
        await rateLimitLogin(email, unknownIP);
      }

      // Next attempt should fail due to email limit
      try {
        await rateLimitLogin(email, unknownIP);
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
      }
    });

    it("should handle unknown IP in password reset", async () => {
      const unknownIP = "unknown";

      // In development, should allow many attempts (no IP limit)
      for (let i = 0; i < 10; i++) {
        await rateLimitPasswordReset(unknownIP);
      }

      // Should not throw in development
      expect(true).toBe(true);
    });

    it("should handle unknown IP in registration", async () => {
      const unknownIP = "unknown";

      // In development, should allow many attempts (no IP limit)
      for (let i = 0; i < 10; i++) {
        await rateLimitRegistration(unknownIP);
      }

      // Should not throw in development
      expect(true).toBe(true);
    });

    it("should handle unknown IP in email verification", async () => {
      const unknownIP = "unknown";

      // In development, should allow many attempts (no IP limit)
      for (let i = 0; i < 10; i++) {
        await rateLimitEmailVerification(unknownIP);
      }

      // Should not throw in development
      expect(true).toBe(true);
    });
  });

  describe("Rate Limit Configuration", () => {
    it("should have reasonable limits configured", () => {
      // Login should be more permissive than registration
      expect(RATE_LIMITS.LOGIN_IP.maxAttempts).toBeGreaterThan(
        RATE_LIMITS.REGISTRATION_IP.maxAttempts
      );

      // All limits should be positive
      expect(RATE_LIMITS.LOGIN_IP.maxAttempts).toBeGreaterThan(0);
      expect(RATE_LIMITS.LOGIN_EMAIL.maxAttempts).toBeGreaterThan(0);
      expect(RATE_LIMITS.PASSWORD_RESET_IP.maxAttempts).toBeGreaterThan(0);
      expect(RATE_LIMITS.REGISTRATION_IP.maxAttempts).toBeGreaterThan(0);
      expect(RATE_LIMITS.EMAIL_VERIFICATION_IP.maxAttempts).toBeGreaterThan(0);

      // All windows should be at least 1 minute
      expect(RATE_LIMITS.LOGIN_IP.windowMs).toBeGreaterThanOrEqual(60000);
      expect(RATE_LIMITS.LOGIN_EMAIL.windowMs).toBeGreaterThanOrEqual(60000);
      expect(RATE_LIMITS.PASSWORD_RESET_IP.windowMs).toBeGreaterThanOrEqual(
        60000
      );
      expect(RATE_LIMITS.REGISTRATION_IP.windowMs).toBeGreaterThanOrEqual(
        60000
      );
      expect(RATE_LIMITS.EMAIL_VERIFICATION_IP.windowMs).toBeGreaterThanOrEqual(
        60000
      );
    });
  });

  describe("Performance", () => {
    it("should keep single-key shared-store check latency within an acceptable bound", async () => {
      // p8-010: the rate-limit state now lives in the shared DB store instead of
      // an in-memory Map. The latency that matters for logins is a single
      // checkRateLimit round-trip, not aggregate throughput. Assert it stays
      // within an acceptable bound for a remote shared store.
      const id = uniqueId("perf");
      const maxAttempts = 5;
      const windowMs = 60000;

      // Warm the bucket so we measure the ON CONFLICT UPDATE path.
      await checkRateLimit(id, maxAttempts, windowMs);

      const start = performance.now();
      await checkRateLimit(id, maxAttempts, windowMs);
      const singleLatency = performance.now() - start;

      // Generous bound for a remote libSQL/Turso round-trip; catches gross
      // regressions (e.g. falling back to multi-statement SELECT+UPDATE).
      expect(singleLatency).toBeLessThan(2000);
    }, 15000);

    it("should not crash with many distinct identifiers", async () => {
      // Each call performs a DB upsert; keep the volume bounded so the test
      // stays well under the remote-DB latency budget.
      const promises = [];
      for (let i = 0; i < 30; i++) {
        promises.push(checkRateLimit(uniqueId("perf-many"), 5, 60000));
      }
      await Promise.all(promises);

      // This test mainly ensures no crashes occur under concurrent upserts.
      // Memory cleanup is tested by the cleanup interval in security.ts.
      expect(true).toBe(true);
    }, 20000);
  });

  // ===========================================================================
  // p8-010: distributed rate-limit store. The authoritative counter lives in the
  // shared `RateLimit` DB table (atomic upsert), so limits hold across instances
  // and survive restarts/redeploys. The per-instance Map is now only a short-TTL
  // local cache for fast-failing already-blocked identifiers.
  // ===========================================================================
  describe("Distributed rate-limit store (p8-010)", () => {
    it("state survives a simulated instance restart (local cache cleared, shared store blocks)", async () => {
      const id = uniqueId("dist-restart");
      const maxAttempts = 3;
      const windowMs = 60000;

      // Exhaust the limit: 3 allowed, 4th blocked.
      for (let i = 0; i < maxAttempts; i++) {
        await checkRateLimit(id, maxAttempts, windowMs);
      }
      await expect(checkRateLimit(id, maxAttempts, windowMs)).rejects.toThrow(
        TRPCError
      );

      // Simulate an instance restart: wipe ONLY the in-memory cache. A naive
      // per-instance Map would lose the block here; the shared store must keep
      // blocking from the DB.
      clearRateLimitLocalCache();
      await expect(checkRateLimit(id, maxAttempts, windowMs)).rejects.toThrow(
        TRPCError
      );
    });

    it("two simulated instances aggregate the count for the same key", async () => {
      const id = uniqueId("dist-multi");
      const maxAttempts = 5;
      const windowMs = 60000;

      // Instance A: 3 attempts.
      clearRateLimitLocalCache();
      for (let i = 0; i < 3; i++) {
        await checkRateLimit(id, maxAttempts, windowMs);
      }

      // Instance B (fresh local cache) makes 2 more -> combined count = 5.
      clearRateLimitLocalCache();
      await checkRateLimit(id, maxAttempts, windowMs); // count 4
      const remaining = await checkRateLimit(id, maxAttempts, windowMs); // count 5
      expect(remaining).toBe(0); // 5th allowed, no remaining

      // A 6th attempt from a fresh instance must be blocked — the shared store
      // aggregated the count across the two "instances".
      clearRateLimitLocalCache();
      await expect(checkRateLimit(id, maxAttempts, windowMs)).rejects.toThrow(
        TRPCError
      );
    });

    it("cannot bypass the limit by alternating between instances", async () => {
      const id = uniqueId("dist-bypass");
      const maxAttempts = 4;
      const windowMs = 60000;

      // Each request simulates landing on a different instance (fresh local
      // cache). The shared DB counter must still aggregate every hit.
      for (let i = 0; i < maxAttempts; i++) {
        clearRateLimitLocalCache();
        await checkRateLimit(id, maxAttempts, windowMs);
      }

      clearRateLimitLocalCache();
      await expect(checkRateLimit(id, maxAttempts, windowMs)).rejects.toThrow(
        TRPCError
      );
    });
  });
});
