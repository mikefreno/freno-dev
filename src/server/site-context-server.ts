// ───────────────────────────────────────────────────────────────────────
// Server-side site-context extraction.
//
// Reads the request `Host` header from a SolidStart FetchEvent (APIEvent /
// PageEvent) or a raw vinxi/nitro H3Event and resolves the active `Site`
// via the shared pure resolver in `~/lib/site-context`.
//
// Importing this module is only valid server-side. It relies on
// `event.request` and `event.nativeEvent.node.req` which do not exist in
// the browser.
// ───────────────────────────────────────────────────────────────────────

import type { APIEvent } from "@solidjs/start/server";
import type { H3Event } from "vinxi/http";
import {
  resolveSiteFromHost,
  type Site,
  MAIN_SITE
} from "~/lib/site-context";

/**
 * Structural shape accepted by {@link getSiteFromEvent}. Compatible with
 * SolidStart `APIEvent` / `PageEvent` and vinxi/nitro `H3Event`. We keep it
 * structural (rather than a union of those named types) so the SSR document
 * handler can pass its `PageEvent` without a TS widening error.
 */
export interface ServerSiteEvent {
  request?: Request;
  nativeEvent?: unknown;
  node?: unknown;
}

/**
 * Best-effort extraction of the `Host` header from any request-shaped event.
 *
 * SolidStart's FetchEvent exposes `event.request.headers`; nitro/H3 exposes
 * the raw Node request via `event.nativeEvent.node.req.headers`. We try
 * both so this works for API route handlers (`APIEvent`), the SSR document
 * handler (`PageEvent`), and tRPC procedures operating on the underlying
 * `H3Event`.
 */
function hostFromEventLike(event: ServerSiteEvent | unknown): string | null {
  // 1) Web FetchEvent / APIEvent / PageEvent → standard `Request` headers.
  try {
    const req = (event as { request?: Request } | null)?.request;
    const h = req?.headers?.get?.("host");
    if (h) return h;
  } catch {
    /* noop */
  }

  // 2) vinxi/nitro H3Event → raw Node request.
  try {
    const nodeReq = (
      event as {
        nativeEvent?: { node?: { req?: { headers?: Record<string, string | string[]> } } };
      } | null
    )?.nativeEvent?.node?.req;
    const raw = nodeReq?.headers?.host;
    if (typeof raw === "string" && raw) return raw;
  } catch {
    /* noop */
  }

  // 3) Some H3 shapes expose `event.node.req` directly.
  try {
    const nodeReq = (
      event as {
        node?: { req?: { headers?: Record<string, string | string[]> } };
      } | null
    )?.node?.req;
    const raw = nodeReq?.headers?.host;
    if (typeof raw === "string" && raw) return raw;
  } catch {
    /* noop */
  }

  return null;
}

/**
 * Resolve the active `Site` from a SolidStart APIEvent / PageEvent or a
 * vinxi/nitro H3Event. Accepts the structural {@link ServerSiteEvent} shape,
 * so the SSR document handler can pass its `PageEvent` directly. Falls back
 * to `main` if no host can be determined.
 */
export function getSiteFromEvent(
  event: APIEvent | H3Event | ServerSiteEvent
): Site {
  return resolveSiteFromHost(hostFromEventLike(event));
}

/**
 * Resolve the active `Site` from a standard `Request` (e.g. inside server
 * functions that receive a `Request` directly). Falls back to `main`.
 */
export function getSiteFromRequest(request: Request): Site {
  return resolveSiteFromHost(request.headers.get("host"));
}

export { MAIN_SITE };
