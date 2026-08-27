import { Switch, Match } from "solid-js";
import { useSite } from "~/context/SiteContext";
import NotFound from "./[...404]";
import NookCheckout from "./nook/checkout";

/**
 * Host-aware checkout route — `/checkout`.
 *
 * Only The Nook has a checkout flow; all other sites fall back to 404.
 * Mirrors the dispatch pattern in `src/routes/index.tsx`.
 */
export default function CheckoutPage() {
  const site = useSite();
  return (
    <Switch fallback={<NotFound />}>
      <Match when={site().id === "nook"}>
        <NookCheckout />
      </Match>
    </Switch>
  );
}
