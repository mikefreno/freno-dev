/**
 * Legacy Gaze privacy policy route — now a 308 permanent redirect to the Gaze
 * subdomain (task 10).
 *
 * The privacy policy content has been migrated to
 * `src/routes/gaze/privacy.tsx`, served at `gaze.freno.me/privacy`
 * (vercel.json host rewrites map the Gaze subdomain to the internal
 * `/gaze/*` prefix). Keeping this route as a permanent (308) server-side
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
      Location: "https://gaze.freno.me/privacy",
      "Cache-Control": "public, max-age=0, must-revalidate"
    }
  });
}
