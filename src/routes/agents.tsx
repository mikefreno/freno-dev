import { Switch, Match } from "solid-js";
import { useSite } from "~/context/SiteContext";
import NotFound from "./[...404]";
import NookAgentsPage from "./nook/agents";

/**
 * Host-aware agents route — `/agents`.
 *
 * The supported-agents page is a Nook-subdomain surface; all other sites
 * fall back to 404. Mirrors the dispatch pattern in `src/routes/index.tsx`
 * and `src/routes/checkout.tsx` — and like them, this is what makes the
 * page render at all: production does not apply the vercel.json host
 * rewrites (SSR sees `/agents`, never `/nook/agents`).
 */
export default function AgentsPage() {
  const site = useSite();
  return (
    <Switch fallback={<NotFound />}>
      <Match when={site().id === "nook"}>
        <NookAgentsPage />
      </Match>
    </Switch>
  );
}
