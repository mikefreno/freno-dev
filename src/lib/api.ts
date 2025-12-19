import { createTRPCProxyClient, httpBatchLink, loggerLink } from "@trpc/client";
import type { AppRouter } from "~/server/api/root";

const getBaseUrl = () => {
  // Browser: use relative URL
  if (typeof window !== "undefined") return "";

  //const domain = import.meta.env.VITE_DOMAIN;
  const domain = "https://freno.dev"; // try to hardcode it for now
  if (domain) return domain;

  return `http://localhost:${process.env.PORT ?? 3000}`;
};

// Custom fetch that suppresses 401 console errors
const customFetch: typeof fetch = async (input, init?) => {
  try {
    const response = await fetch(input, init);
    // Suppress logging for 401 errors by cloning and not throwing
    if (response.status === 401) {
      // Return the response without logging to console
      return response;
    }
    return response;
  } catch (error) {
    // Only re-throw non-401 errors
    throw error;
  }
};

export const api = createTRPCProxyClient<AppRouter>({
  links: [
    // will print out helpful logs when using client (suppress 401 errors)
    loggerLink({
      enabled: (opts) => {
        // Only log in development, and suppress 401 errors
        const isDev = process.env.NODE_ENV === "development";
        const is401 =
          opts.direction === "down" &&
          opts.result instanceof Error &&
          opts.result.message?.includes("UNAUTHORIZED");
        return isDev && !is401;
      }
    }),
    // identifies what url will handle trpc requests
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      fetch: customFetch
    })
  ]
});
