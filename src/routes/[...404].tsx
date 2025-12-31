import { Title, Meta } from "@solidjs/meta";
import { HttpStatusCode } from "@solidjs/start";
import { useNavigate, useLocation } from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import { TerminalErrorPage } from "~/components/TerminalErrorPage";
import { useDarkMode } from "~/context/darkMode";

// Component that crashes when rendered
function CrashComponent() {
  throw new Error("Terminal crash test - triggering error boundary");
}

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useDarkMode();
  const [glitchText, setGlitchText] = createSignal("404");
  const [shouldCrash, setShouldCrash] = createSignal(false);

  const errorContent = (
    <div class="mb-8 w-full max-w-4xl font-mono">
      <div class="mb-4 flex items-center gap-2">
        <span class="text-red">error:</span>
        <span class="text-text">HTTP {glitchText()} - Not Found</span>
      </div>

      <div class="border-red bg-mantle mb-6 border-l-4 p-4 text-sm">
        <div class="mb-2 flex items-start gap-2">
          <span class="text-red">✗</span>
          <div class="flex-1">
            <div class="text-text">Failed to resolve route</div>
            <div class="text-subtext0 mt-1">
              The requested path does not exist in the routing table
            </div>
          </div>
        </div>

        <div class="text-subtext1 mt-3">
          <span class="text-yellow">→</span> Location:{" "}
          <span class="text-peach">{location.pathname}</span>
        </div>
      </div>

      <div class="text-subtext0 space-y-2 text-sm">
        <div class="flex items-start gap-2">
          <span class="text-blue">ℹ</span>
          <span>
            Type <span class="text-green">help</span> to see available commands,
            or try one of the suggestions below
          </span>
        </div>
      </div>
    </div>
  );

  const quickActions = (
    <div class="mb-8 w-full max-w-4xl space-y-3 font-mono text-sm">
      <div class="text-subtext1">Quick commands:</div>

      <button
        onClick={() => navigate("/")}
        class="group border-surface0 bg-mantle hover:border-blue hover:bg-surface0 flex w-full items-center gap-2 border px-4 py-3 text-left transition-all"
      >
        <span class="text-green">$</span>
        <span class="text-blue group-hover:text-sky">cd</span>
        <span class="text-text group-hover:text-blue">~</span>
        <span class="text-subtext1 ml-auto opacity-0 transition-opacity group-hover:opacity-100">
          [Return home]
        </span>
      </button>

      <button
        onClick={() => window.history.back()}
        class="group border-surface0 bg-mantle hover:border-blue hover:bg-surface0 flex w-full items-center gap-2 border px-4 py-3 text-left transition-all"
      >
        <span class="text-green">$</span>
        <span class="text-blue group-hover:text-sky">cd</span>
        <span class="text-text group-hover:text-blue">..</span>
        <span class="text-subtext1 ml-auto opacity-0 transition-opacity group-hover:opacity-100">
          [Go back]
        </span>
      </button>

      <button
        onClick={() => navigate("/blog")}
        class="group border-surface0 bg-mantle hover:border-blue hover:bg-surface0 flex w-full items-center gap-2 border px-4 py-3 text-left transition-all"
      >
        <span class="text-green">$</span>
        <span class="text-blue group-hover:text-sky">cd</span>
        <span class="text-text group-hover:text-blue">~/blog</span>
        <span class="text-subtext1 ml-auto opacity-0 transition-opacity group-hover:opacity-100">
          [View blog]
        </span>
      </button>
    </div>
  );

  return (
    <>
      <Show when={shouldCrash()}>
        {/*@ts-ignore (intentional crash)*/}
        <CrashComponent />
      </Show>
      <Title>404 Not Found | Michael Freno</Title>
      <Meta
        name="description"
        content="404 - Page not found. The page you're looking for doesn't exist."
      />
      <HttpStatusCode code={404} />
      <TerminalErrorPage
        glitchText="404"
        glitchChars={"!@#$%^&*()_+-=[]{}|;':\",./<>?~`0123456789"}
        glitchSpeed={150}
        glitchThreshold={0.85}
        glitchIntensity={0.7}
        navigate={navigate}
        location={location}
        errorContent={errorContent}
        quickActions={quickActions}
        footer={
          <>
            <span class="text-red">404</span>{" "}
            <span class="text-subtext0">|</span> Page Not Found
          </>
        }
        onGlitchTextChange={setGlitchText}
        commandContext={{
          triggerCrash: () => setShouldCrash(true),
          isDark: isDark
        }}
      />
    </>
  );
}
