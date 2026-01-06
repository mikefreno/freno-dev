import { PageHead } from "~/components/PageHead";
import { HttpStatusCode } from "@solidjs/start";
import { useLocation, useNavigate } from "@solidjs/router";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { TerminalErrorPage } from "~/components/TerminalErrorPage";
import { glitchText } from "~/lib/client-utils";

function CrashComponent() {
  throw new Error("Terminal crash test - triggering error boundary");
}

export default function NotFound() {
  const [glitch404, setGlitch404] = createSignal("404");
  const [shouldCrash, setShouldCrash] = createSignal(false);
  const navigate = useNavigate();
  const location = useLocation();

  onMount(() => {
    const interval = glitchText(glitch404(), setGlitch404);

    onCleanup(() => {
      clearInterval(interval);
    });
  });

  const errorContent = (
    <div class="mb-8 w-full max-w-4xl font-mono">
      <div class="mb-4 flex items-center gap-2">
        <span class="text-red text-3xl font-bold">{glitch404()}</span>
        <div class="border-overlay0 h-8 border-l" />
        <div class="flex flex-col">
          <span class="text-red font-mono text-sm">error:</span>
          <span class="text-text font-mono">Not Found</span>
        </div>
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
    <>
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
    </>
  );

  return (
    <>
      <Show when={shouldCrash()}>
        {/*@ts-ignore (intentional crash)*/}
        <CrashComponent />
      </Show>
      <PageHead
        title="404 Not Found"
        description="404 - Page not found. The page you're looking for doesn't exist."
      />
      <HttpStatusCode code={404} />
      <TerminalErrorPage
        errorContent={errorContent}
        quickActions={quickActions}
        commandContext={{
          triggerCrash: () => setShouldCrash(true)
        }}
        footer={
          <>
            <span class="text-red">404</span>{" "}
            <span class="text-subtext0">|</span> Page Not Found
          </>
        }
      />
    </>
  );
}
