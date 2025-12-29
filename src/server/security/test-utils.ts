/**
 * Security Test Utilities
 * Shared helpers for security-related tests
 */

import type { H3Event } from "vinxi/http";
import { SignJWT } from "jose";
import { env } from "~/env/server";

/**
 * Create a mock H3Event for testing
 * Creates a minimal structure that works with our cookie/header fallback logic
 */
export function createMockEvent(options: {
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  method?: string;
  url?: string;
}): H3Event {
  const {
    headers = {},
    cookies = {},
    method = "POST",
    url = "http://localhost:3000/"
  } = options;

  const cookieString = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

  const allHeaders = {
    ...headers,
    ...(cookieString ? { cookie: cookieString } : {})
  };

  // Try to create Headers object, fall back to plain object if headers contain invalid values
  let headersObj: Headers | Record<string, string>;
  try {
    headersObj = new Headers(allHeaders);
  } catch (e) {
    // If Headers constructor fails (e.g., unicode in headers), use plain object
    headersObj = allHeaders;
  }

  // Create mock event with headers accessible via .headers.get() and .node.req.headers
  const mockEvent = {
    headers: headersObj,
    node: {
      req: {
        headers: allHeaders
      },
      res: {
        cookies: {}
      }
    }
  } as unknown as H3Event;

  return mockEvent;
}

/**
 * Generate a valid JWT token for testing
 */
export async function createTestJWT(
  userId: string,
  expiresIn: string = "1h"
): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
  return await new SignJWT({ id: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .sign(secret);
}

/**
 * Generate an expired JWT token for testing
 */
export async function createExpiredJWT(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
  return await new SignJWT({ id: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("-1h") // Expired 1 hour ago
    .sign(secret);
}

/**
 * Generate a JWT with invalid signature
 */
export async function createInvalidSignatureJWT(
  userId: string
): Promise<string> {
  const wrongSecret = new TextEncoder().encode("wrong-secret-key");
  return await new SignJWT({ id: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(wrongSecret);
}

/**
 * Generate test credentials
 */
export function createTestCredentials() {
  return {
    email: `test-${Date.now()}@example.com`,
    password: "TestPass123!@#",
    passwordConfirmation: "TestPass123!@#"
  };
}

/**
 * Common SQL injection payloads
 */
export const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE User; --",
  "admin'--",
  "' UNION SELECT * FROM User--",
  "1' OR 1=1--",
  "' OR 'x'='x",
  "1; DELETE FROM User WHERE 1=1--",
  "' AND 1=0 UNION ALL SELECT * FROM User--"
];

/**
 * Common XSS payloads
 */
export const XSS_PAYLOADS = [
  "<script>alert('XSS')</script>",
  "<img src=x onerror=alert('XSS')>",
  "javascript:alert('XSS')",
  "<svg onload=alert('XSS')>",
  "<iframe src='javascript:alert(\"XSS\")'></iframe>",
  "<body onload=alert('XSS')>",
  "<input onfocus=alert('XSS') autofocus>"
];

/**
 * Wait for async operations with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Measure execution time
 */
export async function measureTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

/**
 * Generate random string for testing
 */
export function randomString(length: number = 10): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

/**
 * Generate random IP address
 */
export function randomIP(): string {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(
    "."
  );
}
