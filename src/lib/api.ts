import { createTRPCProxyClient, httpBatchLink, loggerLink } from "@trpc/client";
import type { AppRouter } from "~/server/api/root";

const getBaseUrl = () => {
  // Browser: use relative URL
  if (typeof window !== "undefined") return "";

  const domain = import.meta.env.VITE_DOMAIN;
  if (domain) return domain;

  return `http://localhost:${process.env.PORT ?? 3000}`;
};

/**
 * Get CSRF token from cookies
 */
function getCSRFToken(): string | undefined {
  if (typeof document === "undefined") return undefined;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; csrf-token=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift();
  }
  return undefined;
}

export const api = createTRPCProxyClient<AppRouter>({
  links: [
    // Only enable logging in development mode
    ...(process.env.NODE_ENV === "development"
      ? [
          loggerLink({
            enabled: (opts) => {
              // Suppress 401 UNAUTHORIZED errors from logs
              const is401 =
                opts.direction === "down" &&
                opts.result instanceof Error &&
                opts.result.message?.includes("UNAUTHORIZED");
              return !is401;
            }
          })
        ]
      : []),
    // identifies what url will handle trpc requests
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      headers: () => {
        const csrfToken = getCSRFToken();
        return csrfToken ? { "x-csrf-token": csrfToken } : {};
      }
    })
  ]
});
