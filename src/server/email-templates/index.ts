import { AUTH_CONFIG } from "~/config";

// Import email templates as raw strings - Vite will bundle these at build time
import loginLinkTemplate from "./login-link.html?raw";
import passwordResetTemplate from "./password-reset.html?raw";
import emailVerificationTemplate from "./email-verification.html?raw";

/**
 * Convert expiry string to human-readable format
 * @param expiry - Expiry string like "15m", "1h", "7d"
 * @returns Human-readable string like "15 minutes", "1 hour", "7 days"
 */
export function expiryToHuman(expiry: string): string {
  const value = parseInt(expiry);
  if (expiry.endsWith("m")) {
    return value === 1 ? "1 minute" : `${value} minutes`;
  } else if (expiry.endsWith("h")) {
    return value === 1 ? "1 hour" : `${value} hours`;
  } else if (expiry.endsWith("d")) {
    return value === 1 ? "1 day" : `${value} days`;
  }
  return expiry;
}

/**
 * Replace placeholders in template with actual values
 * @param template - Template string with {{PLACEHOLDER}} markers
 * @param vars - Object with placeholder values
 * @returns Processed template string
 */
function processTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let processed = template;
  for (const [key, value] of Object.entries(vars)) {
    const placeholder = `{{${key}}}`;
    processed = processed.replaceAll(placeholder, value);
  }
  return processed;
}

export interface LoginLinkEmailParams {
  email: string;
  loginUrl: string;
  loginCode: string;
}

/**
 * Generate login link email HTML
 */
export function generateLoginLinkEmail(params: LoginLinkEmailParams): string {
  const expiryTime = expiryToHuman(AUTH_CONFIG.EMAIL_LOGIN_LINK_EXPIRY);

  return processTemplate(loginLinkTemplate, {
    LOGIN_URL: params.loginUrl,
    LOGIN_CODE: params.loginCode,
    EXPIRY_TIME: expiryTime
  });
}

export interface PasswordResetEmailParams {
  resetUrl: string;
}

/**
 * Generate password reset email HTML
 */
export function generatePasswordResetEmail(
  params: PasswordResetEmailParams
): string {
  const expiryTime = "1 hour"; // Password reset is hardcoded to 1 hour

  return processTemplate(passwordResetTemplate, {
    RESET_URL: params.resetUrl,
    EXPIRY_TIME: expiryTime
  });
}

export interface EmailVerificationParams {
  verificationUrl: string;
}

/**
 * Generate email verification email HTML
 */
export function generateEmailVerificationEmail(
  params: EmailVerificationParams
): string {
  const expiryTime = expiryToHuman(AUTH_CONFIG.EMAIL_VERIFICATION_LINK_EXPIRY);

  return processTemplate(emailVerificationTemplate, {
    VERIFICATION_URL: params.verificationUrl,
    EXPIRY_TIME: expiryTime
  });
}
