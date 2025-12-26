import { z } from "zod";

/**
 * User API Validation Schemas
 *
 * Zod schemas for user-related operations like authentication,
 * profile updates, and password management
 */

// ============================================================================
// Authentication Schemas
// ============================================================================

/**
 * User registration schema
 */
export const registerUserSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    passwordConfirmation: z.string().min(8)
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords do not match",
    path: ["passwordConfirmation"]
  });

/**
 * User login schema
 */
export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required")
});

/**
 * OAuth provider schema
 */
export const oauthProviderSchema = z.enum(["google", "github"]);

// ============================================================================
// Profile Management Schemas
// ============================================================================

/**
 * Update email schema
 */
export const updateEmailSchema = z.object({
  email: z.string().email()
});

/**
 * Update display name schema
 */
export const updateDisplayNameSchema = z.object({
  displayName: z.string().min(1).max(50)
});

/**
 * Update profile image schema
 */
export const updateProfileImageSchema = z.object({
  imageUrl: z.string().url()
});

// ============================================================================
// Password Management Schemas
// ============================================================================

/**
 * Change password schema (requires old password)
 */
export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    newPasswordConfirmation: z.string().min(8)
  })
  .refine((data) => data.newPassword === data.newPasswordConfirmation, {
    message: "Passwords do not match",
    path: ["newPasswordConfirmation"]
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"]
  });

/**
 * Set password schema (for OAuth users adding password)
 */
export const setPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    newPasswordConfirmation: z.string().min(8)
  })
  .refine((data) => data.newPassword === data.newPasswordConfirmation, {
    message: "Passwords do not match",
    path: ["newPasswordConfirmation"]
  });

/**
 * Request password reset schema
 */
export const requestPasswordResetSchema = z.object({
  email: z.string().email()
});

/**
 * Reset password schema (with token)
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    newPasswordConfirmation: z.string().min(8)
  })
  .refine((data) => data.newPassword === data.newPasswordConfirmation, {
    message: "Passwords do not match",
    path: ["newPasswordConfirmation"]
  });

// ============================================================================
// Account Management Schemas
// ============================================================================

/**
 * Delete account schema
 */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required to delete account")
});

/**
 * Email verification schema
 */
export const verifyEmailSchema = z.object({
  token: z.string().min(1)
});

// ============================================================================
// Type Exports
// ============================================================================

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
export type OAuthProvider = z.infer<typeof oauthProviderSchema>;
export type UpdateEmailInput = z.infer<typeof updateEmailSchema>;
export type UpdateDisplayNameInput = z.infer<typeof updateDisplayNameSchema>;
export type UpdateProfileImageInput = z.infer<typeof updateProfileImageSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
