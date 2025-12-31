import { Title, Meta } from "@solidjs/meta";
import { HttpStatusCode } from "@solidjs/start";
import { useNavigate, useLocation } from "@solidjs/router";
import { createSignal, onCleanup, onMount, For, Show } from "solid-js";
import {
  CommandHistoryItem,
  createTerminalCommands,
  executeTerminalCommand
} from "~/lib/terminal-commands";

// Component that crashes when rendered
function CrashComponent() {
  throw new Error("Terminal crash test - triggering error boundary");
}

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const [glitchText, setGlitchText] = createSignal("404");
  const [command, setCommand] = createSignal("");
  const [history, setHistory] = createSignal<CommandHistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = createSignal(-1);
  const [shouldCrash, setShouldCrash] = createSignal(false);
  let inputRef: HTMLInputElement | undefined;

  const addToHistory = (
    cmd: string,
    output: string,
    type: "success" | "error" | "info"
  ) => {
    if (cmd === "clear") {
      setHistory([]);
    } else {
      setHistory([...history(), { command: cmd, output, type }]);
    }
  };

  const commands = createTerminalCommands({
    navigate,
    location,
    addToHistory,
    triggerCrash: () => setShouldCrash(true)
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      executeTerminalCommand(command(), commands, addToHistory);
      setCommand("");
      setHistoryIndex(-1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const allCommands = history().map((h) => h.command);
      if (allCommands.length > 0) {
        const newIndex =
          historyIndex() === -1
            ? allCommands.length - 1
            : Math.max(0, historyIndex() - 1);
        setHistoryIndex(newIndex);
        setCommand(allCommands[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const allCommands = history().map((h) => h.command);
      if (historyIndex() !== -1) {
        const newIndex = Math.min(allCommands.length - 1, historyIndex() + 1);
        setHistoryIndex(newIndex);
        setCommand(allCommands[newIndex]);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const typed = command().toLowerCase();
      const matches = Object.keys(commands).filter((cmd) =>
        cmd.startsWith(typed)
      );
      if (matches.length === 1) {
        setCommand(matches[0]);
      } else if (matches.length > 1) {
        addToHistory(command(), matches.join("  "), "info");
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setHistory([]);
    }
  };

  onMount(() => {
    const glitchChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?~`0123456789";
    const originalText = "404";

    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.85) {
        let glitched = "";
        for (let i = 0; i < originalText.length; i++) {
          if (Math.random() > 0.7) {
            glitched +=
              glitchChars[Math.floor(Math.random() * glitchChars.length)];
          } else {
            glitched += originalText[i];
          }
        }
        setGlitchText(glitched);

        setTimeout(() => setGlitchText(originalText), 100);
      }
    }, 300);

    inputRef?.focus();

    onCleanup(() => {
      clearInterval(glitchInterval);
    });
  });

  return (
    <>
      <Show when={shouldCrash()}>
        {/*@ts-ignore (this is intentional)*/}
        <CrashComponent />
      </Show>
      <Title>404 Not Found | Michael Freno</Title>
      <Meta
        name="description"
        content="404 - Page not found. The page you're looking for doesn't exist."
      />
      <HttpStatusCode code={404} />
      <div
        class="relative min-h-screen w-full overflow-hidden"
        onClick={() => inputRef?.focus()}
      >
        {/* Scanline effect */}
        <div class="pointer-events-none absolute inset-0 z-20 opacity-5">
          <div
            class="h-full w-full"
            style={{
              "background-image":
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)",
              animation: "scanline 8s linear infinite"
            }}
          />
        </div>

        {/* Main content */}
        <div class="relative z-10 flex min-h-screen flex-col items-start justify-start px-8 py-16 md:px-16">
          {/* Terminal header */}
          <div class="mb-8 w-full max-w-4xl">
            <div class="border-surface0 text-subtext0 flex items-center gap-2 border-b pb-2 font-mono text-sm">
              <span class="text-green">freno@terminal</span>
              <span class="text-subtext1">:</span>
              <span class="text-blue">~</span>
              <span class="text-subtext1">$</span>
            </div>
          </div>

          {/* 404 Error Display */}
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
                  Type <span class="text-green">help</span> to see available
                  commands, or try one of the suggestions below
                </span>
              </div>
            </div>
          </div>

          {/* Command suggestions */}
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

          {/* Command history */}
          <Show when={history().length > 0}>
            <div class="mb-4 w-full max-w-4xl font-mono text-sm">
              <For each={history()}>
                {(item) => (
                  <div class="mb-3">
                    <div class="text-subtext0 flex items-center gap-2">
                      <span class="text-green">freno@terminal</span>
                      <span class="text-subtext1">:</span>
                      <span class="text-blue">~</span>
                      <span class="text-subtext1">$</span>
                      <span class="text-text">{item.command}</span>
                    </div>
                    <div
                      class="mt-1 whitespace-pre-wrap"
                      classList={{
                        "text-text": item.type === "success",
                        "text-red": item.type === "error",
                        "text-blue": item.type === "info"
                      }}
                    >
                      {item.output}
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>

          {/* Interactive input */}
          <div class="w-full max-w-4xl font-mono text-sm">
            <div class="flex items-center gap-2">
              <span class="text-green">freno@terminal</span>
              <span class="text-subtext1">:</span>
              <span class="text-blue">~</span>
              <span class="text-subtext1">$</span>
              <input
                ref={inputRef}
                type="text"
                value={command()}
                onInput={(e) => setCommand(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                class="text-text caret-text ml-1 flex-1 border-none bg-transparent outline-none"
                autocomplete="off"
                spellcheck={false}
              />
            </div>
          </div>

          {/* Footer */}
          <div class="text-subtext1 absolute right-4 bottom-4 font-mono text-xs">
            <span class="text-red">404</span>{" "}
            <span class="text-subtext0">|</span> Page Not Found
          </div>
        </div>

        {/* Custom styles */}
        <style>{`
          @keyframes scanline {
            0% {
              transform: translateY(-100%);
            }
            100% {
              transform: translateY(100%);
            }
          }
        `}</style>
      </div>
    </>
  );
}
