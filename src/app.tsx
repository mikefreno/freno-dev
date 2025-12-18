import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { createEffect, ErrorBoundary, Suspense } from "solid-js";
import "./app.css";
import { LeftBar, RightBar } from "./components/Bars";
import { TerminalSplash } from "./components/TerminalSplash";
import { SplashProvider } from "./context/splash";
import { MetaProvider } from "@solidjs/meta";
import ErrorBoundaryFallback from "./components/ErrorBoundaryFallback";
import { BarsProvider, useBars } from "./context/bars";

function AppLayout(props: { children: any }) {
  const { leftBarSize, rightBarSize, setCenterWidth, centerWidth } = useBars();

  createEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth - leftBarSize() - rightBarSize();
      setCenterWidth(newWidth);
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  });

  return (
    <div class="flex max-w-screen flex-row">
      <LeftBar />
      <div
        style={{
          width: `${centerWidth()}px`,
          "margin-left": `${leftBarSize()}px`
        }}
      >
        <Suspense>{props.children}</Suspense>
      </div>
      <RightBar />
    </div>
  );
}

export default function App() {
  return (
    <MetaProvider>
      <SplashProvider>
        <ErrorBoundary
          fallback={(error, reset) => (
            <ErrorBoundaryFallback error={error} reset={reset} />
          )}
        >
          <BarsProvider>
            <TerminalSplash />
            <Router root={(props) => <AppLayout>{props.children}</AppLayout>}>
              <FileRoutes />
            </Router>
          </BarsProvider>
        </ErrorBoundary>
      </SplashProvider>
    </MetaProvider>
  );
}
