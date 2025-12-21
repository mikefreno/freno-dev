/**
 * User type definitions matching database schema
 */

export interface User {
  id: string;
  email: string | null;
  email_verified: number; // SQLite boolean (0 or 1)
  password_hash: string | null;
  display_name: string | null;
  provider: "email" | "google" | "github" | null;
  image: string | null;
  apple_user_string: string | null;
  database_name: string | null;
  database_token: string | null;
  database_url: string | null;
  db_destroy_date: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Client-safe user data (excludes sensitive fields)
 */
export interface UserProfile {
  id: string;
  email?: string;
  emailVerified: boolean;
  displayName?: string;
  provider?: "email" | "google" | "github";
  image?: string;
  hasPassword: boolean;
}

/**
 * Convert database User to client-safe UserProfile
 */
export function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email ?? undefined,
    emailVerified: user.email_verified === 1,
    displayName: user.display_name ?? undefined,
    provider: user.provider ?? undefined,
    image: user.image ?? undefined,
    hasPassword: !!user.password_hash
  };
}

/**
 * JWT payload for session tokens
 */
export interface SessionPayload {
  id: string; // user ID
  email?: string;
}

/**
 * JWT payload for email verification
 */
export interface EmailVerificationPayload {
  email: string;
}

/**
 * JWT payload for password reset
 */
export interface PasswordResetPayload {
  email: string;
}
