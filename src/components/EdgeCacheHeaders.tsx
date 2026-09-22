import { HttpHeader } from "@solidjs/start";

/**
 * Renders edge-cache response headers for a page route.
 *
 * Sets `CDN-Cache-Control` so Vercel serves the rendered HTML from the edge
 * (no origin re-render) for `maxAge` seconds, then stale-while-revalidate up
 * to `staleSeconds`. `Cache-Control: public, max-age=0` keeps browsers
 * revalidating, so visitors always get the latest version — only the CDN
 * holds a cached copy. Function/CND-Cache-Control overrides the Vercel
 * default, so repeated visits and bot crawls stop re-rendering at origin.
 */
export function EdgeCacheHeaders(props: {
 /** Seconds the CDN may serve the response fresh. */
 maxAge: number;
 /** Seconds the CDN serves stale while revalidating (default: 1 day). */
 staleSeconds?: number;
}) {
 const stale = props.staleSeconds ?? 86400;
 return (
  <>
   <HttpHeader name="Cache-Control" value="public, max-age=0" />
   <HttpHeader
    name="CDN-Cache-Control"
    value={`public, s-maxage=${props.maxAge}, stale-while-revalidate=${stale}`}
   />
  </>
 );
}
