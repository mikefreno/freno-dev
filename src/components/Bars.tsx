import { Typewriter } from "./Typewriter";
import { useBars } from "~/context/bars";
import { useAuth } from "~/context/auth";
import { revalidateAuth } from "~/lib/auth-query";
import {
  onMount,
  createSignal,
  Show,
  For,
  onCleanup,
  type JSX
} from "solid-js";
import { api } from "~/lib/api";
import { insertSoftHyphens, glitchText } from "~/lib/client-utils";
import GitHub from "./icons/GitHub";
import LinkedIn from "./icons/LinkedIn";
import { RecentCommits } from "./RecentCommits";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { DarkModeToggle } from "./DarkModeToggle";
import { SkeletonBox, SkeletonText } from "./SkeletonLoader";
import { env } from "~/env/client";
import { A, useNavigate, useLocation } from "@solidjs/router";
import { BREAKPOINTS } from "~/config";
import { useSite } from "~/context/SiteContext";
import {
  NAV_CONFIG,
  BACK_TO_FRENO,
  filterNavByAuth,
  type NavItem,
  type NavIcon
} from "~/lib/nav-config";

function formatDomainName(url: string): string {
  const domain = url.split("://")[1]?.split(":")[0] ?? url;
  const withoutWww = domain.replace(/^www\./i, "");
  return withoutWww.charAt(0).toUpperCase() + withoutWww.slice(1);
}

function getThumbnailUrl(bannerPhoto: string | null): string {
  if (!bannerPhoto) return "/blueprint.jpg";

  const match = bannerPhoto.match(/^(.+)(\.[^.]+)$/);
  if (match) {
    return `${match[1]}-small${match[2]}`;
  }

  return bannerPhoto;
}

interface GitCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  repo: string;
  url: string;
}

interface ContributionDay {
  date: string;
  count: number;
}

// Four independent cached promises — first RightBarContent instance to mount
// starts each fetch; the second gets the already-in-flight promise.
let ghCommitsPromise: Promise<GitCommit[]> | null = null;
let gtCommitsPromise: Promise<GitCommit[]> | null = null;
let ghActivityPromise: Promise<ContributionDay[]> | null = null;
let gtActivityPromise: Promise<ContributionDay[]> | null = null;

function getGhCommitsPromise(): Promise<GitCommit[]> {
  return (ghCommitsPromise ??= api.gitActivity.getGitHubCommits
    .query({ limit: 6 })
    .catch(() => []));
}
function getGtCommitsPromise(): Promise<GitCommit[]> {
  return (gtCommitsPromise ??= api.gitActivity.getGiteaCommits
    .query({ limit: 6 })
    .catch(() => []));
}
function getGhActivityPromise(): Promise<ContributionDay[]> {
  return (ghActivityPromise ??= api.gitActivity.getGitHubActivity
    .query()
    .catch(() => []));
}
function getGtActivityPromise(): Promise<ContributionDay[]> {
  return (gtActivityPromise ??= api.gitActivity.getGiteaActivity
    .query()
    .catch(() => []));
}

// ── Subdomain nav rendering ──────────────────────────────────────────────
//
// The main site retains its bespoke LeftBar / RightBarContent rendering
// unchanged (Recent Posts, auth-aware Account/Login/SignOut, admin links,
// RecentCommits + ActivityHeatmap widgets, the "What's this?" glitch button).
// Subdomain sites render a simplified, brand-colored shell that iterates
// `NAV_CONFIG[site]` + a "back to freno.me" affordance, and deliberately
// skips the web-auth (freno.me JWT) widgets — Nessa uses Clerk; Lineage uses
// its mobile JWT; neither should surface web login state.

/** Inline icon resolver keyed by `NavIcon` (kept out of the pure nav-config). */
function NavIconSvg(props: { icon?: NavIcon; size?: number }): JSX.Element {
  const size = () => props.size ?? 22;
  const cls = "shaker rounded-full p-2";
  const common = (viewBox: string, path: JSX.Element) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height={size()}
      width={size()}
      viewBox={viewBox}
      class="fill-text"
    >
      {path}
    </svg>
  );
  switch (props.icon) {
    case "home":
      return common(
        "0 0 576 512",
        <path d="M543.8 287.6c17 0 32-14 32-32.1 1-9-3-17-11-24L309.5 7c-6-5-14-7-21-7s-15 1-22 8L10 231.5c-7 7-10 15-9 24 0 18 14 32.1 32 32.1l32 0V448c0 35.3 28.7 64 64 64l224 0c35.3 0 64-28.7 64-64l0-160.4 50.8 0zM272 448v-96c0-17.7 14.3-32 32-32s32 14.3 32 32v96H272z" />
      );
    case "blog":
      return common(
        "0 0 448 512",
        <path d="M448 336v-288C448 21.49 426.5 0 400 0H96C42.98 0 0 42.98 0 96v320c0 53.02 42.98 96 96 96h320c17.67 0 32-14.33 32-32s-14.33-32-32-32H96c-17.67 0-32-14.33-32-32s14.33-32 32-32h320C426.5 416 448 394.5 448 336zM96 352c-11.28 0-21.94 2.564-32 6.879V96c0-17.67 14.33-32 32-32h320v256H96z" />
      );
    case "downloads":
      return common(
        "0 0 512 512",
        <path d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V274.7l-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7V32zM64 352c-35.3 0-64 28.7-64 64v32c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V416c0-35.3-28.7-64-64-64H346.5l-45.3 45.3c-25 25-65.5 25-90.5 0L165.5 352H64zm368 56a24 24 0 1 1 0 48 24 24 0 1 1 0-48z" />
      );
    case "resume":
      return common(
        "0 0 384 512",
        <path d="M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256 0zM112 256H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16z" />
      );
    case "contact":
      return common(
        "0 0 512 512",
        <path d="M96 0C60.7 0 32 28.7 32 64V448c0 35.3 28.7 64 64 64H416c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64H96zM208 256h96c26.5 0 48 21.5 48 48v8c0 44.2-35.8 80-80 80H240c-44.2 0-80-35.8-80-80v-8c0-26.5 21.5-48 48-48zm48-48c26.5 0 48-21.5 48-48s-21.5-48-48-48-48 21.5-48 48 21.5 48 48 48z" />
      );
    case "privacy":
      return common(
        "0 0 512 512",
        <path d="M256 0c4.6 0 9.2 1 13.4 2.9L457.7 82.8c22 9.3 38.4 31 38.3 57.2c-.5 99.2-41.3 280.7-213.6 363.2c-16.7 8-36.1 8-52.8 0C57.3 420.7 16.5 239.2 16 140c-.1-26.2 16.3-47.9 38.3-57.2L242.6 2.9C246.8 1 251.4 0 256 0z" />
      );
    case "deletion":
      return common(
        "0 0 448 512",
        <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z" />
      );
    case "back":
      return common(
        "0 0 512 512",
        <path d="M512 256C512 114.6 397.4 0 256 0S0 114.6 0 256S114.6 512 256 512s256-114.6 256-256zM116.7 244.7l112-112c4.6-4.6 11.9-5.9 17.1-2.5s7.7 10 4.9 16.4l-21.5 50.3H376c13.3 0 24 10.7 24 24s-10.7 24-24 24H229.2l21.5 50.3c2.8 6.4 .3 13-4.9 16.4s-12.5 2.1-17.1-2.5l-112-112c-6.2-6.2-6.2-16.3 0-22.6z" />
      );
    case "github":
      return <GitHub height={22} width={22} fill={`var(--color-text)`} />;
    case "linkedin":
      return <LinkedIn height={22} width={22} fill={undefined} />;
    default:
      return <span class={cls} />;
  }
}

/**
 * Subdomain nav link — renders an internal (`A`) or external (`a`) link with
 * a resolved icon. Uses the same hover affordances as the main-site links.
 */
function SubdomainNavLink(props: { item: NavItem; onClick: () => void }) {
  const inner = (
    <>
      <Show when={props.item.icon}>
        <span class="shaker rounded-full p-2">
          <NavIconSvg icon={props.item.icon} />
        </span>
      </Show>
      <span>{props.item.label}</span>
    </>
  );
  if (props.item.external) {
    return (
      <a
        href={props.item.href}
        target="_blank"
        rel="noreferrer"
        class="hover:text-subtext0 flex items-center gap-3 transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105"
      >
        {inner}
      </a>
    );
  }
  return (
    <A
      href={props.item.href}
      onClick={props.onClick}
      class="hover:text-subtext0 flex items-center gap-3 transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105"
    >
      {inner}
    </A>
  );
}

/** The shared simplified nav list rendered by both subdomain bars. */
function SubdomainNavList(props: { onClick: () => void }) {
  const site = useSite();
  // Auth items intentionally omitted — subdomains don't use the web (freno.me)
  // JWT auth (Nessa uses Clerk; Lineage uses its mobile JWT), so no subdomain
  // nav item sets showLoggedIn/showLoggedOut today. filterNavByAuth is therefore
  // a no-op right now but is kept so future admin items behave correctly
  // without re-touching the renderer. Filtering here keeps LeftBar + RightBar
  // consistent.
  return (
    <For each={filterNavByAuth(NAV_CONFIG[site().id], false)}>
      {(item) => <SubdomainNavLink item={item} onClick={props.onClick} />}
    </For>
  );
}

/** Brand heading — display name in the site's brand color. */
function SubdomainBrand() {
  const site = useSite();
  const accent = () => `color: ${site().brandColor}`;
  return (
    <h3
      class="w-fit pt-6 text-center text-3xl underline transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105"
      style={accent()}
    >
      <A href="/">{site().displayName}</A>
    </h3>
  );
}

/** "Back to freno.me" affordance rendered on every subdomain site. */
function BackToFrenoLink() {
  return (
    <a
      href={BACK_TO_FRENO.href}
      class="hover:text-subtext0 flex items-center gap-3 text-sm transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105"
    >
      <span class="shaker rounded-full p-2">
        <NavIconSvg icon="back" size={18} />
      </span>
      <span>{BACK_TO_FRENO.label}</span>
    </a>
  );
}

/** Inner content for the LeftBar on subdomain sites. */
function SubdomainLeftBarContent() {
  const { setLeftBarVisible } = useBars();
  const handleLinkClick = () => {
    if (
      typeof window !== "undefined" &&
      window.innerWidth < BREAKPOINTS.MOBILE_MAX_WIDTH
    ) {
      setLeftBarVisible(false);
    }
  };
  return (
    <div class="text-text flex h-full flex-col px-4 pb-4 text-xl font-bold">
      <SubdomainBrand />
      <div class="flex flex-col gap-4 py-8">
        {/* Auth items intentionally omitted — see SubdomainNavList. */}
        <SubdomainNavList onClick={handleLinkClick} />
      </div>

      <div class="mt-auto flex flex-col gap-4">
        <BackToFrenoLink />
        <hr class="border-overlay0" />
        <DarkModeToggle />
      </div>

      {/* Mobile-only secondary column mirror of the right bar. */}
      <div class="border-overlay0 -mx-4 mt-4 border-t pt-8 md:hidden">
        <SubdomainRightBarContent />
      </div>
    </div>
  );
}

/** Inner content for the RightBar on subdomain sites (desktop only). */
function SubdomainRightBarContent() {
  const { setLeftBarVisible } = useBars();
  const handleLinkClick = () => {
    if (
      typeof window !== "undefined" &&
      window.innerWidth < BREAKPOINTS.MOBILE_MAX_WIDTH
    ) {
      setLeftBarVisible(false);
    }
  };
  return (
    <div
      id="rightbar-content"
      class="text-text flex h-full flex-col gap-6 overflow-y-auto pb-6 md:w-min"
    >
      <Typewriter keepAlive={false} class="z-50 px-4 md:pt-4">
        <SubdomainBrand />
      </Typewriter>

      <hr class="border-overlay0" />
      <ul class="flex flex-col gap-4 px-4">
        <SubdomainNavList onClick={handleLinkClick} />
      </ul>
      <hr class="border-overlay0" />
      <div class="flex flex-col gap-4 px-4">
        <BackToFrenoLink />
      </div>
    </div>
  );
}

// ── Main-site RightBar (unchanged) ───────────────────────────────────────
function MainRightBarContent() {
  const { setLeftBarVisible } = useBars();
  const [githubCommits, setGithubCommits] = createSignal<GitCommit[]>([]);
  const [giteaCommits, setGiteaCommits] = createSignal<GitCommit[]>([]);
  const [githubActivity, setGithubActivity] = createSignal<ContributionDay[]>(
    []
  );
  const [giteaActivity, setGiteaActivity] = createSignal<ContributionDay[]>([]);
  const [githubCommitsLoading, setGithubCommitsLoading] = createSignal(true);
  const [giteaCommitsLoading, setGiteaCommitsLoading] = createSignal(true);

  const handleLinkClick = () => {
    if (
      typeof window !== "undefined" &&
      window.innerWidth < BREAKPOINTS.MOBILE_MAX_WIDTH
    ) {
      setLeftBarVisible(false);
    }
  };

  onMount(() => {
    setTimeout(() => {
      getGhCommitsPromise().then((commits) => {
        setGithubCommits(commits.slice(0, 3));
        setGithubCommitsLoading(false);
      });

      // Deduplicate Gitea against whatever GitHub has resolved by the time this lands
      getGtCommitsPromise().then((gtCommits) => {
        const ghShas = new Set(githubCommits().map((c) => c.sha));
        setGiteaCommits(
          gtCommits.filter((c) => !ghShas.has(c.sha)).slice(0, 3)
        );
        setGiteaCommitsLoading(false);
      });

      getGhActivityPromise().then((activity) => setGithubActivity(activity));
      getGtActivityPromise().then((activity) => setGiteaActivity(activity));
    }, 0);
  });

  return (
    <div
      id="rightbar-content"
      class="text-text flex h-full flex-col gap-6 overflow-y-auto pb-6 md:w-min"
    >
      <Typewriter keepAlive={false} class="z-50 px-4 md:pt-4">
        <ul class="flex flex-col gap-4">
          <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
            <a href="/contact" onClick={handleLinkClick}>
              Contact Me
            </a>
          </li>
          <li>
            <a
              href="https://github.com/MikeFreno/"
              target="_blank"
              rel="noreferrer"
              class="hover:text-subtext0 flex items-center gap-3 transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105"
            >
              <span class="shaker rounded-full p-2">
                <GitHub height={24} width={24} fill={`var(--color-text)`} />
              </span>
              <span>GitHub</span>
            </a>
          </li>
          <li>
            <a
              href="https://www.linkedin.com/in/michael-freno-176001256/"
              target="_blank"
              rel="noreferrer"
              class="hover:text-subtext0 flex items-center gap-3 transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105"
            >
              <span class="shaker rounded-full p-2">
                <LinkedIn height={24} width={24} fill={undefined} />
              </span>
              <span>LinkedIn</span>
            </a>
          </li>
          <li>
            <a
              href="/resume"
              onClick={handleLinkClick}
              class="hover:text-subtext0 flex items-center gap-3 transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105"
            >
              <span class="shaker rounded-full p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height={24}
                  width={24}
                  viewBox="0 0 384 512"
                  class="fill-text"
                >
                  <path d="M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256 0zM112 256H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16z" />
                </svg>
              </span>
              <span>Resume</span>
            </a>
          </li>
          <li>
            <a
              href="/downloads"
              onClick={handleLinkClick}
              class="hover:text-subtext0 flex items-center gap-3 transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105"
            >
              <span class="shaker rounded-full p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height={24}
                  width={24}
                  viewBox="0 0 512 512"
                  class="fill-text"
                >
                  <path d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V274.7l-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7V32zM64 352c-35.3 0-64 28.7-64 64v32c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V416c0-35.3-28.7-64-64-64H346.5l-45.3 45.3c-25 25-65.5 25-90.5 0L165.5 352H64zm368 56a24 24 0 1 1 0 48 24 24 0 1 1 0-48z" />
                </svg>
              </span>
              <span>Downloads</span>
            </a>
          </li>
        </ul>
      </Typewriter>

      <hr class="border-overlay0" />
      <div class="flex min-w-0 flex-col gap-6 px-4 pt-6">
        <RecentCommits
          commits={giteaCommits()}
          title="Recent Gitea Commits"
          loading={giteaCommitsLoading()}
        />
        <ActivityHeatmap
          contributions={giteaActivity()}
          title="Gitea Activity"
        />
        <RecentCommits
          commits={githubCommits()}
          title="Recent GitHub Commits"
          loading={githubCommitsLoading()}
        />
        <ActivityHeatmap
          contributions={githubActivity()}
          title="GitHub Activity"
        />
      </div>
    </div>
  );
}

function RightBarContent() {
  const site = useSite();
  return (
    <Show when={site().id === "main"} fallback={<SubdomainRightBarContent />}>
      <MainRightBarContent />
    </Show>
  );
}

// ── Main-site LeftBar content (unchanged) ────────────────────────────────
function MainLeftBarContent() {
  const { leftBarVisible, setLeftBarVisible } = useBars();
  const location = useLocation();
  const { isAuthenticated, email, isAdmin } = useAuth();
  let ref: HTMLDivElement | undefined;

  const [recentPosts, setRecentPosts] = createSignal<any[] | undefined>(
    undefined
  );

  const [isMounted, setIsMounted] = createSignal(false);
  const [signOutLoading, setSignOutLoading] = createSignal(false);
  const [getLostText, setGetLostText] = createSignal("What's this?");
  const [getLostVisible, setGetLostVisible] = createSignal(false);

  const handleLinkClick = () => {
    if (
      typeof window !== "undefined" &&
      window.innerWidth < BREAKPOINTS.MOBILE_MAX_WIDTH
    ) {
      setLeftBarVisible(false);
    }
  };

  const handleSignOut = async () => {
    setSignOutLoading(true);
    try {
      await api.auth.signOut.mutate();
      revalidateAuth(); // Clear auth state immediately
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out failed:", error);
      setSignOutLoading(false);
    }
  };

  onMount(() => {
    setIsMounted(true);

    const glitchChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?~`";
    const originalText = "What's this?";
    let glitchInterval: NodeJS.Timeout;
    let animationFrame: number;

    setTimeout(() => {
      setGetLostVisible(true);

      let currentIndex = 0;
      let lastUpdate = 0;
      const updateInterval = 80; // ms between updates

      const revealAnimation = (timestamp: number) => {
        if (timestamp - lastUpdate >= updateInterval) {
          if (currentIndex <= originalText.length) {
            let displayText = originalText.substring(0, currentIndex);
            if (currentIndex < originalText.length) {
              const remaining = originalText.length - currentIndex;
              for (let i = 0; i < remaining; i++) {
                displayText +=
                  glitchChars[Math.floor(Math.random() * glitchChars.length)];
              }
            }
            setGetLostText(displayText);
            currentIndex++;
            lastUpdate = timestamp;
          } else {
            setGetLostText(originalText);

            // Occasional glitch effect after reveal
            glitchInterval = glitchText(originalText, setGetLostText, 200, 80);
            return;
          }
        }
        animationFrame = requestAnimationFrame(revealAnimation);
      };

      animationFrame = requestAnimationFrame(revealAnimation);
    }, 500);

    const fetchData = async () => {
      try {
        const posts = await api.blog.getRecentPosts.query();
        setRecentPosts(posts as any[]);
      } catch (error) {
        console.error("Failed to fetch recent posts:", error);
        setRecentPosts([]);
      }
    };

    setTimeout(() => {
      fetchData();
    }, 0);
  });

  const navigate = useNavigate();

  return (
    <>
      <Typewriter speed={10} keepAlive={10000} class="z-50 pr-8 pl-4">
        <h3 class="hover:text-subtext0 w-fit pt-6 text-center text-3xl underline transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105">
          <a href="/" onClick={handleLinkClick}>
            {formatDomainName(env.VITE_DOMAIN)}
          </a>
        </h3>
      </Typewriter>
      <div class="text-text flex flex-1 flex-col px-4 pb-4 text-xl font-bold">
        <div class="flex flex-col py-8">
          <span class="text-lg font-semibold">Recent Posts</span>
          <div class="flex max-h-[50dvh] flex-col gap-3 pt-4">
            <Show
              when={recentPosts()}
              fallback={
                <For each={[1, 2, 3]}>
                  {() => (
                    <div class="flex w-52 flex-col">
                      <div class="relative overflow-hidden">
                        <SkeletonBox class="float-right ml-2 h-12 w-16" />
                        <div class="flex flex-col">
                          <SkeletonText class="h-6 w-full" />
                          <SkeletonText class="mt-1.5 h-6 w-2/3" />
                        </div>
                      </div>
                      <SkeletonText class="mt-1.5 h-6 w-40" />
                      <SkeletonText class="mt-1.5 h-4 w-1/2" />
                    </div>
                  )}
                </For>
              }
            >
              <For each={recentPosts()}>
                {(post) => (
                  <a
                    href={`/blog/${post.title}`}
                    onClick={handleLinkClick}
                    class="hover:text-subtext0 block w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105 hover:font-bold"
                  >
                    <Typewriter class="flex flex-col" keepAlive={false}>
                      <div class="relative overflow-hidden">
                        <img
                          src={getThumbnailUrl(post.banner_photo)}
                          alt="post-cover"
                          class="float-right mb-1 ml-2 h-12 w-16 rounded object-cover"
                          onError={(e) => {
                            const img = e.currentTarget;
                            if (
                              img.src !==
                              (post.banner_photo || "/blueprint.jpg")
                            ) {
                              img.src = post.banner_photo || "/blueprint.jpg";
                            }
                          }}
                        />
                        <span class="inline wrap-break-word hyphens-auto">
                          {insertSoftHyphens(post.title.replace(/_/g, " "))}
                        </span>
                      </div>

                      <span class="text-subtext0 clear-both text-sm">
                        {new Date(post.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </span>
                    </Typewriter>
                  </a>
                )}
              </For>
            </Show>
          </div>
        </div>

        <div class="mt-auto">
          <Typewriter keepAlive={false}>
            <ul class="flex flex-col gap-4 pt-6">
              <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                <a href="/" onClick={handleLinkClick}>
                  Home
                </a>
              </li>
              <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                <a href="/blog" onClick={handleLinkClick}>
                  Blog
                </a>
              </li>
              <Show when={isMounted() && isAdmin()}>
                <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                  <a href="/analytics" onClick={handleLinkClick}>
                    Analytics
                  </a>
                </li>
              </Show>
              <li
                class="hover:text-subtext0 w-fit cursor-pointer transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold"
                onClick={() => {
                  navigate("/account");
                  handleLinkClick();
                }}
              >
                <Show
                  when={isMounted() && isAuthenticated()}
                  fallback={
                    <a href="/login" onClick={handleLinkClick}>
                      Login
                    </a>
                  }
                >
                  <A href="/account" onClick={handleLinkClick}>
                    Account
                    <Show when={email()}>
                      <span class="text-subtext0 text-sm font-normal">
                        {" "}
                        ({email()})
                      </span>
                    </Show>
                  </A>
                </Show>
              </li>
              <Show when={isMounted() && isAuthenticated()}>
                <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                  <button
                    onClick={handleSignOut}
                    disabled={signOutLoading()}
                    class="text-left disabled:opacity-50"
                  >
                    {signOutLoading() ? "Signing Out..." : "Sign Out"}
                  </button>
                </li>
              </Show>
            </ul>
          </Typewriter>

          <ul class="pt-4 pb-6">
            <li
              class="hover:text-subtext0 w-fit transition-all duration-500 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold"
              classList={{
                "opacity-0 pointer-events-none": !getLostVisible(),
                "opacity-100": getLostVisible()
              }}
            >
              <button
                onClick={() => {
                  const lostUrls = [
                    "/dev/null",
                    "/segfault",
                    "/void",
                    "/404",
                    "/lost-and-still-lost"
                  ];
                  const randomUrl =
                    lostUrls[Math.floor(Math.random() * lostUrls.length)];
                  navigate(randomUrl);
                  handleLinkClick();
                }}
                class="text-left font-mono transition-opacity duration-75"
                style={{ "will-change": "contents" }}
              >
                {getLostText()}
              </button>
            </li>
          </ul>

          <hr class="border-overlay0 -mx-4 my-auto" />
          <div class="my-auto">
            <DarkModeToggle />
          </div>

          <div class="border-overlay0 -mx-4 border-t pt-8 md:hidden">
            <RightBarContent />
          </div>
        </div>
      </div>
    </>
  );
}

export function LeftBar() {
  const { leftBarVisible, setLeftBarVisible } = useBars();
  const site = useSite();
  let ref: HTMLDivElement | undefined;

  const [windowWidth, setWindowWidth] = createSignal(
    typeof window !== "undefined"
      ? window.innerWidth
      : BREAKPOINTS.MOBILE_MAX_WIDTH
  );

  onMount(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);

    if (ref) {
      const handleKeyDown = (e: KeyboardEvent) => {
        const isMobile = window.innerWidth < BREAKPOINTS.MOBILE_MAX_WIDTH;

        if (!isMobile || !leftBarVisible()) return;

        if (e.key === "Tab") {
          const focusableElements = ref?.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );

          if (!focusableElements || focusableElements.length === 0) return;

          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[
            focusableElements.length - 1
          ] as HTMLElement;

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      ref.addEventListener("keydown", handleKeyDown);

      onCleanup(() => {
        ref?.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("resize", handleResize);
      });
    } else {
      onCleanup(() => {
        window.removeEventListener("resize", handleResize);
      });
    }
  });

  const getMainNavStyles = () => {
    const baseStyles = {
      "transition-timing-function": "cubic-bezier(0.4, 0, 0.2, 1)",
      width: "250px",
      "padding-top": "env(safe-area-inset-top)",
      "padding-bottom": "env(safe-area-inset-bottom)"
    };

    const shadowStyle =
      windowWidth() >= BREAKPOINTS.MOBILE_MAX_WIDTH
        ? { "box-shadow": "inset -6px 0 16px -6px rgba(0, 0, 0, 0.1)" }
        : { "box-shadow": "0 10px 10px 0 rgba(0, 0, 0, 0.2)" };

    return { ...baseStyles, ...shadowStyle };
  };

  // Subdomain sites sport an accent border / shadow tinted by the brand color
  // ("bars render appropriately styled per site — brand color hint from
  // SITE_CONFIG"). Main keeps the existing neutral styling.
  const accentBorder = () =>
    site().id === "main" ? undefined : { "border-color": site().brandColor };

  return (
    <nav
      id="navigation"
      tabindex="-1"
      ref={ref}
      aria-label="Main navigation"
      class="border-r-overlay2 bg-base fixed z-200 h-dvh border-r-2 transition-transform duration-500 ease-out"
      classList={{
        "-translate-x-full": !leftBarVisible(),
        "translate-x-0": leftBarVisible()
      }}
      style={{ ...getMainNavStyles(), ...accentBorder() }}
    >
      <button
        onClick={() => setLeftBarVisible(!leftBarVisible())}
        class="hamburger-menu-btn absolute top-4 -right-14 z-9999 rounded-md p-2 shadow-md backdrop-blur-2xl transition-transform duration-600 ease-in-out hover:scale-110"
        classList={{
          hidden: leftBarVisible()
        }}
        aria-label="Toggle navigation menu"
        style={{
          display: "none"
        }}
      >
        <svg
          class="text-text h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <div class="flex h-full flex-col overflow-y-auto">
        <Show
          when={site().id === "main"}
          fallback={<SubdomainLeftBarContent />}
        >
          <MainLeftBarContent />
        </Show>
      </div>
    </nav>
  );
}

export function RightBar() {
  const { rightBarVisible } = useBars();
  let ref: HTMLDivElement | undefined;

  return (
    <aside
      ref={ref}
      aria-label="Links and activity"
      class="border-l-overlay2 bg-base fixed right-0 z-50 hidden h-dvh w-62.5 border-l-2 transition-transform duration-500 ease-out md:block"
      classList={{
        "translate-x-full": !rightBarVisible(),
        "translate-x-0": rightBarVisible()
      }}
      style={{
        "transition-timing-function": "cubic-bezier(0.4, 0, 0.2, 1)",
        "box-shadow": "inset 6px 0 16px -6px rgba(0, 0, 0, 0.1)",
        "padding-top": "env(safe-area-inset-top)",
        width: "250px",
        "padding-bottom": "env(safe-area-inset-bottom)",
        "scrollbar-width": "none"
      }}
    >
      <RightBarContent />
    </aside>
  );
}
