import { Show, For, type JSX } from "solid-js";
import { PageHead } from "~/components/PageHead";
import { useSite } from "~/context/SiteContext";
import { useDarkMode } from "~/context/darkMode";
import { NESSA_LANDING_META } from "./meta";

/**
 * Nessa landing page (task 07).
 *
 * Net-new branded marketing home for `nessa.freno.me`. Served at the public
 * URL `/` (vercel.json rewrites `nessa.freno.me/*` → the internal `/nessa/*`
 * route prefix — see `src/lib/site-context.ts` + `vercel.json`).
 *
 * Design contract:
 *  - Public — NO freno.me web-auth UI (Nessa authenticates via Clerk; the
 *    subdomain nav in `Bars.tsx` already omits the web-auth widgets).
 *  - Site-aware metadata via `<PageHead>` — title suffix, canonical, and OG
 *    image all derive from `useSite()` (`nessa` site config).
 *  - Themed via `useDarkMode()` + the nessa `brandColor` (#cba6f7) accent.
 *  - Feature copy is derived from the real server-side capabilities in
 *    `nessaCommunityRouter` (clubs, challenges, social feed, events) — not
 *    fabricated. Nessa has no app-store presence or downloadable artifacts
 *    yet, so the CTA is "Coming soon" rather than a fake download link.
 *
 * Acceptance: `nessa.localhost:3000/` renders the landing page with hero,
 * feature highlights, and a CTA; `<html data-site="nessa">` and a `<title>`
 * containing "Nessa" are emitted by task-01 SSR + task-02 PageHead.
 */

/** Inline SVG icon set — kept local to the page (no shared icon key needed). */
function FeatureIcon(props: { name: string }): JSX.Element {
  const common = (viewBox: string, path: JSX.Element) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height={28}
      width={28}
      viewBox={viewBox}
      class="h-full w-full"
      fill="none"
      stroke="currentColor"
      stroke-width={2}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
  switch (props.name) {
    case "clubs":
      return common(
        "0 0 24 24",
        <>
          <circle cx={9} cy={8} r={3} />
          <circle cx={17} cy={10} r={2.5} />
          <path d="M3 21c0-3.314 2.686-6 6-6s6 2.686 6 6" />
          <path d="M15 21c0-2.21 1.343-4 3-4s3 1.79 3 4" />
        </>
      );
    case "challenges":
      return common(
        "0 0 24 24",
        <>
          <path d="M12 2 3 7v6c0 4.97 3.806 8.74 9 9 5.194-.26 9-4.03 9-9V7l-9-5Z" />
          <path d="m9 12 2 2 4-4" />
        </>
      );
    case "social":
      return common(
        "0 0 24 24",
        <>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
        </>
      );
    case "events":
      return common(
        "0 0 24 24",
        <>
          <rect x={3} y={4} width={18} height={18} rx={2} />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </>
      );
    default:
      return <></>;
  }
}

/** A single feature highlight card. */
function FeatureCard(props: {
  icon: string;
  title: string;
  description: string;
}): JSX.Element {
  return (
    <div class="border-surface0 bg-surface0/30 hover:bg-surface0/50 flex flex-col gap-3 rounded-2xl border-2 p-6 transition-colors duration-200">
      <div
        class="flex h-14 w-14 items-center justify-center rounded-xl"
        style={{ color: "var(--brand-color, #cba6f7)" }}
      >
        <FeatureIcon name={props.icon} />
      </div>
      <h3 class="text-xl font-semibold">{props.title}</h3>
      <p class="text-text/80 text-base leading-relaxed">{props.description}</p>
    </div>
  );
}

interface Feature {
  icon: string;
  title: string;
  description: string;
}

/**
 * Feature set derived from `nessaCommunityRouter` procedures:
 *  - clubs.{list,get,create,…}      → "Clubs"
 *  - challenges.{list,get,…}        → "Challenges"
 *  - social.{feed,getPost,likes,…}  → "Social Feed"
 *  - events.{list,create,rsvp,…}   → "Events"
 */
const FEATURES: Feature[] = [
  {
    icon: "clubs",
    title: "Clubs",
    description:
      "Create and join clubs around shared interests. Public or private, with member rosters, rules, and rich profiles that keep your community organized."
  },
  {
    icon: "challenges",
    title: "Challenges",
    description:
      "Run goal-driven challenges with start and end dates, track progress, and celebrate completions. Members stay motivated with live participation."
  },
  {
    icon: "social",
    title: "Social Feed",
    description:
      "Share posts inside your clubs, react with likes, and reply in threaded comments. A social layer that lives right where your community already gathers."
  },
  {
    icon: "events",
    title: "Events",
    description:
      "Organize events and let members RSVP — going, maybe, or not going. Coordinate meetups and activities without leaving the club."
  }
];

export default function NessaLanding() {
  const site = useSite();
  const { isDark } = useDarkMode();

  return (
    <>
      <PageHead {...NESSA_LANDING_META} />

      <main
        class="relative min-h-screen w-full overflow-x-hidden"
        // Drive the per-site brand accent via a CSS custom property so child
        // elements (feature icons, CTA) can reference `var(--brand-color)`
        // without re-reading the site accessor on every render.
        style={{ "--brand-color": site().brandColor }}
      >
        {/*
         * Soft brand-tinted backdrop. Two layered radial gradients give the
         * page depth on both light and dark themes without competing with the
         * content. Fixed so it stays put while the page scrolls.
         */}
        <div
          class="pointer-events-none fixed inset-0 z-0"
          aria-hidden="true"
          style={{
            background: isDark()
              ? `radial-gradient(60% 50% at 50% 0%, ${site().brandColor}22 0%, transparent 70%), radial-gradient(50% 40% at 80% 100%, ${site().brandColor}1a 0%, transparent 70%)`
              : `radial-gradient(60% 50% at 50% 0%, ${site().brandColor}18 0%, transparent 70%), radial-gradient(50% 40% at 80% 100%, ${site().brandColor}12 0%, transparent 70%)`
          }}
        />

        {/* ───────────────────────── Hero ───────────────────────── */}
        <section class="relative z-10 flex flex-col items-center px-4 pb-16 pt-24 text-center md:pt-32">
          {/* Brand mark — a CSS gradient circle standing in for the icon
              until Nessa ships a real icon asset. */}
          <div
            class="mb-8 flex h-24 w-24 items-center justify-center rounded-[1.75rem] text-5xl font-black text-white shadow-lg md:h-28 md:w-28"
            style={{
              background: `linear-gradient(135deg, ${site().brandColor} 0%, var(--color-mauve, #cba6f7) 100%)`
            }}
            aria-hidden="true"
          >
            N
          </div>

          <h1 class="text-5xl font-bold tracking-tight md:text-7xl">Nessa</h1>

          <p class="text-text/85 mt-4 max-w-2xl text-lg md:text-2xl">
            Build community. Run challenges. Stay connected.
          </p>

          <p class="text-text/70 mt-3 max-w-xl text-base md:text-lg">
            A home for your clubs — bring members together with challenges, a
            social feed, and events, all in one place.
          </p>

          {/*
           * CTA — Nessa authenticates via Clerk and runs entirely server-side;
           * there is no public app-store listing or downloadable artifact yet,
           * so this is a "Coming soon" affordance rather than a fabricated
           * download button. (Per task notes: don't fabricate download links.)
           */}
          <div class="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <button
              type="button"
              disabled
              class="cursor-not-allowed rounded-full px-8 py-3 text-base font-semibold text-white opacity-95 shadow-md transition-transform"
              style={{ background: site().brandColor }}
              title="Nessa is coming soon"
            >
              Coming soon
            </button>
            <a
              href="/contact"
              class="border-surface2 hover:bg-surface0/40 rounded-full border-2 px-8 py-3 text-base font-semibold transition-colors"
            >
              Get in touch
            </a>
          </div>
          <p class="text-text/50 mt-4 text-sm">
            Nessa is in active development. Reach out to learn more.
          </p>
        </section>

        {/* ─────────────────────── Features ─────────────────────── */}
        <section class="relative z-10 px-4 py-16" id="features">
          <div class="mx-auto max-w-6xl">
            <div class="mb-12 text-center">
              <h2 class="text-3xl font-bold md:text-4xl">
                Everything your club needs
              </h2>
              <p class="text-text/70 mx-auto mt-3 max-w-2xl text-base md:text-lg">
                Nessa brings the tools communities actually use into one
                shared space — no more juggling chats, spreadsheets, and
                half-built trackers.
              </p>
            </div>

            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <For each={FEATURES}>
                {(feature) => <FeatureCard {...feature} />}
              </For>
            </div>
          </div>
        </section>

        {/* ──────────────────── Secondary CTA band ──────────────────── */}
        <section class="relative z-10 px-4 py-20">
          <div class="mx-auto max-w-4xl text-center">
            <h2 class="text-3xl font-bold md:text-4xl">
              Ready to grow your community?
            </h2>
            <p class="text-text/70 mx-auto mt-3 max-w-xl text-base md:text-lg">
              Nessa is being built for clubs that want structure without the
              friction. We&apos;ll share more as it takes shape.
            </p>
            <div class="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="/contact"
                class="rounded-full px-8 py-3 text-base font-semibold text-white shadow-md transition-transform hover:scale-[1.02] active:scale-95"
                style={{ background: site().brandColor }}
              >
                Contact us
              </a>
              <a
                href="/privacy"
                class="text-text/80 hover:text-text underline-offset-4 hover:underline"
              >
                Privacy policy
              </a>
            </div>
          </div>
        </section>

        {/* ───────────────────────── Footer ───────────────────────── */}
        <footer class="border-surface0 relative z-10 border-t px-4 py-10">
          <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-text/60 sm:flex-row">
            <Show
              when={site().subdomain}
              fallback={<span>{site().displayName}</span>}
            >
              <span>{site().displayName}</span>
            </Show>
            <a
              href="https://freno.me"
              class="hover:text-text underline-offset-4 hover:underline"
            >
              freno.me
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}
