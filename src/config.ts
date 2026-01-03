/**
 * Application Configuration
 * Central location for all configurable values including timeouts, limits, durations, etc.
 */

// ============================================================
// AUTHENTICATION & SESSION
// ============================================================

export const AUTH_CONFIG = {
  /** JWT token expiration for regular sessions (with remember me) */
  JWT_EXPIRY: "14d" as const,
  /** JWT token expiration for sessions without remember me */
  JWT_EXPIRY_SHORT: "12h" as const,
  /** Session cookie max age in seconds (14 days) */
  SESSION_COOKIE_MAX_AGE: 60 * 60 * 24 * 14, // 14 days
  /** Remember me cookie max age in seconds */
  REMEMBER_ME_MAX_AGE: 60 * 60 * 24 * 14, // 14 days
  /** CSRF token cookie max age in seconds (14 days) */
  CSRF_TOKEN_MAX_AGE: 60 * 60 * 24 * 14, // 14 days
  /** Email login link JWT expiration (15 minutes - provides reasonable time to check email without being too permissive) */
  EMAIL_LOGIN_LINK_EXPIRY: "15m" as const,
  /** Email verification link JWT expiration (15 minutes) */
  EMAIL_VERIFICATION_LINK_EXPIRY: "15m" as const,
  /** Lineage JWT expiration for mobile game */
  LINEAGE_JWT_EXPIRY: "14d" as const
} as const;

// ============================================================
// RATE LIMITING
// ============================================================

export const RATE_LIMITS = {
  /** Login: 5 attempts per 15 minutes per IP */
  LOGIN_IP: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },
  /** Login: 5 attempts per hour per email */
  LOGIN_EMAIL: { maxAttempts: 5, windowMs: 60 * 60 * 1000 },
  /** Password reset: 3 attempts per hour per IP */
  PASSWORD_RESET_IP: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },
  /** Registration: 3 attempts per hour per IP */
  REGISTRATION_IP: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },
  /** Email verification: 5 attempts per 15 minutes per IP */
  EMAIL_VERIFICATION_IP: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }
} as const;

/** Rate limit store cleanup interval (5 minutes) */
export const RATE_LIMIT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

// ============================================================
// ACCOUNT SECURITY
// ============================================================

export const ACCOUNT_LOCKOUT = {
  /** Maximum failed login attempts before account lockout */
  MAX_FAILED_ATTEMPTS: 5,
  /** Account lockout duration in milliseconds (5 minutes) */
  LOCKOUT_DURATION_MS: 5 * 60 * 1000
} as const;

export const PASSWORD_RESET_CONFIG = {
  /** Password reset token expiry (1 hour) */
  TOKEN_EXPIRY_MS: 60 * 60 * 1000
} as const;

// ============================================================
// COOLDOWN TIMERS (CLIENT-SIDE COOKIES)
// ============================================================

export const COOLDOWN_TIMERS = {
  /** Email login link cooldown (2 minutes) */
  EMAIL_LOGIN_LINK_MS: 2 * 60 * 1000,
  /** Email login link cookie max age in seconds */
  EMAIL_LOGIN_LINK_COOKIE_MAX_AGE: 2 * 60,
  /** Password reset request cooldown (5 minutes) */
  PASSWORD_RESET_REQUEST_MS: 5 * 60 * 1000,
  /** Password reset request cookie max age in seconds */
  PASSWORD_RESET_REQUEST_COOKIE_MAX_AGE: 5 * 60,
  /** Contact form request cooldown (1 minute) */
  CONTACT_REQUEST_MS: 1 * 60 * 1000,
  /** Contact form request cookie max age in seconds */
  CONTACT_REQUEST_COOKIE_MAX_AGE: 1 * 60,
  /** Email verification cooldown (15 minutes) */
  EMAIL_VERIFICATION_MS: 15 * 60 * 1000,
  /** Email verification cookie max age in seconds */
  EMAIL_VERIFICATION_COOKIE_MAX_AGE: 15 * 60
} as const;

// ============================================================
// CACHE & DATA PERSISTENCE
// ============================================================

export const CACHE_CONFIG = {
  /** Blog cache TTL (24 hours) */
  BLOG_CACHE_TTL_MS: 24 * 60 * 60 * 1000,
  /** Git activity cache TTL (10 minutes) */
  GIT_ACTIVITY_CACHE_TTL_MS: 10 * 60 * 1000,
  /** Blog posts list cache TTL (5 minutes) */
  BLOG_POSTS_LIST_CACHE_TTL_MS: 5 * 60 * 1000,
  /** Maximum stale data age (7 days) */
  MAX_STALE_DATA_MS: 7 * 24 * 60 * 60 * 1000,
  /** Git activity max stale age (24 hours) */
  GIT_ACTIVITY_MAX_STALE_MS: 24 * 60 * 60 * 1000
} as const;

// ============================================================
// NETWORK & API
// ============================================================

export const NETWORK_CONFIG = {
  /** Default API timeout for email service (15 seconds) */
  EMAIL_API_TIMEOUT_MS: 15000,
  /** Default API timeout for GitHub OAuth (15 seconds) */
  GITHUB_API_TIMEOUT_MS: 15000,
  /** Default API timeout for Google OAuth (15 seconds) */
  GOOGLE_API_TIMEOUT_MS: 15000,
  /** Maximum retry attempts for failed requests */
  MAX_RETRIES: 2,
  /** Retry delay between attempts (1 second) */
  RETRY_DELAY_MS: 1000
} as const;

// ============================================================
// UI/UX - TYPEWRITER COMPONENT
// ============================================================

export const TYPEWRITER_CONFIG = {
  /** Default typing speed (characters per second) */
  DEFAULT_SPEED: 30,
  /** Fast typing speed */
  FAST_SPEED: 80,
  /** Slow typing speed */
  SLOW_SPEED: 10,
  /** Very slow typing speed */
  VERY_SLOW_SPEED: 100,
  /** Extra slow typing speed */
  EXTRA_SLOW_SPEED: 120,
  /** Default keep alive duration (ms) */
  DEFAULT_KEEP_ALIVE_MS: 2000,
  /** Long keep alive duration (ms) */
  LONG_KEEP_ALIVE_MS: 10000,
  /** Default initial delay (ms) */
  DEFAULT_DELAY_MS: 500,
  /** Cursor fade delay after completion (1 second) */
  CURSOR_FADE_DELAY_MS: 1000
} as const;

// ============================================================
// UI/UX - COUNTDOWN TIMER COMPONENT
// ============================================================

export const COUNTDOWN_CONFIG = {
  /** Email login link countdown duration (2 minutes) */
  EMAIL_LOGIN_LINK_DURATION_S: 120,
  /** Password reset countdown duration (5 minutes) */
  PASSWORD_RESET_DURATION_S: 300,
  /** Contact form countdown duration (1 minute) */
  CONTACT_FORM_DURATION_S: 60,
  /** Password reset success redirect countdown (5 seconds) */
  PASSWORD_RESET_SUCCESS_DURATION_S: 5,
  /** Default timer size (pixels) */
  DEFAULT_TIMER_SIZE_PX: 48,
  /** Large timer size (pixels) */
  LARGE_TIMER_SIZE_PX: 200,
  /** Default stroke width */
  DEFAULT_STROKE_WIDTH: 6,
  /** Large stroke width */
  LARGE_STROKE_WIDTH: 12
} as const;

// ============================================================
// UI/UX - RESPONSIVE BREAKPOINTS
// ============================================================

export const BREAKPOINTS = {
  /** Mobile breakpoint (pixels) */
  MOBILE_MAX_WIDTH: 768,
  /** Tablet breakpoint (pixels) */
  TABLET_MAX_WIDTH: 1024,
  /** Desktop minimum width (pixels) */
  DESKTOP_MIN_WIDTH: 1025
} as const;

// ============================================================
// UI/UX - ANIMATIONS & TRANSITIONS
// ============================================================

export const ANIMATION_CONFIG = {
  /** Standard transition duration (ms) */
  TRANSITION_DURATION_MS: 300,
  /** Fast transition duration (ms) */
  FAST_TRANSITION_MS: 200,
  /** Slow transition duration (ms) */
  SLOW_TRANSITION_MS: 500,
  /** Extra slow transition duration (ms) */
  EXTRA_SLOW_TRANSITION_MS: 600,
  /** Sidebar toggle duration (ms) */
  SIDEBAR_DURATION_MS: 500,
  /** Menu typing effect delay (ms) */
  MENU_TYPING_DELAY_MS: 140,
  /** Menu initial delay (ms) */
  MENU_INITIAL_DELAY_MS: 500,
  /** Success message auto-hide duration (ms) */
  SUCCESS_MESSAGE_DURATION_MS: 3000,
  /** Error message auto-hide duration (ms) */
  ERROR_MESSAGE_DURATION_MS: 5000,
  /** Redirect delay after successful action (ms) */
  REDIRECT_DELAY_MS: 500
} as const;

// ============================================================
// UI/UX - PDF VIEWER
// ============================================================

export const PDF_CONFIG = {
  /** PDF rendering scale */
  RENDER_SCALE: 1.5
} as const;

// ============================================================
// UI/UX - 401 ERROR PAGE
// ============================================================

export const ERROR_PAGE_CONFIG = {
  /** Glitch effect interval (ms) */
  GLITCH_INTERVAL_MS: 300,
  /** Glitch effect duration (ms) */
  GLITCH_DURATION_MS: 100,
  /** Number of particles for background animation */
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
  CONTEXT_SIZE: 256
} as const;

// ============================================================
// VALIDATION
// ============================================================

export const VALIDATION_CONFIG = {
  /** Minimum password length (must match securePasswordSchema in schemas/user.ts) */
  MIN_PASSWORD_LENGTH: 8,
  /** Require at least one uppercase letter in password */
  PASSWORD_REQUIRE_UPPERCASE: true,
  /** Require at least one number in password */
  PASSWORD_REQUIRE_NUMBER: true,
  /** Require at least one special character in password (false = optional but recommended) */
  PASSWORD_REQUIRE_SPECIAL: false,
  /** Maximum message length for contact form */
  MAX_CONTACT_MESSAGE_LENGTH: 500,
  /** Minimum password confirmation match length before showing error */
  MIN_PASSWORD_CONF_LENGTH_FOR_ERROR: 6
} as const;

// ============================================================
// LINEAGE GAME (MOBILE APP)
// ============================================================

export const LINEAGE_CONFIG = {
  /** Database deletion grace period (24 hours) */
  DELETION_GRACE_PERIOD_MS: 24 * 60 * 60 * 1000,
  /** PvP opponents returned per query */
  PVP_OPPONENTS_COUNT: 3
} as const;

// ============================================================
// AUDIT & LOGGING
// ============================================================

export const AUDIT_CONFIG = {
  /** Default query limit for audit logs */
  DEFAULT_QUERY_LIMIT: 100,
  /** Maximum audit log retention (90 days) */
  MAX_RETENTION_DAYS: 90
} as const;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Convert milliseconds to seconds
 */
export function msToSeconds(ms: number): number {
  return Math.floor(ms / 1000);
}

/**
 * Convert seconds to milliseconds
 */
export function secondsToMs(seconds: number): number {
  return seconds * 1000;
}

/**
 * Convert minutes to milliseconds
 */
export function minutesToMs(minutes: number): number {
  return minutes * 60 * 1000;
}

/**
 * Convert hours to milliseconds
 */
export function hoursToMs(hours: number): number {
  return hours * 60 * 60 * 1000;
}

/**
 * Convert days to milliseconds
 */
export function daysToMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

/**
 * Check if screen width is mobile
 */
export function isMobileWidth(width: number): boolean {
  return width < BREAKPOINTS.MOBILE_MAX_WIDTH;
}

/**
 * Check if screen width is tablet
 */
export function isTabletWidth(width: number): boolean {
  return (
    width >= BREAKPOINTS.MOBILE_MAX_WIDTH &&
    width <= BREAKPOINTS.TABLET_MAX_WIDTH
  );
}

/**
 * Check if screen width is desktop
 */
export function isDesktopWidth(width: number): boolean {
  return width >= BREAKPOINTS.DESKTOP_MIN_WIDTH;
}
