import { A } from "@solidjs/router";
import { buildMainSiteUrl } from "~/lib/site-context";

export default function SubdomainFooter() {
  return (
    <footer class="border-surface0 bg-surface0 relative z-10 border-t py-8">
      <div class="relative flex flex-col items-center gap-2 text-sm sm:flex-row sm:justify-center">
        <A
          href={buildMainSiteUrl()}
          class="text-text/60 hover:text-text/80 text-center underline underline-offset-4 transition-colors"
        >
          made with <span class="text-red-400">&lt;3</span>
        </A>
        <A
          href={buildMainSiteUrl("/downloads")}
          class="text-text/80 hover:text-text underline underline-offset-4 transition-colors sm:absolute sm:right-4"
        >
          see more products
        </A>
      </div>
    </footer>
  );
}
