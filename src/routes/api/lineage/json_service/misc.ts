import type { APIEvent } from "@solidjs/start/server";
import { rest } from "../_lib";

export const GET = (event: APIEvent) => rest(async (caller) => {
  return caller.lineage.jsonService.misc();
}, event);
