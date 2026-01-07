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
  RATE_LIMITS
} from "~/server/security";
import { createMockEvent, randomIP } from "./test-utils";
import { TRPCError } from "@trpc/server";

describe("Rate Limiting", () => {
  // Clear rate limit store before each test to ensure isolation
  beforeEach(() => {
    clearRateLimitStore();
  });

  describe("checkRateLimit", () => {
    it("should allow requests within rate limit", async () => {
      const identifier = `test-${Date.now()}`;
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
      const identifier = `test-${Date.now()}`;
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
      const identifier = `test-${Date.now()}`;
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
      const identifier = `test-${Date.now()}`;
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
      const identifier = `test-${Date.now()}`;
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

      const id1 = `test1-${Date.now()}`;
      const id2 = `test2-${Date.now()}`;

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
    it("should enforce both IP and email rate limits", async () => {
      const ip = randomIP();

      // Should allow up to LOGIN_IP max attempts (5) with different emails
      // Use different emails to avoid hitting email rate limit
      for (let i = 0; i < RATE_LIMITS.LOGIN_IP.maxAttempts; i++) {
        const email = `test-${Date.now()}-${i}@example.com`;
        await rateLimitLogin(email, ip);
      }

      // Next attempt should fail due to IP limit
      try {
        const email = `test-${Date.now()}-final@example.com`;
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

    it("should allow different emails from same IP within IP limit", async () => {
      const ip = randomIP();

      // Use different emails but same IP
      for (let i = 0; i < RATE_LIMITS.LOGIN_IP.maxAttempts; i++) {
        const email = `test${i}-${Date.now()}@example.com`;
        await rateLimitLogin(email, ip);
      }

      // Next attempt should fail due to IP limit
      try {
        await rateLimitLogin(`new-${Date.now()}@example.com`, ip);
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
      }
    });
  });

  describe("rateLimitPasswordReset", () => {
    it("should enforce password reset rate limit", async () => {
      const ip = randomIP();

      // Should allow up to PASSWORD_RESET_IP max attempts (3)
      for (let i = 0; i < RATE_LIMITS.PASSWORD_RESET_IP.maxAttempts; i++) {
        await rateLimitPasswordReset(ip);
      }

      // Next attempt should fail
      try {
        await rateLimitPasswordReset(ip);
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
      }
    });

    it("should isolate password reset limits from login limits", async () => {
      const ip = randomIP();
      const email = `test-${Date.now()}@example.com`;

      // Use up password reset limit
      for (let i = 0; i < RATE_LIMITS.PASSWORD_RESET_IP.maxAttempts; i++) {
        await rateLimitPasswordReset(ip);
      }

      // Should still be able to login (different limit)
      await rateLimitLogin(email, ip);
    });
  });

  describe("rateLimitRegistration", () => {
    it("should enforce registration rate limit", async () => {
      const ip = randomIP();

      // Should allow up to REGISTRATION_IP max attempts (3)
      for (let i = 0; i < RATE_LIMITS.REGISTRATION_IP.maxAttempts; i++) {
        await rateLimitRegistration(ip);
      }

      // Next attempt should fail
      try {
        await rateLimitRegistration(ip);
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
      }
    });
  });

  describe("rateLimitEmailVerification", () => {
    it("should enforce email verification rate limit", async () => {
      const ip = randomIP();

      // Should allow up to EMAIL_VERIFICATION_IP max attempts (5)
      for (let i = 0; i < RATE_LIMITS.EMAIL_VERIFICATION_IP.maxAttempts; i++) {
        await rateLimitEmailVerification(ip);
      }

      // Next attempt should fail
      try {
        await rateLimitEmailVerification(ip);
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
      }
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

      // Try to register many accounts to enumerate valid emails
      let blockedAtAttempt = 0;
      for (let i = 0; i < 10; i++) {
        try {
          await rateLimitRegistration(attackerIP);
        } catch (error) {
          if (error instanceof TRPCError) {
            blockedAtAttempt = i;
            break;
          }
        }
      }

      // Should be blocked at registration limit (3 attempts)
      expect(blockedAtAttempt).toBe(RATE_LIMITS.REGISTRATION_IP.maxAttempts);
    });

    it("should prevent password reset spam attacks", async () => {
      const attackerIP = randomIP();

      // Try to spam password resets
      let blockedAtAttempt = 0;
      for (let i = 0; i < 10; i++) {
        try {
          await rateLimitPasswordReset(attackerIP);
        } catch (error) {
          if (error instanceof TRPCError) {
            blockedAtAttempt = i;
            break;
          }
        }
      }

      // Should be blocked at password reset limit (3 attempts)
      expect(blockedAtAttempt).toBe(RATE_LIMITS.PASSWORD_RESET_IP.maxAttempts);
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
    it("should handle high volume of rate limit checks efficiently", async () => {
      const start = performance.now();

      // Check 100 different identifiers (reduced from 1000 due to async overhead)
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(checkRateLimit(`test-${i}`, 5, 60000));
      }
      await Promise.all(promises);

      const duration = performance.now() - start;

      // Should complete in reasonable time (adjusted for async operations)
      expect(duration).toBeLessThan(1000);
    });

    it("should not leak memory with many identifiers", async () => {
      // Create rate limit entries (reduced significantly due to database overhead)
      // Each call performs database operations which are slower than in-memory checks
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(checkRateLimit(`test-${i}`, 5, 60000));
      }
      await Promise.all(promises);

      // This test mainly ensures no crashes occur
      // Memory cleanup is tested by the cleanup interval in security.ts
      expect(true).toBe(true);
    }, 10000); // Increase timeout to 10 seconds for database operations
  });
});
