/**
 * Password Security Tests
 * Tests for password hashing, validation, strength requirements, and timing attacks
 */

import { describe, it, expect } from "bun:test";
import {
  hashPassword,
  checkPassword,
  checkPasswordSafe
} from "~/server/password";
import { validatePassword, passwordsMatch } from "~/lib/validation";
import { measureTime } from "./test-utils";

describe("Password Security", () => {
  describe("Password Hashing", () => {
    it("should hash passwords using bcrypt", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it("should generate unique hashes for same password", async () => {
      const password = "TestPassword123!";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it("should generate hashes with sufficient length", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);

      expect(hash.length).toBe(60);
    });

    it("should handle very long passwords", async () => {
      const longPassword = "a".repeat(1000);
      const hash = await hashPassword(longPassword);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(60);
    });

    it("should handle passwords with special characters", async () => {
      const specialPassword = "P@ssw0rd!#$%^&*()_+-=[]{}|;:',.<>?/~`";
      const hash = await hashPassword(specialPassword);

      expect(hash).toBeDefined();
      const match = await checkPassword(specialPassword, hash);
      expect(match).toBe(true);
    });

    it("should handle passwords with unicode characters", async () => {
      const unicodePassword = "Pässwörd123🔐🛡️";
      const hash = await hashPassword(unicodePassword);

      expect(hash).toBeDefined();
      const match = await checkPassword(unicodePassword, hash);
      expect(match).toBe(true);
    });

    it("should handle empty passwords", async () => {
      const emptyPassword = "";
      const hash = await hashPassword(emptyPassword);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(60);
    });
  });

  describe("Password Verification", () => {
    it("should verify correct password", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);
      const match = await checkPassword(password, hash);

      expect(match).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "TestPassword123!";
      const wrongPassword = "WrongPassword123!";
      const hash = await hashPassword(password);
      const match = await checkPassword(wrongPassword, hash);

      expect(match).toBe(false);
    });

    it("should be case-sensitive", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);
      const match = await checkPassword("testpassword123!", hash);

      expect(match).toBe(false);
    });

    it("should detect single character differences", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);
      const almostMatch = "TestPassword124!";
      const match = await checkPassword(almostMatch, hash);

      expect(match).toBe(false);
    });

    it("should reject password with extra characters", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);
      const match = await checkPassword(password + "x", hash);

      expect(match).toBe(false);
    });

    it("should reject password missing characters", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);
      const match = await checkPassword(password.slice(0, -1), hash);

      expect(match).toBe(false);
    });
  });

  describe("Timing Attack Prevention", () => {
    it("should use constant time comparison in checkPasswordSafe", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);

      const { duration: correctDuration } = await measureTime(() =>
        checkPasswordSafe(password, hash)
      );

      const { duration: incorrectDuration } = await measureTime(() =>
        checkPasswordSafe("WrongPassword123!", hash)
      );

      const timingDifference = Math.abs(correctDuration - incorrectDuration);

      expect(timingDifference).toBeLessThan(50);
    });

    it("should handle null hash without timing leak", async () => {
      const password = "TestPassword123!";

      const { result: result1, duration: duration1 } = await measureTime(() =>
        checkPasswordSafe(password, null)
      );

      const { result: result2, duration: duration2 } = await measureTime(() =>
        checkPasswordSafe(password, undefined)
      );

      expect(result1).toBe(false);
      expect(result2).toBe(false);

      const timingDifference = Math.abs(duration1 - duration2);
      expect(timingDifference).toBeLessThan(50);
    });

    it("should run bcrypt even when user doesn't exist", async () => {
      const password = "TestPassword123!";

      // checkPasswordSafe should always run bcrypt to prevent timing attacks
      const { duration } = await measureTime(() =>
        checkPasswordSafe(password, null)
      );

      expect(duration).toBeGreaterThan(1);
    });

    it("should have consistent timing for user exists vs not exists", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);

      const { duration: existsDuration } = await measureTime(() =>
        checkPasswordSafe("WrongPassword", hash)
      );

      const { duration: notExistsDuration } = await measureTime(() =>
        checkPasswordSafe("WrongPassword", null)
      );

      // Timing should be similar to prevent user enumeration
      const timingDifference = Math.abs(existsDuration - notExistsDuration);
      expect(timingDifference).toBeLessThan(50);
    });
  });

  describe("Password Validation", () => {
    it("should accept strong passwords", () => {
      const strongPassword = "MyStr0ng!P@ssw0rd";
      const result = validatePassword(strongPassword);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.strength).toBe("good");
    });

    it("should reject passwords shorter than 12 characters", () => {
      const shortPassword = "Short1!";
      const result = validatePassword(shortPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must be at least 12 characters long"
      );
    });

    it("should reject passwords without uppercase letters", () => {
      const noUppercase = "lowercase123!@#";
      const result = validatePassword(noUppercase);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one uppercase letter"
      );
    });

    it("should reject passwords without lowercase letters", () => {
      const noLowercase = "UPPERCASE123!@#";
      const result = validatePassword(noLowercase);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one lowercase letter"
      );
    });

    it("should reject passwords without numbers", () => {
      const noNumbers = "NoNumbersHere!@#";
      const result = validatePassword(noNumbers);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one number"
      );
    });

    it("should reject passwords without special characters", () => {
      const noSpecial = "NoSpecialChars123";
      const result = validatePassword(noSpecial);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one special character"
      );
    });

    it("should reject common weak passwords", () => {
      const commonPatterns = [
        "Password123!",
        "Qwerty123456!",
        "Letmein12345!",
        "Welcome123!@"
      ];

      for (const password of commonPatterns) {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes("common patterns"))).toBe(
          true
        );
      }
    });

    it("should calculate password strength correctly", () => {
      const fairPassword = "MyP@ssw0rd12";
      const goodPassword = "MyStr0ng!P@ssw0rd";
      const strongPassword = "MyV3ry!Str0ng@P@ssw0rd123";

      expect(validatePassword(fairPassword).strength).toBe("fair");
      expect(validatePassword(goodPassword).strength).toBe("good");
      expect(validatePassword(strongPassword).strength).toBe("strong");
    });

    it("should mark weak passwords appropriately", () => {
      const weakPassword = "weak";
      const result = validatePassword(weakPassword);

      expect(result.strength).toBe("weak");
      expect(result.isValid).toBe(false);
    });
  });

  describe("Password Matching", () => {
    it("should confirm matching passwords", () => {
      const password = "TestPassword123!";
      const confirmation = "TestPassword123!";

      expect(passwordsMatch(password, confirmation)).toBe(true);
    });

    it("should reject non-matching passwords", () => {
      const password = "TestPassword123!";
      const confirmation = "DifferentPassword123!";

      expect(passwordsMatch(password, confirmation)).toBe(false);
    });

    it("should reject empty passwords", () => {
      expect(passwordsMatch("", "")).toBe(false);
    });

    it("should be case-sensitive", () => {
      const password = "TestPassword123!";
      const confirmation = "testpassword123!";

      expect(passwordsMatch(password, confirmation)).toBe(false);
    });

    it("should detect single character differences", () => {
      const password = "TestPassword123!";
      const confirmation = "TestPassword124!";

      expect(passwordsMatch(password, confirmation)).toBe(false);
    });
  });

  describe("Password Attack Scenarios", () => {
    it("should resist brute force attacks with bcrypt slowness", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);

      const start = performance.now();
      const attempts = 10;

      for (let i = 0; i < attempts; i++) {
        await checkPassword(`attempt${i}`, hash);
      }

      const duration = performance.now() - start;
      const avgPerAttempt = duration / attempts;

      // This makes brute force impractical
      expect(avgPerAttempt).toBeGreaterThan(5); // At least 5ms per attempt
    });

    it("should prevent rainbow table attacks with unique salts", async () => {
      const password = "CommonPassword123!";

      const hashes = await Promise.all(
        Array.from({ length: 10 }, () => hashPassword(password))
      );

      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(10);
    });

    it("should prevent password spraying with validation", () => {
      const commonPasswords = [
        "Password123!",
        "Welcome123!",
        "Admin123!@#",
        "Letmein123!"
      ];

      for (const password of commonPasswords) {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
      }
    });

    it("should resist dictionary attacks", () => {
      const dictionaryBased = ["Sunshine123!", "Princess456!", "Dragon789!@"];

      for (const password of dictionaryBased) {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long passwords", async () => {
      const longPassword = "A1!a" + "x".repeat(1000);
      const hash = await hashPassword(longPassword);
      const match = await checkPassword(longPassword, hash);

      expect(match).toBe(true);
    });

    it("should handle passwords with only whitespace", async () => {
      const whitespacePassword = "    ";
      const result = validatePassword(whitespacePassword);

      expect(result.isValid).toBe(false);
    });

    it("should handle null bytes in passwords", async () => {
      const nullBytePassword = "Test\0Password123!";
      const hash = await hashPassword(nullBytePassword);
      const match = await checkPassword(nullBytePassword, hash);

      expect(typeof match).toBe("boolean");
    });

    it("should handle passwords with emoji", () => {
      const emojiPassword = "MyP@ssw0rd🔐🛡️123";
      const result = validatePassword(emojiPassword);

      expect(result.isValid).toBe(true);
    });

    it("should handle passwords with newlines", async () => {
      const newlinePassword = "Test\nPassword123!";
      const hash = await hashPassword(newlinePassword);
      const match = await checkPassword(newlinePassword, hash);

      expect(match).toBe(true);
    });

    it("should handle passwords with tabs", async () => {
      const tabPassword = "Test\tPassword123!";
      const hash = await hashPassword(tabPassword);
      const match = await checkPassword(tabPassword, hash);

      expect(match).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should hash passwords with appropriate slowness", async () => {
      const password = "TestPassword123!";

      const start = performance.now();
      await hashPassword(password);
      const duration = performance.now() - start;

      // Bcrypt should be slow enough to deter brute force
      expect(duration).toBeGreaterThan(5);
      // But not too slow for normal operation
      expect(duration).toBeLessThan(500);
    });

    it("should verify passwords with consistent timing", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);

      const durations: number[] = [];
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        await checkPassword(password, hash);
        durations.push(performance.now() - start);
      }

      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDeviation = Math.max(...durations.map((d) => Math.abs(d - avg)));

      expect(maxDeviation).toBeLessThan(avg * 0.5);
    });

    it("should validate passwords quickly", () => {
      const password = "TestPassword123!";

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        validatePassword(password);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe("bcrypt Salt Rounds", () => {
    it("should use appropriate salt rounds for security", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);

      const parts = hash.split("$");
      const rounds = parseInt(parts[2]);

      expect(rounds).toBe(10);
    });

    it("should generate cryptographically random salts", async () => {
      const password = "TestPassword123!";
      const hashes = await Promise.all(
        Array.from({ length: 100 }, () => hashPassword(password))
      );

      const salts = hashes.map((hash) => {
        const parts = hash.split("$");
        return parts[3].substring(0, 22); // Salt is 22 characters
      });

      const uniqueSalts = new Set(salts);
      expect(uniqueSalts.size).toBe(100);

      for (let i = 1; i < salts.length; i++) {
        // Salts should not be sequential or predictable
        expect(salts[i]).not.toBe(salts[i - 1]);
      }
    });
  });
});
