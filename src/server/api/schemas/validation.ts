import { z } from "zod";

/**
 * Validation Schemas for tRPC Procedures
 *
 * These schemas are the source of truth for server-side validation.
 * Client-side validation (src/lib/validation.ts) is optional for UX only.
 */

// ============================================================================
// Base Schemas
// ============================================================================

/**
 * Email validation schema
 * - Must be valid email format
 * - Min 3 chars, max 255 chars
 * - Trimmed and lowercased automatically
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email address")
  .min(3, "Email too short")
  .max(255, "Email too long");

/**
 * Password validation schema
 * - Minimum 8 characters
 * - Maximum 128 characters
 * - Can add additional complexity requirements if needed
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long");

/**
 * Display name validation schema
 * - Minimum 1 character (after trim)
 * - Maximum 50 characters
 */
export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Display name is required")
  .max(50, "Display name too long");

/**
 * Comment body validation schema
 * - Minimum 1 character (after trim)
 * - Maximum 10,000 characters
 */
export const commentBodySchema = z
  .string()
  .trim()
  .min(1, "Comment cannot be empty")
  .max(10000, "Comment too long (max 10,000 characters)");

// ============================================================================
// Composed Schemas
// ============================================================================

/**
 * Email/password login schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: z.boolean().optional()
});

/**
 * Email/password registration schema with password confirmation
 */
export const registrationSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    passwordConfirmation: passwordSchema,
    displayName: displayNameSchema.optional()
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords do not match",
    path: ["passwordConfirmation"]
  });

/**
 * Password change schema (requires old password)
 */
export const passwordChangeSchema = z
  .object({
    oldPassword: passwordSchema,
    newPassword: passwordSchema,
    newPasswordConfirmation: passwordSchema
  })
  .refine((data) => data.newPassword === data.newPasswordConfirmation, {
    message: "New passwords do not match",
    path: ["newPasswordConfirmation"]
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: "New password must be different from old password",
    path: ["newPassword"]
  });

/**
 * Password reset schema (no old password required)
 */
export const passwordResetSchema = z
  .object({
    token: z.string(),
    newPassword: passwordSchema,
    newPasswordConfirmation: passwordSchema
  })
  .refine((data) => data.newPassword === data.newPasswordConfirmation, {
    message: "Passwords do not match",
    path: ["newPasswordConfirmation"]
  });

/**
 * Password set schema (for OAuth users setting password first time)
 */
export const passwordSetSchema = z
  .object({
    password: passwordSchema,
    passwordConfirmation: passwordSchema
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords do not match",
    path: ["passwordConfirmation"]
  });

/**
 * Update email schema
 */
export const updateEmailSchema = z.object({
  email: emailSchema
});

/**
 * Update display name schema
 */
export const updateDisplayNameSchema = z.object({
  displayName: displayNameSchema
});

/**
 * Account deletion schema
 */
export const deleteAccountSchema = z.object({
  password: passwordSchema
});
