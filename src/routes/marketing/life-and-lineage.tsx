/**
 * Legacy Life and Lineage marketing route — now a 308 permanent redirect to
 * the Lineage subdomain (task 08).
 *
 * The marketing content has been migrated to `src/routes/lineage/index.tsx`
 * served at `lineage.freno.me` (vercel.json host rewrites map the subdomain to
 * the `/lineage/*` internal prefix). Keeping this route as a permanent (308)
 * server-side redirect — rather than a client `<Navigate>` — preserves SEO
 * equity and gives installed / linked URLs a stable resolution path.
 *
 * Implemented as a SolidStart API route (`GET` handler returning a Response)
 * so the redirect happens before any rendering; the route no longer ships a
 * page component. The redirect target is centralized in
 * `~/routes/lineage/landing-content.ts` (`LEGACY_REDIRECT_TARGET`) so the
 * unit test can assert the destination without importing this server module.
 */
import { LEGACY_REDIRECT_TARGET } from "~/routes/lineage/landing-content";

export function GET() {
  return new Response(null, {
    status: 308,
    headers: {
      Location: LEGACY_REDIRECT_TARGET,
      "Cache-Control": "public, max-age=0, must-revalidate"
    }
  });
}
