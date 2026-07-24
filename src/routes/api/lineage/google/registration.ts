import type { APIEvent } from "@solidjs/start/server";
import { rest } from "../_lib";

export const POST = (event: APIEvent) => rest(async (caller) => {
  const input = await event.request.json();
  return caller.lineage.auth.googleRegistration(input);
}, event);
