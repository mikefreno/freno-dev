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
  resolveSiteFromPath,
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
        nativeEvent?: {
          node?: { req?: { headers?: Record<string, string | string[]> } };
        };
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
 * Best-effort extraction of the URL pathname from any request-shaped event.
 *
 * SolidStart's FetchEvent exposes `event.request.url` (a full URL string);
 * nitro/H3 exposes the raw Node request URL via `event.nativeEvent.node.req.url`.
 * We try both so this works for API route handlers, the SSR document handler,
 * and tRPC procedures operating on the underlying `H3Event`.
 */
function pathFromEventLike(event: ServerSiteEvent | unknown): string | null {
  // 1) Web FetchEvent / APIEvent / PageEvent → standard Request URL.
  try {
    const req = (event as { request?: Request } | null)?.request;
    const url = req?.url;
    if (url) return new URL(url).pathname;
  } catch {
    /* noop */
  }

  // 2) vinxi/nitro H3Event → raw Node request URL.
  try {
    const nodeReq = (
      event as {
        nativeEvent?: { node?: { req?: { url?: string } } };
      } | null
    )?.nativeEvent?.node?.req;
    const raw = nodeReq?.url;
    if (typeof raw === "string" && raw) {
      // Node request URLs may be path-only (`/nessa/contact`) or full URLs.
      return raw.startsWith("/") ? raw : new URL(raw).pathname;
    }
  } catch {
    /* noop */
  }

  // 3) Some H3 shapes expose `event.node.req` directly.
  try {
    const nodeReq = (
      event as {
        node?: { req?: { url?: string } };
      } | null
    )?.node?.req;
    const raw = nodeReq?.url;
    if (typeof raw === "string" && raw) {
      return raw.startsWith("/") ? raw : new URL(raw).pathname;
    }
  } catch {
    /* noop */
  }

  return null;
}

/**
 * Resolve the active `Site` from a SolidStart APIEvent / PageEvent or a
 * vinxi/nitro H3Event. Accepts the structural {@link ServerSiteEvent} shape,
 * so the SSR document handler can pass its `PageEvent` directly. Falls back
 * to `main` if no host or path can be determined.
 */
export function getSiteFromEvent(
  event: APIEvent | H3Event | ServerSiteEvent
): Site {
  const hostResult = resolveSiteFromHost(hostFromEventLike(event));
  // Subdomain host (incl. `*.localhost` dev) → authoritative, use it.
  if (hostResult.id !== "main") return hostResult;

  // Host resolved to main — fall back to the URL path prefix. On localhost
  // the vercel.json host rewrites don't run, so `localhost:3000/nessa/contact`
  // has host `localhost` (→ main) but path `/nessa/contact` (→ nessa).
  // Without this, every subdomain page in dev renders the main-site nav.
  return resolveSiteFromPath(pathFromEventLike(event)) ?? hostResult;
}

/**
 * Resolve the active `Site` from a standard `Request` (e.g. inside server
 * functions that receive a `Request` directly). Falls back to `main`.
 */
export function getSiteFromRequest(request: Request): Site {
  const hostResult = resolveSiteFromHost(request.headers.get("host"));
  if (hostResult.id !== "main") return hostResult;
  return resolveSiteFromPath(new URL(request.url).pathname) ?? hostResult;
}

export { MAIN_SITE };
