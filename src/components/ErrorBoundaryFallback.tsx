import { useNavigate } from "@solidjs/router";
import { createSignal, onMount, onCleanup, For, Show } from "solid-js";
import {
  CommandHistoryItem,
  createTerminalCommands,
  executeTerminalCommand
} from "~/lib/terminal-commands";

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
  const [glitchText, setGlitchText] = createSignal("ERROR");
  const [command, setCommand] = createSignal("");
  const [history, setHistory] = createSignal<CommandHistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = createSignal(-1);
  let inputRef: HTMLInputElement | undefined;

  console.error(props.error);

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
    navigate: navigate!,
    location: {
      pathname: typeof window !== "undefined" ? window.location.pathname : "/"
    },
    addToHistory
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
    const glitchChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?~`";
    const originalText = "ERROR";

    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.8) {
        let glitched = "";
        for (let i = 0; i < originalText.length; i++) {
          if (Math.random() > 0.6) {
            glitched +=
              glitchChars[Math.floor(Math.random() * glitchChars.length)];
          } else {
            glitched += originalText[i];
          }
        }
        setGlitchText(glitched);

        setTimeout(() => setGlitchText(originalText), 150);
      }
    }, 400);

    inputRef?.focus();

    onCleanup(() => {
      clearInterval(glitchInterval);
    });
  });

  return (
    <div
      class="bg-crust relative min-h-screen w-full overflow-hidden"
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

        {/* Error Display */}
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
                Type <span class="text-green">help</span> to see available
                commands, or try one of the suggestions below
              </span>
            </div>
          </div>
        </div>

        {/* Command options */}
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
                  <pre
                    class="mt-1 whitespace-pre-wrap"
                    classList={{
                      "text-text": item.type === "success",
                      "text-red": item.type === "error",
                      "text-blue": item.type === "info"
                    }}
                  >
                    {item.output}
                  </pre>
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
          <span class="text-red">ERR</span> <span class="text-subtext0">|</span>{" "}
          Runtime Exception
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
  );
}
