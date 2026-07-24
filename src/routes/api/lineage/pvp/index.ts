import type { APIEvent } from "@solidjs/start/server";
import { rest } from "../_lib";

// GET /api/lineage/pvp — retrieve opponents
export const GET = (event: APIEvent) => rest(async (caller) => {
  return caller.lineage.pvp.getOpponents();
}, event);

// POST /api/lineage/pvp — register/update player character
export const POST = (event: APIEvent) => rest(async (caller) => {
  const input = await event.request.json();
  return caller.lineage.pvp.registerCharacter(input);
}, event);
