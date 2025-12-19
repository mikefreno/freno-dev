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
      url: `${getBaseUrl()}/api/trpc`
    })
  ]
});
