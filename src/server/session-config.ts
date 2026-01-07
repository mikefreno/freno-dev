import type { SessionConfig } from "vinxi/http";
import { env } from "~/env/server";
import { AUTH_CONFIG, expiryToSeconds } from "~/config";

/**
 * Session data stored in encrypted cookie
 * This is synced with database Session table for serverless persistence
 */
export interface SessionData {
  /** User ID */
  userId: string;
  /** Session ID for database lookup and revocation */
  sessionId: string;
  /** Token family for rotation chain tracking */
  tokenFamily: string;
  /** Whether user is admin (cached from DB) */
  isAdmin: boolean;
  /** Refresh token for rotation (opaque, hashed in DB) */
  refreshToken: string;
  /** Remember me preference for session duration */
  rememberMe: boolean;
}

/**
 * Vinxi session configuration
 * Uses iron-session style password-based encryption
 */
export const sessionConfig: SessionConfig = {
  password: env.JWT_SECRET_KEY,
  cookieName: "session",
  cookieOptions: {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/"
    // maxAge is set dynamically based on rememberMe
  }
};

/**
 * Get session cookie options with appropriate maxAge
 * @param rememberMe - Whether to use extended session duration
 */
export function getSessionCookieOptions(rememberMe: boolean) {
  return {
    ...sessionConfig.cookieOptions,
    maxAge: rememberMe
      ? expiryToSeconds(AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_LONG)
      : undefined // Session cookie (expires on browser close)
  };
}
