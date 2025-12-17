import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";
import { LeftBar, RightBar } from "./components/Bars";
import { TerminalSplash } from "./components/TerminalSplash";
import { SplashProvider } from "./context/splash";
import { MetaProvider } from "@solidjs/meta";

export default function App() {
  return (
    <MetaProvider>
      <SplashProvider>
        <div>
          <TerminalSplash />
          <Router
            root={(props) => (
              <div class="flex flex-row max-w-screen">
                <LeftBar />
                <div class="flex-1">
                  <Suspense>{props.children}</Suspense>
                </div>
                <RightBar />
              </div>
            )}
          >
            <FileRoutes />
          </Router>
        </div>
      </SplashProvider>
    </MetaProvider>
  );
}
