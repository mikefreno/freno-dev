/**
 * Application Configuration
 * Central location for all configurable values including timeouts, limits, durations, etc.
 */

// ============================================================
// AUTHENTICATION & SESSION
// ============================================================

/**
 * AUTHENTICATION & SESSION CONFIGURATION
 *
 * Security Model:
 * - Access tokens: Short-lived (15m), contain user identity, stored in httpOnly cookie
 * - Refresh tokens: Long-lived (7-90d), opaque tokens for getting new access tokens
 * - Token rotation: Each refresh invalidates old token and issues new pair
 * - Breach detection: Reusing invalidated token revokes entire token family
 *
 * Timing Decisions:
 * - 15m access: Balance between security (short exposure) and UX (not too frequent refreshes)
 * - 7d refresh: Conservative default, users re-auth weekly
 * - 90d remember: Extended convenience for trusted devices
 * - 5s reuse window: Handles race conditions in distributed systems
 *
 * References:
 * - OWASP: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html
 * - RFC 6819: https://datatracker.ietf.org/doc/html/rfc6819#section-5.2
 */
export const AUTH_CONFIG = {
  // Access Token (JWT in cookie)
  ACCESS_TOKEN_EXPIRY: "15m" as const, // 15 minutes (short-lived)
  ACCESS_TOKEN_EXPIRY_DEV: "2m" as const, // 1 hour in dev for convenience

  // Refresh Token (opaque token in separate cookie)
  REFRESH_TOKEN_EXPIRY_SHORT: "7d" as const, // 7 days (no remember me)
  REFRESH_TOKEN_EXPIRY_LONG: "90d" as const, // 90 days (remember me)

  // Cookie MaxAge (in seconds - must match token lifetime)
  ACCESS_COOKIE_MAX_AGE: 15 * 60, // 15 minutes
  ACCESS_COOKIE_MAX_AGE_DEV: 60 * 60, // 1 hour in dev
  REFRESH_COOKIE_MAX_AGE_SHORT: 60 * 60 * 24 * 7, // 7 days
  REFRESH_COOKIE_MAX_AGE_LONG: 60 * 60 * 24 * 90, // 90 days

  // Legacy (keep for backwards compatibility during migration)
  JWT_EXPIRY: "15m" as const, // Deprecated: use ACCESS_TOKEN_EXPIRY
  JWT_EXPIRY_SHORT: "15m" as const, // Deprecated
  SESSION_COOKIE_MAX_AGE: 60 * 60 * 24 * 7, // Deprecated
  REMEMBER_ME_MAX_AGE: 60 * 60 * 24 * 90, // Deprecated

  // Security Settings
  REFRESH_TOKEN_ROTATION_ENABLED: true, // Enable token rotation
  MAX_ROTATION_COUNT: 100, // Max rotations before forcing re-login
  REFRESH_TOKEN_REUSE_WINDOW_MS: 5000, // 5s grace period for race conditions

  // Session Cleanup (serverless-friendly opportunistic cleanup)
  SESSION_CLEANUP_INTERVAL_HOURS: 24, // Check for cleanup every 24 hours
  SESSION_CLEANUP_RETENTION_DAYS: 90, // Keep revoked sessions for 90 days (audit)

  // Other Auth Settings
  CSRF_TOKEN_MAX_AGE: 60 * 60 * 24 * 14,
  EMAIL_LOGIN_LINK_EXPIRY: "15m" as const,
  EMAIL_VERIFICATION_LINK_EXPIRY: "15m" as const,
  LINEAGE_JWT_EXPIRY: "14d" as const
} as const;

/**
 * Get access token expiry based on environment
 */
export function getAccessTokenExpiry(): string {
  return process.env.NODE_ENV === "production"
    ? AUTH_CONFIG.ACCESS_TOKEN_EXPIRY
    : AUTH_CONFIG.ACCESS_TOKEN_EXPIRY_DEV;
}

/**
 * Get access cookie maxAge based on environment (in seconds)
 */
export function getAccessCookieMaxAge(): number {
  return process.env.NODE_ENV === "production"
    ? AUTH_CONFIG.ACCESS_COOKIE_MAX_AGE
    : AUTH_CONFIG.ACCESS_COOKIE_MAX_AGE_DEV;
}

/**
 * Type helper for token expiry strings
 */
export type TokenExpiry =
  | typeof AUTH_CONFIG.ACCESS_TOKEN_EXPIRY
  | typeof AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_SHORT
  | typeof AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_LONG;

// ============================================================
// RATE LIMITING
// ============================================================

export const RATE_LIMITS = {
  LOGIN_IP: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },
  LOGIN_EMAIL: { maxAttempts: 5, windowMs: 60 * 60 * 1000 },
  PASSWORD_RESET_IP: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },
  REGISTRATION_IP: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },
  EMAIL_VERIFICATION_IP: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }
} as const;

/** Rate limit store cleanup interval (5 minutes) */
export const RATE_LIMIT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

// ============================================================
// ACCOUNT SECURITY
// ============================================================

export const ACCOUNT_LOCKOUT = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 5 * 60 * 1000
} as const;

export const PASSWORD_RESET_CONFIG = {
  TOKEN_EXPIRY_MS: 60 * 60 * 1000
} as const;

// ============================================================
// COOLDOWN TIMERS (CLIENT-SIDE COOKIES)
// ============================================================

export const COOLDOWN_TIMERS = {
  EMAIL_LOGIN_LINK_MS: 2 * 60 * 1000,
  EMAIL_LOGIN_LINK_COOKIE_MAX_AGE: 2 * 60,
  PASSWORD_RESET_REQUEST_MS: 5 * 60 * 1000,
  PASSWORD_RESET_REQUEST_COOKIE_MAX_AGE: 5 * 60,
  CONTACT_REQUEST_MS: 1 * 60 * 1000,
  CONTACT_REQUEST_COOKIE_MAX_AGE: 1 * 60,
  EMAIL_VERIFICATION_MS: 15 * 60 * 1000,
  EMAIL_VERIFICATION_COOKIE_MAX_AGE: 15 * 60
} as const;

// ============================================================
// CACHE & DATA PERSISTENCE
// ============================================================

export const CACHE_CONFIG = {
  BLOG_CACHE_TTL_MS: 24 * 60 * 60 * 1000,
  GIT_ACTIVITY_CACHE_TTL_MS: 10 * 60 * 1000,
  BLOG_POSTS_LIST_CACHE_TTL_MS: 5 * 60 * 1000,
  MAX_STALE_DATA_MS: 7 * 24 * 60 * 60 * 1000,
  GIT_ACTIVITY_MAX_STALE_MS: 24 * 60 * 60 * 1000
} as const;

// ============================================================
// NETWORK & API
// ============================================================

export const NETWORK_CONFIG = {
  EMAIL_API_TIMEOUT_MS: 15 * 1000,
  GITHUB_API_TIMEOUT_MS: 15 * 1000,
  GOOGLE_API_TIMEOUT_MS: 15 * 1000,
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 1000
} as const;

// ============================================================
// UI/UX - TYPEWRITER COMPONENT
// ============================================================

export const TYPEWRITER_CONFIG = {
  DEFAULT_SPEED: 30,
  FAST_SPEED: 80,
  SLOW_SPEED: 10,
  VERY_SLOW_SPEED: 100,
  EXTRA_SLOW_SPEED: 120,
  DEFAULT_KEEP_ALIVE_MS: 2000,
  LONG_KEEP_ALIVE_MS: 10000,
  DEFAULT_DELAY_MS: 500,
  CURSOR_FADE_DELAY_MS: 1000
} as const;

// ============================================================
// UI/UX - COUNTDOWN TIMER COMPONENT
// ============================================================

export const COUNTDOWN_CONFIG = {
  EMAIL_LOGIN_LINK_DURATION_S: 120,
  PASSWORD_RESET_DURATION_S: 300,
  CONTACT_FORM_DURATION_S: 60,
  PASSWORD_RESET_SUCCESS_DURATION_S: 5,
  DEFAULT_TIMER_SIZE_PX: 48,
  LARGE_TIMER_SIZE_PX: 200,
  DEFAULT_STROKE_WIDTH: 6,
  LARGE_STROKE_WIDTH: 12
} as const;

// ============================================================
// UI/UX - RESPONSIVE BREAKPOINTS
// ============================================================

export const BREAKPOINTS = {
  MOBILE_MAX_WIDTH: 768,
  TABLET_MAX_WIDTH: 1024,
  DESKTOP_MIN_WIDTH: 1025
} as const;

// ============================================================
// UI/UX - ANIMATIONS & TRANSITIONS
// ============================================================

export const ANIMATION_CONFIG = {
  TRANSITION_DURATION_MS: 300,
  FAST_TRANSITION_MS: 200,
  SLOW_TRANSITION_MS: 500,
  EXTRA_SLOW_TRANSITION_MS: 600,
  SIDEBAR_DURATION_MS: 500,
  MENU_TYPING_DELAY_MS: 140,
  MENU_INITIAL_DELAY_MS: 500,
  SUCCESS_MESSAGE_DURATION_MS: 3000,
  ERROR_MESSAGE_DURATION_MS: 5000,
  REDIRECT_DELAY_MS: 500
} as const;

// ============================================================
// UI/UX - PDF VIEWER
// ============================================================

export const PDF_CONFIG = {
  RENDER_SCALE: 1.5
} as const;

// ============================================================
// UI/UX - 401 ERROR PAGE
// ============================================================

export const ERROR_PAGE_CONFIG = {
  GLITCH_INTERVAL_MS: 300,
  GLITCH_DURATION_MS: 100,
  PARTICLE_COUNT: 45
} as const;

// ============================================================
// UI/UX - MOBILE CONFIG
// ============================================================

export const MOBILE_CONFIG = {
  SCROLL_THRESHOLD: 75,
  SWIPE_THRESHOLD: 50
} as const;

// ============================================================
// UI/UX - TEXT EDITOR
// ============================================================

export const TEXT_EDITOR_CONFIG = {
  CONTEXT_SIZE: 256,
  MAX_HISTORY_SIZE: 100,
  HISTORY_DEBOUNCE_MS: 2000,
  INFILL_DEBOUNCE_MS: 500,
  INFILL_MAX_TOKENS: 100,
  INFILL_TEMPERATURE: 0.3,
  MERMAID_VALIDATION_DEBOUNCE_MS: 500,
  LEGACY_MIGRATION_DELAY_MS: 50,
  INITIAL_HISTORY_CAPTURE_DELAY_MS: 200,
  INITIAL_LOAD_FALLBACK_DELAY_MS: 500,
  INITIAL_LOAD_DELAY_MS: 1000,
  SPINNER_INTERVAL_MS: 50,
  HIGHLIGHT_FADE_DELAY_MS: 400,
  HIGHLIGHT_REMOVE_DELAY_MS: 1000,
  REFERENCE_UPDATE_DELAY_MS: 500,
  SCROLL_TO_CHANGE_DELAY_MS: 100
} as const;

// ============================================================
// VALIDATION
// ============================================================

export const VALIDATION_CONFIG = {
  MIN_PASSWORD_LENGTH: 8,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_NUMBER: true,
  PASSWORD_REQUIRE_SPECIAL: false,
  MAX_CONTACT_MESSAGE_LENGTH: 500,
  MIN_PASSWORD_CONF_LENGTH_FOR_ERROR: 6
} as const;

// ============================================================
// LINEAGE GAME (MOBILE APP)
// ============================================================

export const LINEAGE_CONFIG = {
  DELETION_GRACE_PERIOD_MS: 24 * 60 * 60 * 1000,
  PVP_OPPONENTS_COUNT: 3
} as const;

// ============================================================
// AUDIT & LOGGING
// ============================================================

export const AUDIT_CONFIG = {
  DEFAULT_QUERY_LIMIT: 100,
  MAX_RETENTION_DAYS: 90
} as const;

// ============================================================
// SESSION CLEANUP
// ============================================================

export const SESSION_CLEANUP_CONFIG = {
  ENABLED: true,
  INTERVAL_HOURS: 24,
  RETENTION_DAYS: 90,
  RUN_ON_STARTUP: true
} as const;
