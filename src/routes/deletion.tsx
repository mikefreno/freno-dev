import { Switch, Match } from "solid-js";
import { useSite } from "~/context/SiteContext";
import NotFound from "./[...404]";
import NessaDeletionPage from "./nessa/deletion";
import LineageDeletionPage from "./lineage/deletion";

/**
 * Host-aware account-deletion route — `/deletion`.
 *
 * The public browser path `/deletion` serves each subdomain's per-product
 * account-deletion flow. This mirrors `src/routes/index.tsx`'s host-aware
 * dispatch: the server and client both resolve the public path (`/deletion`)
 * and select the matching subdomain component via `useSite()`, so the two
 * render the same component for the same path and hydration matches. This
 * replaces the previous server-only path rewrite (`/deletion` →
 * `/<prefix>/deletion`), which diverged the SSR path from the browser URL and
 * caused hydration mismatches (SolidStart's client `Router` matches on
 * `window.location.pathname`, not the rewritten server path).
 *
 * Only Nessa and Lineage ship a dedicated deletion page. Gaze, InputHalo, and
 * the main site fall back to the 404 handler — preserving their pre-rewrite
 * behavior (Gaze/InputHalo have no account system; the main site never had a
 * `/deletion` route).
 *
 * Legacy `/deletion/life-and-lineage` 308-redirects to the Lineage subdomain's
 * `https://lineage.freno.me/deletion` (see
 * `src/routes/lineage/deletion-content.ts` → `LEGACY_DELETION_REDIRECT_TARGET`).
 */
export default function DeletionPage() {
  const site = useSite();
  return (
    <Switch fallback={<NotFound />}>
      <Match when={site().id === "nessa"}>
        <NessaDeletionPage />
      </Match>
      <Match when={site().id === "lineage"}>
        <LineageDeletionPage />
      </Match>
    </Switch>
  );
}
