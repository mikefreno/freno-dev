/**
 * Legacy Life and Lineage privacy policy route — now a 308 permanent redirect
 * to the Lineage subdomain (task 10).
 *
 * The privacy policy content has been migrated to
 * `src/routes/lineage/privacy.tsx`, served at `lineage.freno.me/privacy`
 * (vercel.json host rewrites map the Lineage subdomain to the internal
 * `/lineage/*` prefix). Keeping this route as a permanent (308) server-side
 * redirect — rather than a client `<Navigate>` — preserves SEO equity and
 * gives installed / linked URLs a stable resolution path, mirroring how the
 * legacy Life and Lineage marketing page was redirected in task 08.
 *
 * Implemented as a SolidStart API route (`GET` handler returning a Response)
 * so the redirect happens before any rendering; the route no longer ships a
 * page component.
 */
export function GET() {
  return new Response(null, {
    status: 308,
    headers: {
      Location: "https://lineage.freno.me/privacy",
      "Cache-Control": "public, max-age=0, must-revalidate"
    }
  });
}
