import { Switch, Match } from "solid-js";
import { useSite } from "~/context/SiteContext";
import NotFound from "./[...404]";
import NookFaqPage from "./nook/faq";

/**
 * Host-aware FAQ route — `/faq`.
 *
 * The FAQ is a Nook-subdomain surface; all other sites fall back to 404.
 * Mirrors the dispatch pattern in `src/routes/index.tsx` and
 * `src/routes/checkout.tsx` — production does not apply the vercel.json
 * host rewrites (SSR sees `/faq`, never `/nook/faq`).
 */
export default function FaqPage() {
  const site = useSite();
  return (
    <Switch fallback={<NotFound />}>
      <Match when={site().id === "nook"}>
        <NookFaqPage />
      </Match>
    </Switch>
  );
}
