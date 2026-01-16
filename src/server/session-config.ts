import type { SessionConfig } from "vinxi/http";
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
 * Get session password directly from process.env
 * This avoids any bundler-time substitution issues with the validated env object
 */
function getSessionPassword(): string {
  // Read directly from process.env at runtime, not from bundled env object
  const password = process.env.JWT_SECRET_KEY;
  if (!password || password.trim() === "") {
    console.error(
      `[SessionConfig] JWT_SECRET_KEY missing from process.env! Keys available:`,
      Object.keys(process.env)
        .filter((k) => k.includes("JWT") || k.includes("SECRET"))
        .join(", ") || "none matching JWT/SECRET"
    );
    throw new Error(
      `JWT_SECRET_KEY is empty at runtime. Ensure it is set as a runtime environment variable in Vercel (not just build-time).`
    );
  }
  return password;
}

/**
 * Get session config with runtime password validation
 * Returns a fresh config each time to ensure env vars are read at call time,
 * not at module load time (important for serverless cold starts)
 */
export function getSessionConfig(): SessionConfig {
  return {
    password: getSessionPassword(),
    name: "session",
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    }
  };
}

/**
 * Vinxi session configuration
 * Using a getter ensures password is evaluated at access time, not module load time
 */
export const sessionConfig: SessionConfig = {
  get password() {
    return getSessionPassword();
  },
  name: "session",
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  }
};

/**
 * Get session cookie options with appropriate maxAge
 * @param rememberMe - Whether to use extended session duration
 */
export function getSessionCookieOptions(rememberMe: boolean) {
  return {
    ...sessionConfig.cookie,
    maxAge: rememberMe
      ? expiryToSeconds(AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_LONG)
      : undefined // Session cookie (expires on browser close)
  };
}
