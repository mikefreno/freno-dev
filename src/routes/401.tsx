import { PageHead } from "~/components/PageHead";
import { HttpStatusCode } from "@solidjs/start";
import { useLocation, useNavigate } from "@solidjs/router";
import { createSignal, onMount, onCleanup } from "solid-js";
import { glitchText } from "~/lib/client-utils";
import { TerminalErrorPage } from "~/components/TerminalErrorPage";

export default function Page_401() {
  const navigate = useNavigate();
  const [glitch401, setGlitch401] = createSignal("401");
  const location = useLocation();

  onMount(() => {
    const interval = glitchText(glitch401(), setGlitch401);

    onCleanup(() => {
      clearInterval(interval);
    });
  });

  const errorContent = (
    <div class="mb-8 w-full max-w-4xl font-mono">
      <div class="mb-4 flex items-center gap-2">
        <span class="text-red text-3xl font-bold">{glitch401()}</span>
        <div class="border-overlay0 h-8 border-l" />
        <div class="flex flex-col">
          <span class="text-red font-mono text-sm">error:</span>
          <span class="text-text font-mono">Unauthorized</span>
        </div>
      </div>

      <div class="border-red bg-mantle mb-6 border-l-4 p-4 text-sm">
        <div class="mb-2 flex items-start gap-2">
          <span class="text-red">✗</span>
          <div class="flex-1">
            <div class="text-text">Access Denied</div>
            <div class="text-subtext0 mt-1">
              Authentication required to access this resource
            </div>
          </div>
        </div>

        <div class="text-subtext1 mt-3">
          <span class="text-yellow">→</span> Location:{" "}
          <span class="text-peach">{location.pathname}</span>
        </div>
      </div>
    </div>
  );
  const quickActions = (
    <>
      {" "}
      <button
        onClick={() => navigate("/login")}
        class="group border-surface0 bg-mantle hover:border-yellow hover:bg-surface0 flex w-full items-center gap-2 border px-4 py-3 text-left transition-all"
      >
        <span class="text-green">$</span>
        <span class="text-yellow group-hover:text-peach">./authenticate</span>
        <span class="text-subtext1">--login</span>
        <span class="text-subtext1 ml-auto opacity-0 transition-opacity group-hover:opacity-100">
          [Login]
        </span>
      </button>
    </>
  );

  return (
    <>
      <PageHead
        title="401 Unauthorized"
        description="401 - Unauthorized access. Please log in to access this page."
      />
      <HttpStatusCode code={401} />
      <TerminalErrorPage
        errorContent={errorContent}
        quickActions={quickActions}
        disableTerminal
        footer={
          <>
            <span class="text-red">401</span>{" "}
            <span class="text-subtext0">|</span> Unauthorized Access
          </>
        }
      />
    </>
  );
}
