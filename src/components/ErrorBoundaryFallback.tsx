import { createSignal, onCleanup, onMount } from "solid-js";
import { TerminalErrorPage } from "~/components/TerminalErrorPage";
import { glitchText } from "~/lib/client-utils";

export interface ErrorBoundaryFallbackProps {
  error: Error;
  reset: () => void;
}

export default function ErrorBoundaryFallback(
  props: ErrorBoundaryFallbackProps
) {
  const [glitchError, setGlitchError] = createSignal("ERROR");

  onMount(() => {
    const interval = glitchText(glitchError(), setGlitchError);

    onCleanup(() => {
      clearInterval(interval);
    });
  });

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
            <div class="text-red mb-2 text-lg">{glitchError()}</div>
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
    <>
      <button
        onClick={() => props.reset()}
        class="group border-surface0 bg-mantle hover:border-yellow hover:bg-surface0 flex w-full cursor-pointer items-center gap-2 border px-4 py-3 text-left transition-all"
      >
        <span class="text-green">$</span>
        <span class="text-yellow group-hover:text-peach">./reset</span>
        <span class="text-subtext1">--state</span>
        <span class="text-subtext1 ml-auto opacity-0 transition-opacity group-hover:opacity-100">
          [Try again]
        </span>
      </button>
    </>
  );

  return (
    <TerminalErrorPage
      errorContent={errorContent}
      quickActions={quickActions}
      footer={
        <>
          <span class="text-red">ERR</span> <span class="text-subtext0">|</span>{" "}
          Runtime Exception
        </>
      }
    />
  );
}
