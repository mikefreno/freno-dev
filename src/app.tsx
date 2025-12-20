import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import {
  createEffect,
  ErrorBoundary,
  Suspense,
  onMount,
  onCleanup,
  Show
} from "solid-js";
import "./app.css";
import { LeftBar, RightBar } from "./components/Bars";
import { TerminalSplash } from "./components/TerminalSplash";
import { MetaProvider } from "@solidjs/meta";
import ErrorBoundaryFallback from "./components/ErrorBoundaryFallback";
import { BarsProvider, useBars } from "./context/bars";

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
  const SCROLL_THRESHOLD = 100;

  createEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768; // md breakpoint

      // Show bars when switching to desktop
      if (!isMobile) {
        setLeftBarVisible(true);
        setRightBarVisible(true);
      }

      const newWidth = window.innerWidth - leftBarSize() - rightBarSize();
      setCenterWidth(newWidth);
    };

    // Call immediately and whenever dependencies change
    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  });

  // Recalculate when bar sizes change (visibility or actual resize)
  createEffect(() => {
    const newWidth = window.innerWidth - leftBarSize() - rightBarSize();
    setCenterWidth(newWidth);
  });

  // Auto-hide on scroll (mobile only)
  onMount(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isMobile = window.innerWidth < 768; // md breakpoint

      if (isMobile && currentScrollY > SCROLL_THRESHOLD) {
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
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMobile = window.innerWidth < 768; // md breakpoint

      if (e.key === "Escape" && isMobile) {
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

  // Swipe gestures to reveal bars
  onMount(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    const EDGE_THRESHOLD = 100;
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
      const isMobile = window.innerWidth < 768; // md breakpoint

      // Only trigger if horizontal swipe is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Mobile: Only left bar
        if (isMobile) {
          // Swipe right from left edge - reveal left bar
          if (touchStartX < EDGE_THRESHOLD && deltaX > SWIPE_THRESHOLD) {
            setLeftBarVisible(true);
          }
        } else {
          // Desktop: Both bars
          // Swipe right from left edge - reveal left bar
          if (touchStartX < EDGE_THRESHOLD && deltaX > SWIPE_THRESHOLD) {
            setLeftBarVisible(true);
          }
          // Swipe left from right edge - reveal right bar
          else if (
            touchStartX > window.innerWidth - EDGE_THRESHOLD &&
            deltaX < -SWIPE_THRESHOLD
          ) {
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

  return (
    <>
      <div class="flex max-w-screen flex-row">
        <LeftBar />
        <div
          class="bg-base relative min-h-screen rounded-t-lg shadow-2xl"
          style={{
            width: `${centerWidth()}px`,
            "margin-left": `${leftBarSize()}px`
          }}
        >
          <Show when={barsInitialized()} fallback={<TerminalSplash />}>
            <Suspense fallback={<TerminalSplash />}>{props.children}</Suspense>
          </Show>
        </div>
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
        <BarsProvider>
          <Router root={(props) => <AppLayout>{props.children}</AppLayout>}>
            <FileRoutes />
          </Router>
        </BarsProvider>
      </ErrorBoundary>
    </MetaProvider>
  );
}
