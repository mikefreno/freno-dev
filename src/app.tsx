import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import {
  createEffect,
  ErrorBoundary,
  onMount,
  onCleanup,
  Show,
  Suspense
} from "solid-js";
import "./app.css";
import { LeftBar, RightBar } from "./components/Bars";
import { TerminalSplash } from "./components/TerminalSplash";
import SubdomainFooter from "./components/SubdomainFooter";
import { MetaProvider } from "@solidjs/meta";
import ErrorBoundaryFallback from "./components/ErrorBoundaryFallback";
import { BarsProvider, useBars } from "./context/bars";
import { DarkModeProvider } from "./context/darkMode";
import { AuthProvider } from "./context/auth";
import { SiteProvider, useSite } from "./context/SiteContext";
import { createWindowWidth, isMobile } from "~/lib/resize-utils";
import { MOBILE_CONFIG } from "./config";
import CustomScrollbar from "./components/CustomScrollbar";
import { initPerformanceTracking } from "~/lib/performance-tracking";
import { startDeploymentMonitoring } from "~/lib/deployment-detection";

function AppLayout(props: { children: any }) {
  const {
    leftBarVisible,
    rightBarVisible,
    setLeftBarVisible,
    setRightBarVisible
  } = useBars();

  let lastScrollY = 0;

  onMount(() => {
    // Initialize performance tracking
    initPerformanceTracking();

    // Start monitoring for new deployments
    startDeploymentMonitoring();

    const windowWidth = createWindowWidth();

    createEffect(() => {
      const currentIsMobile = isMobile(windowWidth());

      if (!currentIsMobile) {
        setLeftBarVisible(true);
        setRightBarVisible(true);
      }
    });

    const currentIsMobile = isMobile(windowWidth());
    if (currentIsMobile) {
      setTimeout(() => {
        setLeftBarVisible(false);
      }, 1000);
    }
  });

  onMount(() => {
    const windowWidth = createWindowWidth();

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const currentIsMobile = isMobile(windowWidth());

      if (currentIsMobile && currentScrollY > MOBILE_CONFIG.SCROLL_THRESHOLD) {
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

  onMount(() => {
    const windowWidth = createWindowWidth();
    let touchStartX = 0;
    let touchStartY = 0;

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

      if (currentIsMobile && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > MOBILE_CONFIG.SWIPE_THRESHOLD) {
          setLeftBarVisible(true);
        } else if (deltaX < -MOBILE_CONFIG.SWIPE_THRESHOLD) {
          setLeftBarVisible(false);
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
    const currentIsMobile = isMobile(window.innerWidth);

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

  const site = useSite();
  const isMainSite = () => site().id === "main";

  return (
    <>
      <Show when={isMainSite()}>
        <div class="flex max-w-screen flex-row overflow-x-hidden">
          <LeftBar />
          <div
            id="center-body"
            class="bg-base relative h-screen w-screen overflow-x-hidden md:ml-[250px] md:w-[calc(100vw-500px)]"
          >
            <noscript>
              <div class="bg-yellow text-crust border-text fixed top-0 z-150 border-b-2 p-4 text-center font-semibold md:w-[calc(100vw-500px)]">
                JavaScript is disabled. Features will be limited.
              </div>
            </noscript>
            <ErrorBoundary
              fallback={(error, reset) => (
                <ErrorBoundaryFallback error={error} reset={reset} />
              )}
            >
              <div
                onMouseUp={handleCenterTapRelease}
                onTouchEnd={handleCenterTapRelease}
              >
                <Suspense fallback={<TerminalSplash inverse />}>
                  <CustomScrollbar
                    autoHide={true}
                    autoHideDelay={1500}
                    rightOffset={250}
                  >
                    {props.children}
                  </CustomScrollbar>
                </Suspense>
              </div>
            </ErrorBoundary>
          </div>
          <RightBar />
        </div>
      </Show>

      <Show when={!isMainSite()}>
        <div class="bg-base flex min-h-screen w-full flex-col overflow-x-hidden">
          <noscript>
            <div class="bg-yellow text-crust border-text fixed top-0 z-150 w-full border-b-2 p-4 text-center font-semibold">
              JavaScript is disabled. Features will be limited.
            </div>
          </noscript>
          <div class="flex-1">
            <ErrorBoundary
              fallback={(error, reset) => (
                <ErrorBoundaryFallback error={error} reset={reset} />
              )}
            >
              <Suspense fallback={<TerminalSplash inverse />}>
                {props.children}
              </Suspense>
            </ErrorBoundary>
          </div>
          <SubdomainFooter />
        </div>
      </Show>
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
          <SiteProvider>
            <BarsProvider>
              <Router
                root={(props) => (
                  <AuthProvider>
                    <AppLayout>{props.children}</AppLayout>
                  </AuthProvider>
                )}
              >
                <FileRoutes />
              </Router>
            </BarsProvider>
          </SiteProvider>
        </DarkModeProvider>
      </ErrorBoundary>
    </MetaProvider>
  );
}
