import type { APIEvent } from "@solidjs/start/server";
import { rest } from "../_lib";

// POST /api/lineage/pvp/purchase — server-authoritative Blood Token purchase
export const POST = (event: APIEvent) => rest(async (caller) => {
  const input = await event.request.json();
  return caller.lineage.pvp.purchase(input);
}, event);
