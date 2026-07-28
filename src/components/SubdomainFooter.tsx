import { A } from "@solidjs/router";
import { buildMainSiteUrl } from "~/lib/site-context";

export default function SubdomainFooter() {
  return (
    <footer class="border-surface0 bg-surface0 relative z-10 border-t py-8">
      <div class="relative flex items-center text-sm">
        <A
          href={buildMainSiteUrl()}
          class="text-text/60 hover:text-text/80 mx-auto text-center underline underline-offset-4 transition-colors"
        >
          made with <span class="text-red-400">&lt;3</span>
        </A>
        <A
          href={buildMainSiteUrl("/downloads")}
          class="text-text/80 hover:text-text absolute right-4 underline underline-offset-4 transition-colors"
        >
          see more products
        </A>
      </div>
    </footer>
  );
}
