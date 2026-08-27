import { Switch, Match } from "solid-js";
import { useSite } from "~/context/SiteContext";
import NotFound from "./[...404]";
import NookSuccess from "./nook/success";

/**
 * Host-aware success route — `/success`.
 *
 * Only The Nook has a post-checkout success page; all other sites fall
 * back to 404. Mirrors the dispatch pattern in `src/routes/index.tsx`.
 */
export default function SuccessPage() {
  const site = useSite();
  return (
    <Switch fallback={<NotFound />}>
      <Match when={site().id === "nook"}>
        <NookSuccess />
      </Match>
    </Switch>
  );
}
