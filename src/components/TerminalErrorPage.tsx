import { createSignal, createEffect, onMount, For, Show, JSX } from "solid-js";
import {
  CommandHistoryItem,
  createTerminalCommands,
  executeTerminalCommand,
  CommandContext
} from "~/lib/terminal-commands";
import { Btop } from "~/components/Btop";

interface TerminalErrorPageProps {
  navigate: (path: string) => void;
  location: { pathname: string };
  errorContent: JSX.Element;
  quickActions: JSX.Element;
  footer: JSX.Element;
  commandContext?: Partial<CommandContext>;
  disableTerminal?: boolean;
}

export function TerminalErrorPage(props: TerminalErrorPageProps) {
  const [command, setCommand] = createSignal("");
  const [history, setHistory] = createSignal<CommandHistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = createSignal(-1);
  const [btopOpen, setBtopOpen] = createSignal(false);
  let inputRef: HTMLInputElement | undefined;
  let footerRef: HTMLDivElement | undefined;

  createEffect(() => {
    if (history().length > 0) {
      setTimeout(() => {
        footerRef?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 0);
    }
  });

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
    navigate: props.navigate,
    location: props.location,
    addToHistory,
    openBtop: () => setBtopOpen(true),
    ...props.commandContext
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
    inputRef?.focus();
  });

  return (
    <div
      class={`relative min-h-screen w-full overflow-hidden`}
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
      <div class="relative z-10 flex min-h-screen flex-col items-start justify-start px-4 py-16 lg:px-16">
        {/* Terminal header */}

        {/* Error Content - passed as prop */}
        {props.errorContent}

        {/* Quick Actions - passed as prop */}
        {props.quickActions}

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
        <Show when={!props.disableTerminal}>
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
                autocapitalize="off"
                spellcheck={false}
              />
            </div>
          </div>
        </Show>

        {/* Footer */}
        <div
          ref={footerRef}
          class="text-subtext1 absolute right-4 bottom-4 font-mono text-xs"
        >
          {props.footer}
        </div>
      </div>

      {/* Btop overlay */}
      <Show when={btopOpen()}>
        <Btop onClose={() => setBtopOpen(false)} />
      </Show>

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
