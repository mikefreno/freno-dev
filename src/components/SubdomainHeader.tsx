/**
 * Minimal top navigation for product subdomains.
 *
 * Replaces the dual-left/right sidebar used on `freno.me` for each product
 * subdomain (`nessa.*`, `lineage.*`, `gaze.*`, `inputhalo.*`). The header is
 * sticky, site-aware, and derives its links from `NAV_CONFIG` so the nav set
 * remains the single source of truth. `lineage.freno.me/` intentionally does
 * not use this component so the original full-bleed parallax landing page is
 * preserved.
 */
import { For, Show } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import { useSite } from "~/context/SiteContext";
import { useDarkMode } from "~/context/darkMode";
import { NAV_CONFIG } from "~/lib/nav-config";
import { DarkModeToggle } from "~/components/DarkModeToggle";

export default function SubdomainHeader() {
  const site = useSite();
  const location = useLocation();
  const { isDark } = useDarkMode();

  const brandName = () => site().displayName;
  const brandColor = () =>
    isDark() ? (site().brandColorDark ?? site().brandColor) : site().brandColor;
  const navItems = () =>
    NAV_CONFIG[site().id].filter((item) => item.label !== "Home");

  const isActive = (href: string) => {
    const path = location.pathname;
    return href === "/" ? path === "/" : path === href;
  };

  return (
    <header class="bg-base/80 border-surface0 sticky top-0 z-50 w-full border-b backdrop-blur-md">
      <div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <A
          href="/"
          class="text-lg font-bold tracking-tight transition-opacity hover:opacity-80"
          style={{ color: brandColor() }}
        >
          {brandName()}
        </A>

        <nav
          aria-label={`${brandName()} navigation`}
          class="flex items-center gap-4 overflow-x-auto text-sm whitespace-nowrap"
        >
          <For each={navItems()}>
            {(item) => (
              <Show
                when={item.external}
                fallback={
                  <A
                    href={item.href}
                    end
                    class="transition-opacity hover:opacity-80"
                    classList={{
                      "font-semibold": isActive(item.href),
                      "opacity-70": !isActive(item.href)
                    }}
                  >
                    {item.label}
                  </A>
                }
              >
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="opacity-70 transition-opacity hover:opacity-100"
                >
                  {item.label}
                </a>
              </Show>
            )}
          </For>
          <DarkModeToggle shouldScale={false} />
        </nav>
      </div>
    </header>
  );
}
