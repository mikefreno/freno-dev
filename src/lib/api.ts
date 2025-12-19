import { createTRPCProxyClient, httpBatchLink, loggerLink } from "@trpc/client";
import { env } from "~/env/server";
import { AppRouter } from "~/server/api/root";

export const api = createTRPCProxyClient<AppRouter>({
  links: [
    // will print out helpful logs when using client
    loggerLink(),
    // identifies what url will handle trpc requests
    httpBatchLink({ url: `${env.VITE_DOMAIN}/api/trpc` })
  ]
});
