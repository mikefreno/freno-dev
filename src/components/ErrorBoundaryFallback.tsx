import { useNavigate } from "@solidjs/router";
import { createSignal } from "solid-js";
import { TerminalErrorPage } from "~/components/TerminalErrorPage";
import { useDarkMode } from "~/context/darkMode";

export interface ErrorBoundaryFallbackProps {
  error: Error;
  reset: () => void;
}

export default function ErrorBoundaryFallback(
  props: ErrorBoundaryFallbackProps
) {
  let navigate: ((path: string) => void) | undefined;
  try {
    navigate = useNavigate();
  } catch (e) {
    navigate = (path: string) => {
      window.location.href = path;
    };
  }

  // Try to get dark mode, fallback to true (dark) if context unavailable
  let isDark = true;
  try {
    const darkMode = useDarkMode();
    isDark = darkMode.isDark();
  } catch (e) {
    // Context not available, use default
  }

  const [glitchText, setGlitchText] = createSignal("ERROR");

  console.error(props.error);

  const errorContent = (
    <div class="mb-8 w-full max-w-4xl font-mono">
      <div class="mb-4 flex items-center gap-2">
        <span class="text-red">fatal:</span>
        <span class="text-text">Unhandled Runtime Exception</span>
      </div>

      <div class="border-red bg-mantle mb-6 border-l-4 p-4 text-sm">
        <div class="mb-2 flex items-start gap-2">
          <span class="text-red text-xl">✗</span>
          <div class="flex-1">
            <div class="text-red mb-2 text-lg">{glitchText()}</div>
            <div class="text-text">
              Application encountered an unexpected error
            </div>
            {props.error.message && (
              <div class="bg-surface0 text-subtext0 mt-2 rounded p-2">
                <div class="text-yellow mb-1">Message:</div>
                <div class="text-text">{props.error.message}</div>
              </div>
            )}
            {props.error.stack && (
              <div class="bg-surface0 text-subtext1 mt-3 max-h-40 overflow-auto rounded p-2 text-xs">
                <div class="text-yellow mb-1">Stack trace:</div>
                <pre class="whitespace-pre-wrap">{props.error.stack}</pre>
              </div>
            )}
          </div>
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
      <div class="text-subtext1">Quick actions:</div>

      <button
        onClick={() => props.reset()}
        class="group border-surface0 bg-mantle hover:border-yellow hover:bg-surface0 flex w-full items-center gap-2 border px-4 py-3 text-left transition-all"
      >
        <span class="text-green">$</span>
        <span class="text-yellow group-hover:text-peach">./reset</span>
        <span class="text-subtext1">--state</span>
        <span class="text-subtext1 ml-auto opacity-0 transition-opacity group-hover:opacity-100">
          [Try again]
        </span>
      </button>

      <button
        onClick={() => navigate!("/")}
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
    </div>
  );

  return (
    <TerminalErrorPage
      glitchText="ERROR"
      glitchChars={"!@#$%^&*()_+-=[]{}|;':\",./<>?~`"}
      glitchSpeed={400}
      glitchThreshold={0.8}
      glitchIntensity={0.6}
      navigate={navigate!}
      location={{
        pathname: typeof window !== "undefined" ? window.location.pathname : "/"
      }}
      errorContent={errorContent}
      quickActions={quickActions}
      footer={
        <>
          <span class="text-red">ERR</span> <span class="text-subtext0">|</span>{" "}
          Runtime Exception
        </>
      }
      onGlitchTextChange={setGlitchText}
      commandContext={{ isDark }}
    />
  );
}
