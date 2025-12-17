import type { APIEvent } from "@solidjs/start/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/utils";

const handler = (event: APIEvent) => {
  // adapts tRPC to fetch API style requests
  return fetchRequestHandler({
    // the endpoint handling the requests
    endpoint: "/api/trpc",
    // the request object
    req: event.request,
    // the router for handling the requests
    router: appRouter,
    // any arbitrary data that should be available to all actions
    createContext: () => createTRPCContext(event),
  });
};

export const GET = handler;
export const POST = handler;
