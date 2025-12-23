import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import {
  createEffect,
  ErrorBoundary,
  onMount,
  onCleanup,
  Suspense,
  Show,
  createSignal
} from "solid-js";
import "./app.css";
import { LeftBar, RightBar } from "./components/Bars";
import { TerminalSplash } from "./components/TerminalSplash";
import { MetaProvider } from "@solidjs/meta";
import ErrorBoundaryFallback from "./components/ErrorBoundaryFallback";
import { BarsProvider, useBars } from "./context/bars";
import { DarkModeProvider } from "./context/darkMode";
import { createWindowWidth, isMobile } from "~/lib/resize-utils";

function AppLayout(props: { children: any }) {
  const {
    leftBarSize,
    rightBarSize,
    setCenterWidth,
    centerWidth,
    leftBarVisible,
    rightBarVisible,
    setLeftBarVisible,
    setRightBarVisible,
    barsInitialized
  } = useBars();

  let lastScrollY = 0;
  const SCROLL_THRESHOLD = 75;

  // Track if we're on the client (hydrated) - starts false on server
  const [isClient, setIsClient] = createSignal(false);

  // Use onMount to avoid hydration issues - window operations are client-only
  onMount(() => {
    setIsClient(true);
    const windowWidth = createWindowWidth();

    createEffect(() => {
      const handleResize = () => {
        const currentIsMobile = isMobile(windowWidth());

        // Show bars when switching to desktop
        if (!currentIsMobile) {
          setLeftBarVisible(true);
          setRightBarVisible(true);
        }

        // On mobile, leftBarSize() is always 0 (overlay mode)
        const newWidth = window.innerWidth - leftBarSize() - rightBarSize();
        setCenterWidth(newWidth);
      };

      // Call immediately and whenever dependencies change
      handleResize();
    });
  });

  // Recalculate when bar sizes change (visibility or actual resize)
  createEffect(() => {
    if (typeof window === "undefined") return;
    // On mobile, leftBarSize() is always 0 (overlay mode)
    const newWidth = window.innerWidth - leftBarSize() - rightBarSize();
    setCenterWidth(newWidth);
  });

  // Auto-hide on scroll (mobile only)
  onMount(() => {
    const windowWidth = createWindowWidth();

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const currentIsMobile = isMobile(windowWidth());

      if (currentIsMobile && currentScrollY > SCROLL_THRESHOLD) {
        // Scrolling down past threshold - hide left bar on mobile
        if (currentScrollY > lastScrollY) {
          setLeftBarVisible(false);
        }
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    onCleanup(() => {
      window.removeEventListener("scroll", handleScroll);
    });
  });

  // ESC key to close sidebars on mobile
  onMount(() => {
    const windowWidth = createWindowWidth();

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentIsMobile = isMobile(windowWidth());

      if (e.key === "Escape" && currentIsMobile) {
        if (leftBarVisible()) {
          setLeftBarVisible(false);
        }
        if (rightBarVisible()) {
          setRightBarVisible(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown);
    });
  });

  // Global swipe gestures to reveal/hide bars
  onMount(() => {
    const windowWidth = createWindowWidth();
    let touchStartX = 0;
    let touchStartY = 0;
    const SWIPE_THRESHOLD = 100;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const currentIsMobile = isMobile(windowWidth());

      // Only trigger if horizontal swipe is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Mobile: Only left bar
        if (currentIsMobile) {
          // Swipe right anywhere - reveal left bar
          if (deltaX > SWIPE_THRESHOLD) {
            setLeftBarVisible(true);
          }
          // Swipe left anywhere - hide left bar
          else if (deltaX < -SWIPE_THRESHOLD) {
            setLeftBarVisible(false);
          }
        } else {
          // Desktop: Both bars
          // Swipe right anywhere - reveal left bar
          if (deltaX > SWIPE_THRESHOLD) {
            setLeftBarVisible(true);
          }
          // Swipe left anywhere - reveal right bar
          else if (deltaX < -SWIPE_THRESHOLD) {
            setRightBarVisible(true);
          }
        }
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    onCleanup(() => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    });
  });

  const handleCenterTapRelease = (e: MouseEvent | TouchEvent) => {
    if (typeof window === "undefined") return;
    const currentIsMobile = window.innerWidth < 768;

    // Only hide left bar on mobile when it's visible
    if (currentIsMobile && leftBarVisible()) {
      const target = e.target as HTMLElement;
      const isInteractive = target.closest(
        "a, button, input, select, textarea, [onclick]"
      );

      if (!isInteractive) {
        setLeftBarVisible(false);
      }
    }
  };

  return (
    <>
      <div class="flex max-w-screen flex-row">
        <LeftBar />
        <Show
          when={!isClient() || barsInitialized()}
          fallback={<TerminalSplash />}
        >
          <div
            class="bg-base relative h-screen overflow-x-hidden overflow-y-scroll"
            style={{
              width: `${centerWidth()}px`,
              "margin-left": `${leftBarSize()}px`
            }}
          >
            <div
              class="py-16"
              onMouseUp={handleCenterTapRelease}
              onTouchEnd={handleCenterTapRelease}
            >
              <Suspense fallback={<TerminalSplash />}>
                {props.children}
              </Suspense>
            </div>
          </div>
        </Show>
        <RightBar />
      </div>
    </>
  );
}

export default function App() {
  return (
    <MetaProvider>
      <ErrorBoundary
        fallback={(error, reset) => (
          <ErrorBoundaryFallback error={error} reset={reset} />
        )}
      >
        <DarkModeProvider>
          <BarsProvider>
            <Router root={(props) => <AppLayout>{props.children}</AppLayout>}>
              <FileRoutes />
            </Router>
          </BarsProvider>
        </DarkModeProvider>
      </ErrorBoundary>
    </MetaProvider>
  );
}
