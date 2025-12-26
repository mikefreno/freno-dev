// lineage User
export interface User {
  id: string;
  email: string | null;
  email_verified: number;
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

export interface UserProfile {
  id: string;
  email?: string;
  emailVerified: boolean;
  displayName?: string;
  provider?: "email" | "google" | "github";
  image?: string;
  hasPassword: boolean;
}

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

export interface SessionPayload {
  id: string;
  email?: string;
}

export interface EmailVerificationPayload {
  email: string;
}

export interface PasswordResetPayload {
  email: string;
}
