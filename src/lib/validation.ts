/**
 * Form validation utilities
 */

import { VALIDATION_CONFIG } from "~/config";

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return false;
  }

  // Additional checks for invalid patterns
  // Reject consecutive dots
  if (email.includes("..")) {
    return false;
  }

  return true;
}

/**
 * Password strength levels
 */
export type PasswordStrength = "weak" | "fair" | "good" | "strong";

/**
 * Validate password strength with comprehensive requirements
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
  strength: PasswordStrength;
} {
  const errors: string[] = [];
  let includesSpecial = false;

  // Minimum length from config
  if (password.length < VALIDATION_CONFIG.MIN_PASSWORD_LENGTH) {
    errors.push(
      `Password must be at least ${VALIDATION_CONFIG.MIN_PASSWORD_LENGTH} characters long`
    );
  }

  // Require uppercase letter (if configured)
  if (VALIDATION_CONFIG.PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  // Require lowercase letter (always required for balanced security)
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  // Require number (if configured)
  if (VALIDATION_CONFIG.PASSWORD_REQUIRE_NUMBER && !/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    includesSpecial = true;
  }
  // Require special character (if configured)
  if (VALIDATION_CONFIG.PASSWORD_REQUIRE_SPECIAL && !includesSpecial) {
    errors.push("Password must contain at least one special character");
  }

  // Check for common weak passwords
  const commonPasswords = [
    "password",
    "1234",
    "5678",
    "qwerty",
    "letmein",
    "welcome",
    "monkey",
    "dragon",
    "master",
    "sunshine",
    "princess",
    "admin",
    "login"
  ];

  const lowerPassword = password.toLowerCase();
  for (const common of commonPasswords) {
    if (lowerPassword.includes(common)) {
      errors.push("Password contains common patterns and is not secure");
      break;
    }
  }

  // Calculate password strength
  let strength: PasswordStrength = "weak";

  if (errors.length === 0) {
    if (includesSpecial) {
      if (password.length >= 14) {
        strength = "strong";
      } else if (password.length >= VALIDATION_CONFIG.MIN_PASSWORD_LENGTH) {
        strength = "good";
      }
    }
    if (password.length >= 16) {
      strength = "strong";
    } else if (password.length >= 12) {
      strength = "good";
    } else if (password.length >= VALIDATION_CONFIG.MIN_PASSWORD_LENGTH) {
      strength = "fair";
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
}

/**
 * Check if two passwords match
 */
export function passwordsMatch(
  password: string,
  confirmation: string
): boolean {
  return password === confirmation && password.length > 0;
}

/**
 * Validate display name
 */
export function isValidDisplayName(name: string): boolean {
  return name.trim().length >= 1 && name.trim().length <= 50;
}
