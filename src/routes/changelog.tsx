import { Switch, Match } from "solid-js";
import { useSite } from "~/context/SiteContext";
import NotFound from "./[...404]";
import NookChangelogPage from "./nook/changelog";

/**
 * Host-aware changelog route — `/changelog`.
 *
 * The release-notes page is a Nook-subdomain surface; all other sites fall
 * back to 404. Mirrors the dispatch pattern in `src/routes/index.tsx` and
 * `src/routes/checkout.tsx` — production does not apply the vercel.json
 * host rewrites (SSR sees `/changelog`, never `/nook/changelog`).
 */
export default function ChangelogPage() {
  const site = useSite();
  return (
    <Switch fallback={<NotFound />}>
      <Match when={site().id === "nook"}>
        <NookChangelogPage />
      </Match>
    </Switch>
  );
}
