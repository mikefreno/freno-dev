import { Switch, Match } from "solid-js";
import { useSite } from "~/context/SiteContext";
import NotFound from "./[...404]";
import NessaPrivacyPolicy from "./nessa/privacy";
import LineagePrivacyPolicy from "./lineage/privacy";
import GazePrivacyPolicy from "./gaze/privacy";
import InputHaloPrivacyPolicy from "./inputhalo/privacy";

/**
 * Host-aware privacy policy route — `/privacy`.
 *
 * The public browser path `/privacy` serves each subdomain's own privacy
 * policy. This mirrors `src/routes/index.tsx`'s host-aware dispatch: the
 * server and client both resolve the public path (`/privacy`) and select the
 * matching subdomain component via `useSite()`, so the two render the same
 * component for the same path and hydration matches. This replaces the
 * previous server-only path rewrite (`/privacy` → `/<prefix>/privacy`), which
 * diverged the SSR path from the browser URL and caused hydration mismatches
 * (SolidStart's client `Router` matches on `window.location.pathname`, not the
 * rewritten server path).
 *
 * The main site has no `/privacy` page (it uses `/privacy-policy/*`), so
 * `main` falls back to the 404 handler — preserving its pre-rewrite behavior.
 *
 * Legacy `/privacy-policy/<product>` routes 308-redirect to the corresponding
 * subdomain `/privacy` (see `src/routes/privacy-policy/*.tsx`).
 */
export default function PrivacyPage() {
  const site = useSite();
  return (
    <Switch fallback={<NotFound />}>
      <Match when={site().id === "nessa"}>
        <NessaPrivacyPolicy />
      </Match>
      <Match when={site().id === "lineage"}>
        <LineagePrivacyPolicy />
      </Match>
      <Match when={site().id === "gaze"}>
        <GazePrivacyPolicy />
      </Match>
      <Match when={site().id === "inputhalo"}>
        <InputHaloPrivacyPolicy />
      </Match>
    </Switch>
  );
}
