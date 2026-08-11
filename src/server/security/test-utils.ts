/**
 * Security Test Utilities
 * Shared helpers for security-related tests
 */

import type { H3Event } from "vinxi/http";

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

  // Build the cookie header string from the cookies object only
  const cookieString = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

  // Build request headers: spread individual headers, then add the cookie header
  // This keeps headers and cookies separate — headers stay as headers,
  // cookies are serialized into the Cookie header only.
  const allHeaders: Record<string, string> = {
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
 * Generate random IP address
 */
export function randomIP(): string {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(
    "."
  );
}
