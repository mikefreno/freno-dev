import { Typewriter } from "./Typewriter";
import { useBars } from "~/context/bars";
import { onMount, createSignal, Show, For, onCleanup } from "solid-js";
import { api } from "~/lib/api";
import { insertSoftHyphens } from "~/lib/client-utils";
import GitHub from "./icons/GitHub";
import LinkedIn from "./icons/LinkedIn";
import { RecentCommits } from "./RecentCommits";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { DarkModeToggle } from "./DarkModeToggle";
import { SkeletonBox, SkeletonText } from "./SkeletonLoader";
import { env } from "~/env/client";
import {
  A,
  useNavigate,
  useLocation,
  query,
  createAsync
} from "@solidjs/router";
import { BREAKPOINTS } from "~/config";
import { getRequestEvent } from "solid-js/web";

const getUserState = query(async () => {
  "use server";
  const { getPrivilegeLevel, getUserID } = await import("~/server/utils");
  const { ConnectionFactory } = await import("~/server/utils");
  const event = getRequestEvent()!;
  const privilegeLevel = await getPrivilegeLevel(event.nativeEvent);
  const userId = await getUserID(event.nativeEvent);

  if (!userId) {
    return {
      isAuthenticated: false,
      email: null,
      privilegeLevel: "anonymous" as const
    };
  }

  const conn = ConnectionFactory();
  const res = await conn.execute({
    sql: "SELECT email FROM User WHERE id = ?",
    args: [userId]
  });

  const email = res.rows[0] ? (res.rows[0].email as string | null) : null;

  return {
    isAuthenticated: true,
    email,
    privilegeLevel
  };
}, "bars-user-state");

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
    if (
      typeof window !== "undefined" &&
      window.innerWidth < BREAKPOINTS.MOBILE_MAX_WIDTH
    ) {
      setLeftBarVisible(false);
    }
  };

  onMount(() => {
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

    setTimeout(() => {
      fetchData();
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
  const location = useLocation();
  const userState = createAsync(() => getUserState());
  let ref: HTMLDivElement | undefined;

  const [recentPosts, setRecentPosts] = createSignal<any[] | undefined>(
    undefined
  );

  const [isMounted, setIsMounted] = createSignal(false);
  const [signOutLoading, setSignOutLoading] = createSignal(false);
  const [getLostText, setGetLostText] = createSignal("What's this?");
  const [getLostVisible, setGetLostVisible] = createSignal(false);
  const [windowWidth, setWindowWidth] = createSignal(
    typeof window !== "undefined"
      ? window.innerWidth
      : BREAKPOINTS.MOBILE_MAX_WIDTH
  );

  const handleLinkClick = () => {
    if (
      typeof window !== "undefined" &&
      window.innerWidth < BREAKPOINTS.MOBILE
    ) {
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

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);

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
            glitchInterval = setInterval(() => {
              if (Math.random() > 0.92) {
                let glitched = "";
                for (let i = 0; i < originalText.length; i++) {
                  if (Math.random() > 0.75) {
                    glitched +=
                      glitchChars[
                        Math.floor(Math.random() * glitchChars.length)
                      ];
                  } else {
                    glitched += originalText[i];
                  }
                }
                setGetLostText(glitched);

                setTimeout(() => {
                  setGetLostText(originalText);
                }, 80);
              }
            }, 200);
            return;
          }
        }
        animationFrame = requestAnimationFrame(revealAnimation);
      };

      animationFrame = requestAnimationFrame(revealAnimation);
    }, 500);

    if (ref) {
      const handleKeyDown = (e: KeyboardEvent) => {
        const isMobile = window.innerWidth < BREAKPOINTS.MOBILE;

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
        clearInterval(glitchInterval);
        if (animationFrame) cancelAnimationFrame(animationFrame);
        window.removeEventListener("resize", handleResize);
      });
    } else {
      onCleanup(() => {
        clearInterval(glitchInterval);
        if (animationFrame) cancelAnimationFrame(animationFrame);
        window.removeEventListener("resize", handleResize);
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
    };

    setTimeout(() => {
      fetchData();
    }, 0);
  });

  const navigate = useNavigate();
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

  return (
    <nav
      id="navigation"
      tabindex="-1"
      ref={ref}
      aria-label="Main navigation"
      class="border-r-overlay2 bg-base fixed z-9999 h-dvh border-r-2 transition-transform duration-500 ease-out"
      classList={{
        "-translate-x-full": !leftBarVisible(),
        "translate-x-0": leftBarVisible()
      }}
      style={getMainNavStyles()}
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
                <Show
                  when={isMounted() && userState()?.privilegeLevel === "admin"}
                >
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
                    when={isMounted() && userState()?.isAuthenticated}
                    fallback={
                      <a href="/login" onClick={handleLinkClick}>
                        Login
                      </a>
                    }
                  >
                    <A href="/account" onClick={handleLinkClick}>
                      Account
                      <Show when={userState()?.email}>
                        <span class="text-subtext0 text-sm font-normal">
                          {" "}
                          ({userState()!.email})
                        </span>
                      </Show>
                    </A>
                  </Show>
                </li>
                <Show when={isMounted() && userState()?.isAuthenticated}>
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
        "padding-bottom": "env(safe-area-inset-bottom)",
        "scrollbar-width": "none"
      }}
    >
      <RightBarContent />
    </aside>
  );
}
