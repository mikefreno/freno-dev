import { Typewriter } from "./Typewriter";
import { useBars } from "~/context/bars";
import { onMount, createEffect, createSignal, Show, For } from "solid-js";
import { api } from "~/lib/api";
import { TerminalSplash } from "./TerminalSplash";
import { insertSoftHyphens } from "~/lib/client-utils";
import GitHub from "./icons/GitHub";
import LinkedIn from "./icons/LinkedIn";
import MoonIcon from "./icons/MoonIcon";
import SunIcon from "./icons/SunIcon";

export function RightBarContent() {
  const [isDark, setIsDark] = createSignal(false);

  onMount(() => {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    if (prefersDark) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      setIsDark(false);
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  });

  const toggleDarkMode = () => {
    const newDarkMode = !isDark();
    setIsDark(newDarkMode);

    if (newDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <div class="text-text flex h-full flex-col justify-between py-6">
      <Typewriter keepAlive={false} class="z-50 px-4 pt-4">
        <div class="flex flex-col gap-6">
          <h3 class="text-subtext0 rule-around text-lg font-semibold">
            Connect
          </h3>
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
                  <GitHub height={24} width={24} fill={undefined} />
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
        </div>
      </Typewriter>
      {/* Dark Mode Toggle */}
      <div class="border-overlay0 border-t px-4 pt-6">
        <button
          onClick={toggleDarkMode}
          class="hover:bg-surface0 flex w-full items-center gap-3 rounded-lg p-3 transition-all duration-200 ease-in-out hover:scale-105"
          aria-label="Toggle dark mode"
        >
          <Show
            when={isDark()}
            fallback={<SunIcon size={24} fill="var(--color-text)" />}
          >
            <MoonIcon size={24} fill="var(--color-text)" />
          </Show>
          <span class="font-semibold">
            <Show
              when={isDark()}
              fallback={<Typewriter keepAlive={false}>Light Mode</Typewriter>}
            >
              <Typewriter keepAlive={false}>Dark Mode</Typewriter>
            </Show>
          </span>
        </button>
      </div>
    </div>
  );
}

export function LeftBar() {
  const { setLeftBarSize, leftBarVisible, setLeftBarVisible } = useBars();
  let ref: HTMLDivElement | undefined;
  let actualWidth = 0;
  let touchStartX = 0;
  let touchStartY = 0;

  const [recentPosts, setRecentPosts] = createSignal<any[] | undefined>(
    undefined
  );

  onMount(async () => {
    // Fetch recent posts only on client side to avoid hydration mismatch
    try {
      const posts = await api.blog.getRecentPosts.query();
      setRecentPosts(posts as any[]);
    } catch (error) {
      console.error("Failed to fetch recent posts:", error);
      setRecentPosts([]);
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
          : "cubic-bezier(0.4, 0, 0.2, 1)" // Smooth when hiding
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
            <div class="flex flex-col gap-3 pt-4">
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
              <div class="flex flex-col gap-4 py-6">
                <ul class="gap-4">
                  <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                    <a href="/">Home</a>
                  </li>
                  <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                    <a href="/blog">Blog</a>
                  </li>
                  <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                    <a href="/login">Login</a>
                  </li>
                </ul>
              </div>
            </Typewriter>

            {/* RightBar content on mobile */}
            <div class="border-overlay0 border-t pt-8 md:hidden">
              <RightBarContent />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export function RightBar() {
  const { setRightBarSize, rightBarVisible } = useBars();
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
          : "cubic-bezier(0.4, 0, 0.2, 1)"
      }}
    >
      <RightBarContent />
    </nav>
  );
}
