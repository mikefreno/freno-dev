import { Typewriter } from "./Typewriter";
import { useBars } from "~/context/bars";
import {
  onMount,
  createEffect,
  createSignal,
  createResource,
  Show,
  For,
  Suspense
} from "solid-js";
import { api } from "~/lib/api";
import { TerminalSplash } from "./TerminalSplash";
import { insertSoftHyphens } from "~/lib/client-utils";
import GitHub from "./icons/GitHub";
import LinkedIn from "./icons/LinkedIn";
import { RecentCommits } from "./RecentCommits";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { DarkModeToggle } from "./DarkModeToggle";

export function RightBarContent() {
  const [githubCommits] = createResource(async () => {
    try {
      return await api.gitActivity.getGitHubCommits.query({ limit: 3 });
    } catch (error) {
      console.error("Failed to fetch GitHub commits:", error);
      return [];
    }
  });

  const [giteaCommits] = createResource(async () => {
    try {
      return await api.gitActivity.getGiteaCommits.query({ limit: 3 });
    } catch (error) {
      console.error("Failed to fetch Gitea commits:", error);
      return [];
    }
  });

  const [githubActivity] = createResource(async () => {
    try {
      return await api.gitActivity.getGitHubActivity.query();
    } catch (error) {
      console.error("Failed to fetch GitHub activity:", error);
      return [];
    }
  });

  const [giteaActivity] = createResource(async () => {
    try {
      return await api.gitActivity.getGiteaActivity.query();
    } catch (error) {
      console.error("Failed to fetch Gitea activity:", error);
      return [];
    }
  });

  return (
    <div class="text-text flex h-full flex-col gap-6 overflow-y-auto pb-6 md:w-min">
      <Typewriter keepAlive={false} class="z-50 px-4 md:pt-4">
        <ul class="flex flex-col gap-4">
          <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
            <a href="/contact">Contact Me</a>
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
      <Suspense fallback={<TerminalSplash />}>
        <hr class="border-overlay0" />
        <div class="flex min-w-0 flex-col gap-6 px-4 pt-6">
          <RecentCommits
            commits={githubCommits()}
            title="Recent GitHub Commits"
            loading={githubCommits.loading}
          />
          <ActivityHeatmap
            contributions={githubActivity()}
            title="GitHub Activity"
          />
          <RecentCommits
            commits={giteaCommits()}
            title="Recent Gitea Commits"
            loading={giteaCommits.loading}
          />
          <ActivityHeatmap
            contributions={giteaActivity()}
            title="Gitea Activity"
          />
        </div>
      </Suspense>
    </div>
  );
}

export function LeftBar() {
  const { setLeftBarSize, leftBarSize, leftBarVisible, setLeftBarVisible } =
    useBars();
  let ref: HTMLDivElement | undefined;
  let actualWidth = 0;
  let touchStartX = 0;
  let touchStartY = 0;

  const [recentPosts, setRecentPosts] = createSignal<any[] | undefined>(
    undefined
  );

  const [userInfo, setUserInfo] = createSignal<{
    email: string | null;
    isAuthenticated: boolean;
  } | null>(null);

  const [isMounted, setIsMounted] = createSignal(false);
  const [signOutLoading, setSignOutLoading] = createSignal(false);

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

  onMount(async () => {
    // Mark as mounted to avoid hydration mismatch
    setIsMounted(true);

    // Fetch recent posts only on client side to avoid hydration mismatch
    try {
      const posts = await api.blog.getRecentPosts.query();
      setRecentPosts(posts as any[]);
    } catch (error) {
      console.error("Failed to fetch recent posts:", error);
      setRecentPosts([]);
    }

    // Fetch user info client-side only to avoid hydration mismatch
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

    if (ref) {
      const updateSize = () => {
        actualWidth = ref?.offsetWidth || 0;
        setLeftBarSize(leftBarVisible() ? actualWidth : 0);
      };

      updateSize();

      const resizeObserver = new ResizeObserver((entries) => {
        // Use requestAnimationFrame to avoid ResizeObserver loop error
        requestAnimationFrame(() => {
          actualWidth = ref?.offsetWidth || 0;
          setLeftBarSize(leftBarVisible() ? actualWidth : 0);
        });
      });
      resizeObserver.observe(ref);

      // Swipe-to-dismiss gesture on sidebar itself (mobile only)
      const handleTouchStart = (e: TouchEvent) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      };

      const handleTouchEnd = (e: TouchEvent) => {
        const isMobile = window.innerWidth < 768;
        if (!isMobile) return; // Only allow dismiss on mobile

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // Only trigger if horizontal swipe is dominant
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Swipe left to dismiss (at least 50px)
          if (deltaX < -50 && leftBarVisible()) {
            setLeftBarVisible(false);
          }
        }
      };

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

      ref.addEventListener("touchstart", handleTouchStart, { passive: true });
      ref.addEventListener("touchend", handleTouchEnd, { passive: true });
      ref.addEventListener("keydown", handleKeyDown);

      return () => {
        resizeObserver.disconnect();
        ref?.removeEventListener("touchstart", handleTouchStart);
        ref?.removeEventListener("touchend", handleTouchEnd);
        ref?.removeEventListener("keydown", handleKeyDown);
      };
    }
  });

  // Update size when visibility changes
  createEffect(() => {
    setLeftBarSize(leftBarVisible() ? actualWidth : 0);
  });

  // Auto-focus first element when sidebar opens on mobile
  createEffect(() => {
    const isMobile = window.innerWidth < 768;

    if (leftBarVisible() && isMobile && ref) {
      const firstFocusable = ref.querySelector(
        "a[href], button:not([disabled]), input:not([disabled])"
      ) as HTMLElement;

      if (firstFocusable) {
        // Small delay to ensure animation has started
        setTimeout(() => firstFocusable.focus(), 100);
      }
    }
  });

  return (
    <nav
      ref={ref}
      class="border-r-overlay2 bg-base fixed z-50 h-full w-min border-r-2 transition-transform duration-500 ease-out md:max-w-[20%]"
      classList={{
        "-translate-x-full": !leftBarVisible(),
        "translate-x-0": leftBarVisible()
      }}
      style={{
        "transition-timing-function": leftBarVisible()
          ? "cubic-bezier(0.34, 1.56, 0.64, 1)" // Bounce out when revealing
          : "cubic-bezier(0.4, 0, 0.2, 1)", // Smooth when hiding
        "min-width": leftBarSize() > 0 ? `${leftBarSize()}px` : undefined
      }}
    >
      {/* Hamburger menu button - positioned at right edge of navbar */}
      <button
        onClick={() => setLeftBarVisible(!leftBarVisible())}
        class="hamburger-menu-btn absolute top-4 -right-14 z-10 rounded-md p-2 shadow-md backdrop-blur-2xl transition-transform duration-600 ease-in-out hover:scale-110"
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

      <div class="flex h-full min-h-full flex-col overflow-y-auto">
        <Typewriter speed={10} keepAlive={10000} class="z-50 pr-8 pl-4">
          <h3 class="hover:text-subtext0 w-fit text-center text-3xl underline transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105">
            <a href="/">Freno.dev</a>
          </h3>
        </Typewriter>

        <div class="text-text flex flex-1 flex-col px-4 pb-4 text-xl font-bold">
          <div class="flex flex-col py-8">
            <span class="text-lg font-semibold">Recent Posts</span>
            <div class="flex max-h-[50dvh] flex-col gap-3 pt-4">
              <Show when={recentPosts()} fallback={<TerminalSplash />}>
                <For each={recentPosts()}>
                  {(post) => (
                    <a
                      href={`/blog/${post.title}`}
                      class="hover:text-subtext0 block transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105 hover:font-bold"
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
                  <a href="/">Home</a>
                </li>
                <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                  <a href="/blog">Blog</a>
                </li>
                <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                  <Show
                    when={isMounted() && userInfo()?.isAuthenticated}
                    fallback={<a href="/login">Login</a>}
                  >
                    <a href="/account">
                      Account
                      <Show when={userInfo()?.email}>
                        <span class="text-subtext0 text-sm font-normal">
                          {" "}
                          ({userInfo()!.email})
                        </span>
                      </Show>
                    </a>
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
  const { setRightBarSize, rightBarSize, rightBarVisible } = useBars();
  let ref: HTMLDivElement | undefined;
  let actualWidth = 0;

  onMount(() => {
    if (ref) {
      const updateSize = () => {
        actualWidth = ref?.offsetWidth || 0;
        setRightBarSize(rightBarVisible() ? actualWidth : 0);
      };

      updateSize();

      const resizeObserver = new ResizeObserver((entries) => {
        requestAnimationFrame(() => {
          actualWidth = ref?.offsetWidth || 0;
          setRightBarSize(rightBarVisible() ? actualWidth : 0);
        });
      });
      resizeObserver.observe(ref);

      return () => {
        resizeObserver.disconnect();
      };
    }
  });

  createEffect(() => {
    setRightBarSize(rightBarVisible() ? actualWidth : 0);
  });

  return (
    <nav
      ref={ref}
      class="border-l-overlay2 bg-base fixed right-0 z-50 hidden h-full min-h-screen w-fit border-l-2 transition-transform duration-500 ease-out md:block md:max-w-[20%]"
      classList={{
        "translate-x-full": !rightBarVisible(),
        "translate-x-0": rightBarVisible()
      }}
      style={{
        "transition-timing-function": rightBarVisible()
          ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
          : "cubic-bezier(0.4, 0, 0.2, 1)",
        "min-width": rightBarSize() > 0 ? `${rightBarSize()}px` : undefined
      }}
    >
      <RightBarContent />
    </nav>
  );
}
