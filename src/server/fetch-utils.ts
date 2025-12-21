// Error types for better error classification
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeoutMs: number
  ) {
    super(message);
    this.name = "TimeoutError";
  }
}

export class APIError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string
  ) {
    super(message);
    this.name = "APIError";
  }
}

interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
}

/**
 * Fetch wrapper with timeout support and proper error classification
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    // Classify the error for better handling
    if (error instanceof Error) {
      // Check for abort/timeout
      if (error.name === "AbortError") {
        throw new TimeoutError(
          `Request to ${url} timed out after ${timeout}ms`,
          timeout
        );
      }

      // Check for connection errors (various runtime-specific errors)
      if (
        error.message.includes("fetch failed") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("ENOTFOUND") ||
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("UND_ERR_CONNECT_TIMEOUT") ||
        error.name === "FailedToOpenSocket" ||
        error.message.includes("Was there a typo")
      ) {
        throw new NetworkError(
          `Failed to connect to ${url}: ${error.message}`,
          error
        );
      }
    }

    // Re-throw unknown errors
    throw error;
  }
}

/**
 * Helper to check response status and throw APIError if not ok
 */
export async function checkResponse(response: Response): Promise<Response> {
  if (!response.ok) {
    throw new APIError(
      `API request failed: ${response.statusText}`,
      response.status,
      response.statusText
    );
  }
  return response;
}

/**
 * Safe JSON parse that handles errors gracefully
 */
export async function safeJsonParse<T>(response: Response): Promise<T | null> {
  try {
    return await response.json();
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    return null;
  }
}

/**
 * Retry logic with exponential backoff
 */
export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    retryableErrors?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 2,
    retryDelay = 1000,
    retryableErrors = (error) =>
      error instanceof TimeoutError || error instanceof NetworkError
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if it's the last attempt or error is not retryable
      if (attempt === maxRetries || !retryableErrors(error)) {
        throw error;
      }

      // Exponential backoff
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
