import { Typewriter } from "./Typewriter";
import { useBars } from "~/context/bars";
import {
  onMount,
  createEffect,
  createSignal,
  Show,
  For,
  onCleanup
} from "solid-js";
import { api } from "~/lib/api";
import { insertSoftHyphens } from "~/lib/client-utils";
import GitHub from "./icons/GitHub";
import LinkedIn from "./icons/LinkedIn";
import { RecentCommits } from "./RecentCommits";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { DarkModeToggle } from "./DarkModeToggle";
import { SkeletonBox, SkeletonText } from "./SkeletonLoader";
import { env } from "~/env/client";
import { A, useNavigate } from "@solidjs/router";

function formatDomainName(url: string): string {
  const domain = url.split("://")[1]?.split(":")[0] ?? url;
  const withoutWww = domain.replace(/^www\./i, "");
  return withoutWww.charAt(0).toUpperCase() + withoutWww.slice(1);
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

export function RightBarContent() {
  const { setLeftBarVisible } = useBars();
  const [githubCommits, setGithubCommits] = createSignal<GitCommit[]>([]);
  const [giteaCommits, setGiteaCommits] = createSignal<GitCommit[]>([]);
  const [githubActivity, setGithubActivity] = createSignal<ContributionDay[]>(
    []
  );
  const [giteaActivity, setGiteaActivity] = createSignal<ContributionDay[]>([]);
  const [loading, setLoading] = createSignal(true);

  const handleLinkClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setLeftBarVisible(false);
    }
  };

  onMount(() => {
    // Fetch all data client-side only to avoid hydration mismatch
    const fetchData = async () => {
      try {
        const [ghCommits, gtCommits, ghActivity, gtActivity] =
          await Promise.all([
            api.gitActivity.getGitHubCommits
              .query({ limit: 3 })
              .catch(() => []),
            api.gitActivity.getGiteaCommits.query({ limit: 3 }).catch(() => []),
            api.gitActivity.getGitHubActivity.query().catch(() => []),
            api.gitActivity.getGiteaActivity.query().catch(() => [])
          ]);

        setGithubCommits(ghCommits);
        setGiteaCommits(gtCommits);
        setGithubActivity(ghActivity);
        setGiteaActivity(gtActivity);
      } catch (error) {
        console.error("Failed to fetch git activity:", error);
      } finally {
        setLoading(false);
      }
    };

    // Defer API calls to next tick to allow initial render to complete first
    setTimeout(() => {
      fetchData();
    }, 0);
  });

  return (
    <div class="text-text flex h-full flex-col gap-6 overflow-y-auto pb-6 md:w-min">
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
        </ul>
      </Typewriter>

      {/* Git Activity Section */}
      <hr class="border-overlay0" />
      <div class="flex min-w-0 flex-col gap-6 px-4 pt-6">
        <RecentCommits
          commits={githubCommits()}
          title="Recent GitHub Commits"
          loading={loading()}
        />
        <ActivityHeatmap
          contributions={githubActivity()}
          title="GitHub Activity"
        />
        <RecentCommits
          commits={giteaCommits()}
          title="Recent Gitea Commits"
          loading={loading()}
        />
        <ActivityHeatmap
          contributions={giteaActivity()}
          title="Gitea Activity"
        />
      </div>
    </div>
  );
}

export function LeftBar() {
  const { leftBarVisible, setLeftBarVisible } = useBars();
  let ref: HTMLDivElement | undefined;

  const [recentPosts, setRecentPosts] = createSignal<any[] | undefined>(
    undefined
  );

  const [userInfo, setUserInfo] = createSignal<{
    email: string | null;
    isAuthenticated: boolean;
  } | null>(null);

  const [isMounted, setIsMounted] = createSignal(false);
  const [signOutLoading, setSignOutLoading] = createSignal(false);

  const handleLinkClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setLeftBarVisible(false);
    }
  };

  const handleSignOut = async () => {
    setSignOutLoading(true);
    try {
      await api.auth.signOut.mutate();
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out failed:", error);
      setSignOutLoading(false);
    }
  };

  onMount(() => {
    setIsMounted(true);

    if (ref) {
      // Focus trap for accessibility on mobile
      const handleKeyDown = (e: KeyboardEvent) => {
        const isMobile = window.innerWidth < 768;

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
            // Shift+Tab - going backwards
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            // Tab - going forwards
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
      });
    }

    const fetchData = async () => {
      try {
        const posts = await api.blog.getRecentPosts.query();
        setRecentPosts(posts as any[]);
      } catch (error) {
        console.error("Failed to fetch recent posts:", error);
        setRecentPosts([]);
      }

      try {
        const response = await fetch("/api/trpc/user.getProfile", {
          method: "GET"
        });

        if (response.ok) {
          const result = await response.json();
          if (result.result?.data) {
            setUserInfo({
              email: result.result.data.email,
              isAuthenticated: true
            });
          } else {
            setUserInfo({ email: null, isAuthenticated: false });
          }
        } else {
          setUserInfo({ email: null, isAuthenticated: false });
        }
      } catch (error) {
        console.error("Failed to fetch user info:", error);
        setUserInfo({ email: null, isAuthenticated: false });
      }
    };

    setTimeout(() => {
      fetchData();
    }, 0);
  });
  const navigate = useNavigate();

  return (
    <nav
      id="navigation"
      tabindex="-1"
      ref={ref}
      aria-label="Main navigation"
      class="border-r-overlay2 bg-base fixed z-50 h-dvh border-r-2 transition-transform duration-500 ease-out"
      classList={{
        "-translate-x-full": !leftBarVisible(),
        "translate-x-0": leftBarVisible()
      }}
      style={{
        "transition-timing-function": "cubic-bezier(0.4, 0, 0.2, 1)",
        width: "250px",
        "box-shadow": "inset -6px 0 16px -6px rgba(0, 0, 0, 0.1)",
        "padding-top": "env(safe-area-inset-top)",
        "padding-bottom": "env(safe-area-inset-bottom)"
      }}
    >
      {/* Hamburger menu button - positioned at right edge of navbar */}
      <button
        onClick={() => setLeftBarVisible(!leftBarVisible())}
        class="hamburger-menu-btn absolute top-4 -right-14 z-200 rounded-md p-2 shadow-md backdrop-blur-2xl transition-transform duration-600 ease-in-out hover:scale-110"
        classList={{
          hidden: leftBarVisible()
        }}
        aria-label="Toggle navigation menu"
        style={{
          display: "none" // Hidden by default, shown via media query for non-touch devices
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
                      class="hover:text-subtext0 block w-52 transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105 hover:font-bold"
                    >
                      <Typewriter class="flex flex-col" keepAlive={false}>
                        <div class="relative overflow-hidden">
                          <img
                            src={post.banner_photo || "/blueprint.jpg"}
                            alt="post-cover"
                            class="float-right mb-1 ml-2 h-12 w-16 rounded object-cover"
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

          {/* Navigation Links */}
          <div class="mt-auto">
            <Typewriter keepAlive={false}>
              <ul class="flex flex-col gap-4 py-6">
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
                <li
                  class="hover:text-subtext0 w-fit cursor-pointer transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold"
                  onClick={() => {
                    navigate("/account");
                    handleLinkClick();
                  }}
                >
                  <Show
                    when={isMounted() && userInfo()?.isAuthenticated}
                    fallback={
                      <a href="/login" onClick={handleLinkClick}>
                        Login
                      </a>
                    }
                  >
                    <A href="/account" onClick={handleLinkClick}>
                      Account
                      <Show when={userInfo()?.email}>
                        <span class="text-subtext0 text-sm font-normal">
                          {" "}
                          ({userInfo()!.email})
                        </span>
                      </Show>
                    </A>
                  </Show>
                </li>
                <Show when={isMounted() && userInfo()?.isAuthenticated}>
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

            <hr class="border-overlay0 -mx-4 my-auto" />
            <div class="my-auto">
              <DarkModeToggle />
            </div>

            <div class="border-overlay0 -mx-4 border-t pt-8 md:hidden">
              <RightBarContent />
            </div>
          </div>
        </div>
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
      class="border-l-overlay2 bg-base fixed right-0 z-50 hidden h-dvh w-fit border-l-2 transition-transform duration-500 ease-out md:block"
      classList={{
        "translate-x-full": !rightBarVisible(),
        "translate-x-0": rightBarVisible()
      }}
      style={{
        "transition-timing-function": "cubic-bezier(0.4, 0, 0.2, 1)",
        width: "250px",
        "box-shadow": "inset 6px 0 16px -6px rgba(0, 0, 0, 0.1)",
        "padding-top": "env(safe-area-inset-top)",
        "padding-bottom": "env(safe-area-inset-bottom)"
      }}
    >
      <RightBarContent />
    </aside>
  );
}
