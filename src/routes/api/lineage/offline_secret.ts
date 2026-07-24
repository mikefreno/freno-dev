// Plain-text route for the Lineage offline secret.
//
// `misc.offlineSecret` is a tRPC `.query()` returning `{ secret: "…" }`. But
// the Lineage client's `IAPStore.fetchOfflineSecret` does
// `await response.text()` and uses the raw string directly as the decryption
// key. trpc-openapi always JSON-encodes responses, so exposing it via the openapi
// shim would yield `'{"secret":"…"}'` as text and break decryption.
//
// This dedicated route returns the secret verbatim as `text/plain`, matching
// exactly what the legacy endpoint returned. Auth: none (the legacy endpoint
// had none either — the secret is a server-side decryption key shared to all
// clients; it rotates with `LINEAGE_OFFLINE_SERIALIZATION_SECRET`).

import type { APIEvent } from "@solidjs/start/server";
import { env } from "~/env/server";

export const GET = (event: APIEvent) => {
  return new Response(env.LINEAGE_OFFLINE_SERIALIZATION_SECRET, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
};
