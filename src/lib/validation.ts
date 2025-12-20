/**
 * Form validation utilities
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
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
