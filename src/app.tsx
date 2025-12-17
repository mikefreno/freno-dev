import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { createEffect, createSignal, ErrorBoundary, Suspense } from "solid-js";
import "./app.css";
import { LeftBar, RightBar } from "./components/Bars";
import { TerminalSplash } from "./components/TerminalSplash";
import { SplashProvider } from "./context/splash";
import { MetaProvider } from "@solidjs/meta";
import ErrorBoundaryFallback from "./components/ErrorBoundaryFallback";

export default function App() {
  let leftBarRef: HTMLDivElement | undefined;
  let rightBarRef: HTMLDivElement | undefined;
  const [contentWidth, setContentWidth] = createSignal(0);
  const [contentWidthOffset, setContentWidthOffset] = createSignal(0);

  createEffect(() => {
    const handleResize = () => {
      if (leftBarRef && rightBarRef) {
        setContentWidth(
          window.innerWidth - leftBarRef.clientWidth - rightBarRef.clientWidth
        );
        setContentWidthOffset(leftBarRef.clientWidth);
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  });

  return (
    <MetaProvider>
      <SplashProvider>
        <ErrorBoundary
          fallback={(error, reset) => (
            <ErrorBoundaryFallback error={error} reset={reset} />
          )}
        >
          <div>
            <TerminalSplash />
            <Router
              root={(props) => (
                <div class="flex max-w-screen flex-row">
                  <LeftBar ref={leftBarRef} />
                  <div
                    style={{
                      width: `${contentWidth()}px`,
                      "margin-left": `${contentWidthOffset()}px`
                    }}
                  >
                    <Suspense>{props.children}</Suspense>
                  </div>
                  <RightBar ref={rightBarRef} />
                </div>
              )}
            >
              <FileRoutes />
            </Router>
          </div>
        </ErrorBoundary>
      </SplashProvider>
    </MetaProvider>
  );
}
