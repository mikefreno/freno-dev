import { Show, onMount, onCleanup, createSignal } from "solid-js";
import { useSplash } from "../context/splash";

const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function TerminalSplash() {
  const { showSplash, setShowSplash } = useSplash();
  const [showing, setShowing] = createSignal(0);
  const [isVisible, setIsVisible] = createSignal(true);

  onMount(() => {
    const interval = setInterval(() => {
      setShowing((prev) => (prev + 1) % spinnerChars.length);
    }, 50);

    // Hide splash after 1.5 seconds
    const timeoutId = setTimeout(() => {
      setShowSplash(false);
    }, 1500);

    onCleanup(() => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    });
  });

  // Handle fade out when splash is hidden
  const shouldRender = () => showSplash() || isVisible();

  // Trigger fade out, then hide after transition
  const opacity = () => {
    if (!showSplash() && isVisible()) {
      setTimeout(() => setIsVisible(false), 500);
      return "0";
    }
    if (showSplash()) {
      setIsVisible(true);
      return "1";
    }
    return "0";
  };

  return (
    <Show when={shouldRender()}>
      <div
        class="fixed inset-0 z-50 w-screen h-screen bg-base flex overflow-hidden flex-col items-center justify-center mx-auto transition-opacity duration-500"
        style={{ opacity: opacity() }}
      >
        <div class="font-mono text-text text-4xl whitespace-pre-wrap p-8 max-w-3xl">
          <div class="flex justify-center items-center">
            {spinnerChars[showing()]}
          </div>
        </div>
      </div>
    </Show>
  );
}
