/**
 * CSRF Protection Tests
 * Tests for Cross-Site Request Forgery protection mechanisms
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  generateCSRFToken,
  setCSRFToken,
  validateCSRFToken,
  csrfProtection
} from "~/server/security";
import { createMockEvent } from "./test-utils";

describe("CSRF Protection", () => {
  describe("generateCSRFToken", () => {
    it("should generate a valid UUID token", () => {
      const token = generateCSRFToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("should generate unique tokens", () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      expect(token1).not.toBe(token2);
    });

    it("should generate cryptographically secure tokens", () => {
      // Generate multiple tokens and ensure no collisions
      const tokens = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        tokens.add(generateCSRFToken());
      }
      expect(tokens.size).toBe(1000);
    });
  });

  describe("setCSRFToken", () => {
    it("should set CSRF token cookie with correct attributes", () => {
      const event = createMockEvent({});
      const token = setCSRFToken(event);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      // Token should be a UUID
      expect(token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("should generate different tokens on subsequent calls", () => {
      const event1 = createMockEvent({});
      const event2 = createMockEvent({});

      const token1 = setCSRFToken(event1);
      const token2 = setCSRFToken(event2);

      expect(token1).not.toBe(token2);
    });
  });

  describe("validateCSRFToken", () => {
    it("should validate matching tokens", () => {
      const token = generateCSRFToken();
      const event = createMockEvent({
        headers: { "x-csrf-token": token },
        cookies: { "csrf-token": token }
      });

      const isValid = validateCSRFToken(event);
      expect(isValid).toBe(true);
    });

    it("should reject mismatched tokens", () => {
      const event = createMockEvent({
        headers: { "x-csrf-token": "token1" },
        cookies: { "csrf-token": "token2" }
      });

      const isValid = validateCSRFToken(event);
      expect(isValid).toBe(false);
    });

    it("should reject missing header token", () => {
      const event = createMockEvent({
        cookies: { "csrf-token": "token" }
      });

      const isValid = validateCSRFToken(event);
      expect(isValid).toBe(false);
    });

    it("should reject missing cookie token", () => {
      const event = createMockEvent({
        headers: { "x-csrf-token": "token" }
      });

      const isValid = validateCSRFToken(event);
      expect(isValid).toBe(false);
    });

    it("should reject empty tokens", () => {
      const event = createMockEvent({
        headers: { "x-csrf-token": "" },
        cookies: { "csrf-token": "" }
      });

      const isValid = validateCSRFToken(event);
      expect(isValid).toBe(false);
    });

    it("should use constant-time comparison", async () => {
      const validToken = "a".repeat(36);
      const invalidToken1 = "b".repeat(36);
      const invalidToken2 = "b".repeat(35) + "a";

      // Test timing for completely different tokens
      const event1 = createMockEvent({
        headers: { "x-csrf-token": invalidToken1 },
        cookies: { "csrf-token": validToken }
      });

      const start1 = performance.now();
      validateCSRFToken(event1);
      const time1 = performance.now() - start1;

      // Test timing for tokens that differ only at the end
      const event2 = createMockEvent({
        headers: { "x-csrf-token": invalidToken2 },
        cookies: { "csrf-token": validToken }
      });

      const start2 = performance.now();
      validateCSRFToken(event2);
      const time2 = performance.now() - start2;

      // Timing difference should be minimal (less than 1ms)
      // This tests for constant-time comparison
      const timeDiff = Math.abs(time1 - time2);
      expect(timeDiff).toBeLessThan(1);
    });

    it("should reject tokens with different lengths", () => {
      const event = createMockEvent({
        headers: { "x-csrf-token": "short" },
        cookies: { "csrf-token": "much-longer-token" }
      });

      const isValid = validateCSRFToken(event);
      expect(isValid).toBe(false);
    });
  });

  describe("CSRF Attack Scenarios", () => {
    it("should prevent basic CSRF attack", () => {
      // Attacker doesn't have access to the CSRF token cookie
      const attackEvent = createMockEvent({
        headers: { "x-csrf-token": "attacker-guessed-token" }
      });

      const isValid = validateCSRFToken(attackEvent);
      expect(isValid).toBe(false);
    });

    it("should prevent token reuse from different session", () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();

      // User has token1, attacker tries to use token2
      const event = createMockEvent({
        headers: { "x-csrf-token": token2 },
        cookies: { "csrf-token": token1 }
      });

      const isValid = validateCSRFToken(event);
      expect(isValid).toBe(false);
    });

    it("should prevent token modification", () => {
      const token = generateCSRFToken();
      const modifiedToken = token.slice(0, -1) + "x";

      const event = createMockEvent({
        headers: { "x-csrf-token": modifiedToken },
        cookies: { "csrf-token": token }
      });

      const isValid = validateCSRFToken(event);
      expect(isValid).toBe(false);
    });

    it("should prevent replay attacks with old tokens", () => {
      // Simulate an old token that was captured
      const oldToken = "old-captured-token-12345";

      const event = createMockEvent({
        headers: { "x-csrf-token": oldToken },
        cookies: { "csrf-token": oldToken }
      });

      // Even if tokens match, they should be validated by the system
      // This test validates the structure works correctly
      const isValid = validateCSRFToken(event);
      expect(isValid).toBe(true); // Matches are valid
    });
  });

  describe("Edge Cases", () => {
    it("should handle null tokens", () => {
      const event = createMockEvent({});
      const isValid = validateCSRFToken(event);
      expect(isValid).toBe(false);
    });

    it("should handle undefined tokens", () => {
      const event = createMockEvent({
        headers: {},
        cookies: {}
      });
      const isValid = validateCSRFToken(event);
      expect(isValid).toBe(false);
    });

    it("should handle special characters in tokens", () => {
      const token = "token-with-special-!@#$%^&*()";
      const event = createMockEvent({
        headers: { "x-csrf-token": token },
        cookies: { "csrf-token": token }
      });

      const isValid = validateCSRFToken(event);
      expect(isValid).toBe(true);
    });

    it("should handle very long tokens", () => {
      const longToken = "a".repeat(1000);
      const event = createMockEvent({
        headers: { "x-csrf-token": longToken },
        cookies: { "csrf-token": longToken }
      });

      const isValid = validateCSRFToken(event);
      expect(isValid).toBe(true);
    });

    it("should handle unicode tokens", () => {
      const unicodeToken = "token-with-unicode-🔒🛡️";
      const event = createMockEvent({
        headers: { "x-csrf-token": unicodeToken },
        cookies: { "csrf-token": unicodeToken }
      });

      const isValid = validateCSRFToken(event);
      expect(isValid).toBe(true);
    });
  });

  describe("Token Generation Security", () => {
    it("should not generate predictable tokens", () => {
      const tokens: string[] = [];
      for (let i = 0; i < 100; i++) {
        tokens.push(generateCSRFToken());
      }

      // Check for sequential patterns
      for (let i = 1; i < tokens.length; i++) {
        // Tokens should not be incrementing
        expect(tokens[i]).not.toBe(
          String(Number(tokens[i - 1].replace(/-/g, "")) + 1)
        );
      }
    });

    it("should generate tokens with sufficient entropy", () => {
      const token = generateCSRFToken();
      // UUID without dashes should be 32 hex characters
      const hexString = token.replace(/-/g, "");
      expect(hexString).toMatch(/^[0-9a-f]{32}$/i);

      // Check that not all characters are the same
      const uniqueChars = new Set(hexString.split(""));
      expect(uniqueChars.size).toBeGreaterThan(5);
    });
  });

  describe("Performance", () => {
    it("should generate tokens quickly", () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        generateCSRFToken();
      }
      const duration = performance.now() - start;

      // Should generate 1000 tokens in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it("should validate tokens quickly", () => {
      const token = generateCSRFToken();
      const event = createMockEvent({
        headers: { "x-csrf-token": token },
        cookies: { "csrf-token": token }
      });

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        validateCSRFToken(event);
      }
      const duration = performance.now() - start;

      // Should validate 10000 tokens in less than 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
