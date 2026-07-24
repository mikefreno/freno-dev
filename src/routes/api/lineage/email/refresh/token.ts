import type { APIEvent } from "@solidjs/start/server";
import { rest, bearerToken } from "../../_lib";

export const GET = (event: APIEvent) => rest(async (caller) => {
  const token = bearerToken(event);
  return caller.lineage.auth.refreshToken({ token: token ?? "" });
}, event);
