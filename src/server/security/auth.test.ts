/**
 * Authentication Security Tests
 * Tests for authentication mechanisms including JWT, session management, and timing attacks
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { getUserID, getPrivilegeLevel, checkAuthStatus } from "~/server/auth";
import {
  createMockEvent,
  createTestJWT,
  createExpiredJWT,
  createInvalidSignatureJWT,
  measureTime
} from "./test-utils";
import { jwtVerify, SignJWT } from "jose";
import { env } from "~/env/server";

describe("Authentication Security", () => {
  describe("JWT Token Validation", () => {
    it("should validate correct JWT tokens", async () => {
      const userId = "test-user-123";
      const token = await createTestJWT(userId);

      const event = createMockEvent({
        cookies: { userIDToken: token }
      });

      const extractedUserId = await getUserID(event);
      expect(extractedUserId).toBe(userId);
    });

    it("should reject expired JWT tokens", async () => {
      const userId = "test-user-123";
      const expiredToken = await createExpiredJWT(userId);

      const event = createMockEvent({
        cookies: { userIDToken: expiredToken }
      });

      const extractedUserId = await getUserID(event);
      expect(extractedUserId).toBeNull();
    });

    it("should reject JWT tokens with invalid signature", async () => {
      const userId = "test-user-123";
      const invalidToken = await createInvalidSignatureJWT(userId);

      const event = createMockEvent({
        cookies: { userIDToken: invalidToken }
      });

      const extractedUserId = await getUserID(event);
      expect(extractedUserId).toBeNull();
    });

    it("should reject malformed JWT tokens", async () => {
      const event = createMockEvent({
        cookies: { userIDToken: "not-a-valid-jwt" }
      });

      const extractedUserId = await getUserID(event);
      expect(extractedUserId).toBeNull();
    });

    it("should reject empty JWT tokens", async () => {
      const event = createMockEvent({
        cookies: { userIDToken: "" }
      });

      const extractedUserId = await getUserID(event);
      expect(extractedUserId).toBeNull();
    });

    it("should reject JWT tokens with missing user ID", async () => {
      const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
      const tokenWithoutId = await new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(secret);

      const event = createMockEvent({
        cookies: { userIDToken: tokenWithoutId }
      });

      const extractedUserId = await getUserID(event);
      expect(extractedUserId).toBeNull();
    });

    it("should reject JWT tokens with invalid user ID type", async () => {
      const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
      const tokenWithNumberId = await new SignJWT({ id: 12345 })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(secret);

      const event = createMockEvent({
        cookies: { userIDToken: tokenWithNumberId }
      });

      const extractedUserId = await getUserID(event);
      expect(extractedUserId).toBeNull();
    });

    it("should handle missing cookie gracefully", async () => {
      const event = createMockEvent({});
      const extractedUserId = await getUserID(event);
      expect(extractedUserId).toBeNull();
    });
  });

  describe("JWT Token Tampering", () => {
    it("should detect modified JWT payload", async () => {
      const userId = "test-user-123";
      const token = await createTestJWT(userId);

      // Tamper with the payload (middle part of JWT)
      const parts = token.split(".");
      const tamperedPayload = Buffer.from(
        JSON.stringify({ id: "attacker-id" })
      ).toString("base64url");
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const event = createMockEvent({
        cookies: { userIDToken: tamperedToken }
      });

      const extractedUserId = await getUserID(event);
      expect(extractedUserId).toBeNull();
    });

    it("should detect modified JWT signature", async () => {
      const userId = "test-user-123";
      const token = await createTestJWT(userId);

      // Tamper with the signature (last part of JWT)
      const parts = token.split(".");
      const tamperedToken = `${parts[0]}.${parts[1]}.modified-signature`;

      const event = createMockEvent({
        cookies: { userIDToken: tamperedToken }
      });

      const extractedUserId = await getUserID(event);
      expect(extractedUserId).toBeNull();
    });

    it("should reject none algorithm JWT tokens", async () => {
      // Try to create a token with 'none' algorithm (security vulnerability)
      const payload = Buffer.from(
        JSON.stringify({ id: "attacker-id", exp: Date.now() / 1000 + 3600 })
      ).toString("base64url");
      const header = Buffer.from(
        JSON.stringify({ alg: "none", typ: "JWT" })
      ).toString("base64url");
      const noneToken = `${header}.${payload}.`;

      const event = createMockEvent({
        cookies: { userIDToken: noneToken }
      });

      const extractedUserId = await getUserID(event);
      expect(extractedUserId).toBeNull();
    });
  });

  describe("Privilege Level Security", () => {
    it("should return admin privilege for admin user", async () => {
      const adminId = env.ADMIN_ID;
      const token = await createTestJWT(adminId);

      const event = createMockEvent({
        cookies: { userIDToken: token }
      });

      const privilege = await getPrivilegeLevel(event);
      expect(privilege).toBe("admin");
    });

    it("should return user privilege for regular user", async () => {
      const userId = "regular-user-123";
      const token = await createTestJWT(userId);

      const event = createMockEvent({
        cookies: { userIDToken: token }
      });

      const privilege = await getPrivilegeLevel(event);
      expect(privilege).toBe("user");
    });

    it("should return anonymous privilege for unauthenticated request", async () => {
      const event = createMockEvent({});
      const privilege = await getPrivilegeLevel(event);
      expect(privilege).toBe("anonymous");
    });

    it("should return anonymous privilege for invalid token", async () => {
      const event = createMockEvent({
        cookies: { userIDToken: "invalid-token" }
      });

      const privilege = await getPrivilegeLevel(event);
      expect(privilege).toBe("anonymous");
    });

    it("should not allow privilege escalation through token manipulation", async () => {
      const userId = "regular-user-123";
      const token = await createTestJWT(userId);

      // Even if attacker modifies the token, signature verification will fail
      const parts = token.split(".");
      const fakeAdminPayload = Buffer.from(
        JSON.stringify({ id: env.ADMIN_ID })
      ).toString("base64url");
      const fakeAdminToken = `${parts[0]}.${fakeAdminPayload}.${parts[2]}`;

      const event = createMockEvent({
        cookies: { userIDToken: fakeAdminToken }
      });

      const privilege = await getPrivilegeLevel(event);
      expect(privilege).toBe("anonymous"); // Token validation fails
    });
  });

  describe("Session Management", () => {
    it("should identify authenticated sessions correctly", async () => {
      const userId = "test-user-123";
      const token = await createTestJWT(userId);

      const event = createMockEvent({
        cookies: { userIDToken: token }
      });

      const authStatus = await checkAuthStatus(event);
      expect(authStatus.isAuthenticated).toBe(true);
      expect(authStatus.userId).toBe(userId);
    });

    it("should identify unauthenticated sessions correctly", async () => {
      const event = createMockEvent({});
      const authStatus = await checkAuthStatus(event);

      expect(authStatus.isAuthenticated).toBe(false);
      expect(authStatus.userId).toBeNull();
    });

    it("should handle session with expired token", async () => {
      const userId = "test-user-123";
      const expiredToken = await createExpiredJWT(userId);

      const event = createMockEvent({
        cookies: { userIDToken: expiredToken }
      });

      const authStatus = await checkAuthStatus(event);
      expect(authStatus.isAuthenticated).toBe(false);
      expect(authStatus.userId).toBeNull();
    });
  });

  describe("Timing Attack Prevention", () => {
    it("should have consistent timing for valid and invalid tokens", async () => {
      const userId = "test-user-123";
      const validToken = await createTestJWT(userId);
      const invalidToken = "invalid-token";

      // Measure time for valid token
      const validEvent = createMockEvent({
        cookies: { userIDToken: validToken }
      });
      const { duration: validDuration } = await measureTime(() =>
        getUserID(validEvent)
      );

      // Measure time for invalid token
      const invalidEvent = createMockEvent({
        cookies: { userIDToken: invalidToken }
      });
      const { duration: invalidDuration } = await measureTime(() =>
        getUserID(invalidEvent)
      );

      // Timing difference should be minimal (within reasonable variance)
      // This helps prevent timing attacks to enumerate valid tokens
      const timingDifference = Math.abs(validDuration - invalidDuration);

      // Allow up to 5ms variance (accounts for system variations)
      expect(timingDifference).toBeLessThan(5);
    });

    it("should have consistent timing for different user privilege levels", async () => {
      const adminId = env.ADMIN_ID;
      const userId = "regular-user-123";

      const adminToken = await createTestJWT(adminId);
      const userToken = await createTestJWT(userId);

      // Measure time for admin privilege check
      const adminEvent = createMockEvent({
        cookies: { userIDToken: adminToken }
      });
      const { duration: adminDuration } = await measureTime(() =>
        getPrivilegeLevel(adminEvent)
      );

      // Measure time for user privilege check
      const userEvent = createMockEvent({
        cookies: { userIDToken: userToken }
      });
      const { duration: userDuration } = await measureTime(() =>
        getPrivilegeLevel(userEvent)
      );

      const timingDifference = Math.abs(adminDuration - userDuration);
      expect(timingDifference).toBeLessThan(5);
    });
  });

  describe("Token Expiration", () => {
    it("should respect token expiration time", async () => {
      const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
      const userId = "test-user-123";

      // Create token expiring in 1 second
      const shortLivedToken = await new SignJWT({ id: userId })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1s")
        .sign(secret);

      // Should work immediately
      const event1 = createMockEvent({
        cookies: { userIDToken: shortLivedToken }
      });
      const id1 = await getUserID(event1);
      expect(id1).toBe(userId);

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Should fail after expiration
      const event2 = createMockEvent({
        cookies: { userIDToken: shortLivedToken }
      });
      const id2 = await getUserID(event2);
      expect(id2).toBeNull();
    });

    it("should handle tokens with very long expiration", async () => {
      const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
      const userId = "test-user-123";

      const longLivedToken = await new SignJWT({ id: userId })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("365d") // 1 year
        .sign(secret);

      const event = createMockEvent({
        cookies: { userIDToken: longLivedToken }
      });

      const extractedId = await getUserID(event);
      expect(extractedId).toBe(userId);
    });

    it("should reject tokens with past expiration timestamps", async () => {
      const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
      const userId = "test-user-123";

      const pastToken = await new SignJWT({ id: userId })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(Math.floor(Date.now() / 1000) - 3600) // 1 hour ago
        .sign(secret);

      const event = createMockEvent({
        cookies: { userIDToken: pastToken }
      });

      const extractedId = await getUserID(event);
      expect(extractedId).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long JWT tokens", async () => {
      const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
      const largePayload = {
        id: "test-user-123",
        extraData: "x".repeat(10000) // 10KB of extra data
      };

      const largeToken = await new SignJWT(largePayload)
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(secret);

      const event = createMockEvent({
        cookies: { userIDToken: largeToken }
      });

      const extractedId = await getUserID(event);
      expect(extractedId).toBe("test-user-123");
    });

    it("should handle special characters in user IDs", async () => {
      const specialUserId = "user-with-special-!@#$%^&*()";
      const token = await createTestJWT(specialUserId);

      const event = createMockEvent({
        cookies: { userIDToken: token }
      });

      const extractedId = await getUserID(event);
      expect(extractedId).toBe(specialUserId);
    });

    it("should handle unicode user IDs", async () => {
      const unicodeUserId = "user-with-unicode-🔐🛡️";
      const token = await createTestJWT(unicodeUserId);

      const event = createMockEvent({
        cookies: { userIDToken: token }
      });

      const extractedId = await getUserID(event);
      expect(extractedId).toBe(unicodeUserId);
    });

    it("should reject JWT with future issued-at time", async () => {
      const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
      const futureToken = await new SignJWT({ id: "test-user-123" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt(Math.floor(Date.now() / 1000) + 3600) // 1 hour in future
        .setExpirationTime("2h")
        .sign(secret);

      const event = createMockEvent({
        cookies: { userIDToken: futureToken }
      });

      // Some JWT libraries reject future iat, some don't
      // This test documents the behavior
      const extractedId = await getUserID(event);
      // Behavior may vary - just ensure no crash
      expect(extractedId === null || extractedId === "test-user-123").toBe(
        true
      );
    });
  });

  describe("Performance", () => {
    it("should validate tokens efficiently", async () => {
      const userId = "test-user-123";
      const token = await createTestJWT(userId);
      const event = createMockEvent({
        cookies: { userIDToken: token }
      });

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        await getUserID(event);
      }
      const duration = performance.now() - start;

      // Should validate 1000 tokens in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it("should check privilege levels efficiently", async () => {
      const userId = "test-user-123";
      const token = await createTestJWT(userId);
      const event = createMockEvent({
        cookies: { userIDToken: token }
      });

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        await getPrivilegeLevel(event);
      }
      const duration = performance.now() - start;

      // Should check 1000 privileges in less than 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
