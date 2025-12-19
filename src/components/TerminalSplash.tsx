import { onMount, onCleanup, createSignal } from "solid-js";
import { isServer } from "solid-js/web";

const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function TerminalSplash() {
  const [showing, setShowing] = createSignal(0);

  onMount(() => {
    // Only run animation on client
    if (isServer) return;

    const interval = setInterval(() => {
      setShowing((prev) => (prev + 1) % spinnerChars.length);
    }, 50);

    onCleanup(() => {
      clearInterval(interval);
    });
  });

  return (
    <div class="bg-base flex min-h-screen w-full flex-col items-center justify-center overflow-hidden">
      <div class="text-text max-w-3xl p-8 font-mono text-4xl whitespace-pre-wrap">
        <div class="flex items-center justify-center">
          {spinnerChars[showing()]}
        </div>
      </div>
    </div>
  );
}
