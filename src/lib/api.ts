import { createTRPCProxyClient, httpBatchLink, loggerLink } from "@trpc/client";
import { AppRouter } from "~/server/api/root";

export const api = createTRPCProxyClient<AppRouter>({
  links: [
    // will print out helpful logs when using client
    loggerLink(),
    // identifies what url will handle trpc requests
    httpBatchLink({ url: `${import.meta.env.VITE_DOMAIN}/api/trpc` })
  ]
});
