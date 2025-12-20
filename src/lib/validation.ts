/**
 * Client-Side Validation Utilities (UX Only - NOT Security)
 *
 * ⚠️ IMPORTANT: These functions are for user experience only!
 *
 * Server-side validation in src/server/api/schemas/validation.ts is the
 * source of truth and security boundary. These client functions provide
 * instant feedback before submission but can be bypassed.
 *
 * Always rely on server validation for security.
 */

/**
 * Validate email format (client-side UX only)
 * Server validation is in src/server/api/schemas/validation.ts
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength (client-side UX only)
 * Server validation is in src/server/api/schemas/validation.ts
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  // Optional: Add more password requirements
  // if (!/[A-Z]/.test(password)) {
  //   errors.push("Password must contain at least one uppercase letter");
  // }
  // if (!/[a-z]/.test(password)) {
  //   errors.push("Password must contain at least one lowercase letter");
  // }
  // if (!/[0-9]/.test(password)) {
  //   errors.push("Password must contain at least one number");
  // }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if two passwords match (client-side UX only)
 * Server validation is in src/server/api/schemas/validation.ts
 */
export function passwordsMatch(
  password: string,
  confirmation: string
): boolean {
  return password === confirmation && password.length > 0;
}

/**
 * Validate display name (client-side UX only)
 * Server validation is in src/server/api/schemas/validation.ts
 */
export function isValidDisplayName(name: string): boolean {
  return name.trim().length >= 1 && name.trim().length <= 50;
}
