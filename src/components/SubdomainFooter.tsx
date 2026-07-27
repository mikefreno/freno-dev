/**
 * Minimal footer for product subdomains — "made with <3 by Mike Freno"
 * linking back to the root domain.
 *
 * Placed in the shared subdomain layout (app.tsx) so every subdomain page
 * gets it automatically. Uses `buildMainSiteUrl()` so the cross-domain link
 * resolves correctly in both dev (path-based localhost) and prod (host-based
 * freno.me).
 */
import { A } from "@solidjs/router";
import { buildMainSiteUrl } from "~/lib/site-context";

export default function SubdomainFooter() {
  return (
    <footer class="border-surface0 border-t py-8">
      <div class="flex items-center justify-between text-sm">
        <span class="text-text/60">
          made with <span class="text-red-400">&lt;3</span> by{" "}
          <A
            href={buildMainSiteUrl()}
            class="text-text/80 hover:text-text underline underline-offset-4 transition-colors"
          >
            Mike Freno
          </A>
        </span>
        <A
          href={buildMainSiteUrl("/downloads")}
          class="text-text/80 hover:text-text underline underline-offset-4 transition-colors"
        >
          see more products
        </A>
      </div>
    </footer>
  );
}
