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
import { NAV_CONFIG, BACK_TO_FRENO } from "~/lib/nav-config";

/** Simple SVG sun icon for dark mode toggle. */
function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="m2 12h2" />
      <path d="m20 12h2" />
      <path d="m4.93 19.07 1.41-1.41" />
      <path d="m17.66 6.34 1.41-1.41" />
    </svg>
  );
}

/** Simple SVG moon icon for dark mode toggle. */
function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      <path d="M9 11a5 5 0 0 0 5.5 5.5" />
    </svg>
  );
}

export default function SubdomainHeader() {
  const site = useSite();
  const location = useLocation();
  const { isDark, toggleDarkMode } = useDarkMode();

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

          <a
            href={BACK_TO_FRENO.href}
            target="_blank"
            rel="noopener noreferrer"
            class="text-text/60 hover:text-text text-xs transition-colors"
          >
            {BACK_TO_FRENO.label}
          </a>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            class="hover:bg-surface0/40 rounded-full p-2 transition-colors"
            aria-label={
              isDark() ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            <Show when={isDark()}>
              <SunIcon />
            </Show>
            <Show when={!isDark()}>
              <MoonIcon />
            </Show>
          </button>
        </nav>
      </div>
    </header>
  );
}
