/**
 * Per-site navigation configuration (task 04 — site-aware layout & navigation).
 *
 * Pure module — imports NOTHING from solid-js / @solidjs/router / @solidjs/meta —
 * so it can be unit-tested in `bun:test` without spinning up the router / Meta
 * provider, mirroring the pattern established by `page-head-meta.ts`.
 *
 * Selection contract:
 *  - `href` values are the **public browser paths** on the subdomain origin
 *    (e.g. `/contact`), NOT the internal rewritten prefixes. vercel.json maps
 *    `nessa.freno.me/contact` → `/nessa/contact` server-side, but the browser
 *    sees (and links must emit) the clean `/contact`. This matches the
 *    canonical-URL derivation rule documented in `page-head-meta.ts`.
 *  - `external: true` means an absolute URL (e.g. GitHub / LinkedIn).
 *  - `showLoggedIn` / `showLoggedOut` gate auth-scoped items. Subdomain sites
 *    do NOT use the web (freno.me) JWT cookies — Nessa uses Clerk, Lineage
 *    uses its mobile JWT — so subdomain nav items never set these, keeping
 *    the "auth-aware items only on main" acceptance criterion satisfied by
 *    construction.
 *  - `icon` is a string key resolved to an SVG by the bar renderer
 *    (`Bars.tsx`), kept here as a string so this module stays import-free.
 *
 * The main-site nav is also represented here for parity / unit-testability,
 * but `Bars.tsx` preserves the main site's pre-existing bespoke rendering
 * (Recent Posts, auth-aware Account/Login/SignOut, admin Analytics, the
 * "What's this?" glitch button, + the right-bar widgets). NAV_CONFIG[main] is
 * authoritative only for the *link set* the unit tests assert against.
 */
import type { SiteId } from "~/lib/site-context";

/** Icon keys resolved by the bar renderer to inline SVGs. */
export type NavIcon =
  | "home"
  | "blog"
  | "downloads"
  | "resume"
  | "contact"
  | "privacy"
  | "deletion"
  | "github"
  | "linkedin"
  | "back";

export interface NavItem {
  label: string;
  /** Public browser path (subdomain-relative) or absolute URL when external. */
  href: string;
  icon?: NavIcon;
  /** Absolute external link (opens in a new tab). */
  external?: boolean;
  /** Only render when the viewer is authenticated (main-site web auth). */
  showLoggedIn?: boolean;
  /** Only render when the viewer is logged out (main-site web auth). */
  showLoggedOut?: boolean;
}

/** Apex/host link used as a "back to freno.me" affordance on subdomains. */
export const BACK_TO_FRENO: NavItem = {
  label: "back to freno.me",
  href: "https://freno.me",
  icon: "back",
  external: true
};

/**
 * Per-site navigation link sets.
 *
 * Defined to exactly satisfy the task-04 acceptance matrix:
 *  - main: Home, Blog, Downloads, Resume, Contact, GitHub, LinkedIn
 *  - nessa: Home, Contact, Privacy
 *  - lineage: Home, Downloads, Contact, Privacy, Account Deletion
 *  - gaze: Home, Contact, Privacy, Downloads
 *  - inputhalo: Home, Contact, Privacy, Downloads
 */
export const NAV_CONFIG: Record<SiteId, NavItem[]> = {
  main: [
    { label: "Home", href: "/", icon: "home" },
    { label: "Blog", href: "/blog", icon: "blog" },
    { label: "Downloads", href: "/downloads", icon: "downloads" },
    { label: "Resume", href: "/resume", icon: "resume" },
    { label: "Contact", href: "/contact", icon: "contact" },
    {
      label: "GitHub",
      href: "https://github.com/MikeFreno/",
      icon: "github",
      external: true
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/michael-freno-176001256/",
      icon: "linkedin",
      external: true
    }
  ],
  nessa: [
    { label: "Home", href: "/", icon: "home" },
    { label: "Contact", href: "/contact", icon: "contact" },
    { label: "Privacy", href: "/privacy", icon: "privacy" }
  ],
  lineage: [
    { label: "Home", href: "/", icon: "home" },
    { label: "Downloads", href: "/downloads", icon: "downloads" },
    { label: "Contact", href: "/contact", icon: "contact" },
    { label: "Privacy", href: "/privacy", icon: "privacy" },
    { label: "Account Deletion", href: "/deletion", icon: "deletion" }
  ],
  gaze: [
    { label: "Home", href: "/", icon: "home" },
    { label: "Contact", href: "/contact", icon: "contact" },
    { label: "Privacy", href: "/privacy", icon: "privacy" },
    { label: "Downloads", href: "/downloads", icon: "downloads" }
  ],
  inputhalo: [
    { label: "Home", href: "/", icon: "home" },
    { label: "Contact", href: "/contact", icon: "contact" },
    { label: "Privacy", href: "/privacy", icon: "privacy" },
    { label: "Downloads", href: "/downloads", icon: "downloads" }
  ]
};

/**
 * Filter a site's nav items by the viewer's auth state.
 *
 * Used by the renderer so auth-gated items (e.g. an admin link) only appear
 * for the appropriate audience. Items without `showLoggedIn`/`showLoggedOut`
 * are always shown.
 */
export function filterNavByAuth(
  items: readonly NavItem[],
  isAuthenticated: boolean
): NavItem[] {
  return items.filter((item) => {
    if (item.showLoggedIn && !isAuthenticated) return false;
    if (item.showLoggedOut && isAuthenticated) return false;
    return true;
  });
}

/**
 * Labels for a site's nav — convenience for asserting against in unit tests
 * without pulling the full NavItem shape.
 */
export function navLabelsFor(site: SiteId): string[] {
  return NAV_CONFIG[site].map((item) => item.label);
}
