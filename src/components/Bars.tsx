import { Typewriter } from "./Typewriter";
import { useBars } from "~/context/bars";
import { onMount, createEffect, createSignal, Show, For } from "solid-js";
import { api } from "~/lib/api";
import { TerminalSplash } from "./TerminalSplash";
import { insertSoftHyphens } from "~/lib/client-utils";

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
      class="border-r-overlay2 fixed z-50 h-full w-min border-r-2 transition-transform duration-500 ease-out md:max-w-[20%]"
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
        class="hamburger-menu-btn bg-surface0 hover:bg-surface1 absolute top-4 -right-14 rounded-md p-2 shadow-md transition-colors"
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

      <Typewriter speed={10} keepAlive={10000} class="z-50 pr-8 pl-4">
        <h3 class="hover:text-subtext0 w-fit text-center text-3xl underline transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105">
          <a href="/">Freno.dev</a>
        </h3>
      </Typewriter>
      <div class="text-text flex flex-col px-4 text-xl font-bold">
        <ul class="gap-4">
          {/* Recent blog posts */}
          <li class="mt-2 mb-6">
            <div class="flex flex-col gap-2">
              <span class="text-lg font-semibold">Recent Posts</span>
              <div class="flex flex-col gap-3">
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
          </li>
        </ul>
        <Typewriter keepAlive={false} class="absolute bottom-12">
          <div class="flex flex-col gap-4">
            <ul class="gap-4">
              <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                <a href="/">Home</a>
              </li>
              <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                <a href="/blog">Blog</a>
              </li>
              <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                <a href="/contact">Contact</a>
              </li>
            </ul>
            {/* Right bar navigation merged for mobile */}
            <ul class="border-overlay0 gap-4 border-t pt-4 md:hidden">
              <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                <a href="/">Home</a>
              </li>
              <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                <a href="#about">About</a>
              </li>
              <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                <a href="/contact">Contact</a>
              </li>
            </ul>
          </div>
        </Typewriter>
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
        // Use requestAnimationFrame to avoid ResizeObserver loop error
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

  // Update size when visibility changes
  createEffect(() => {
    setRightBarSize(rightBarVisible() ? actualWidth : 0);
  });

  return (
    <nav
      ref={ref}
      class="border-l-overlay2 fixed right-0 z-50 hidden h-full min-h-screen w-fit border-l-2 transition-transform duration-500 ease-out md:block md:max-w-[20%]"
      classList={{
        "translate-x-full": !rightBarVisible(),
        "translate-x-0": rightBarVisible()
      }}
      style={{
        "transition-timing-function": rightBarVisible()
          ? "cubic-bezier(0.34, 1.56, 0.64, 1)" // Bounce out when revealing
          : "cubic-bezier(0.4, 0, 0.2, 1)" // Smooth when hiding
      }}
    >
      <Typewriter keepAlive={false} class="z-50">
        <h3 class="hover:text-subtext0 w-fit text-center text-3xl underline transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105">
          Right Navigation
        </h3>
        <div class="text-text flex h-screen flex-col justify-between px-4 py-10 text-xl font-bold">
          <ul class="gap-4">
            <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
              <a href="/">Home</a>
            </li>
            <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
              <a href="#about">About</a>
            </li>
            <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
              <a href="/contact">Contact</a>
            </li>
          </ul>
        </div>
      </Typewriter>
    </nav>
  );
}
