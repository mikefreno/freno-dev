import { onMount, onCleanup, createSignal, JSX } from "solid-js";
import { isServer } from "solid-js/web";

const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

interface SkeletonProps {
  class?: string;
}

function useSpinner() {
  const [showing, setShowing] = createSignal(0);

  onMount(() => {
    if (isServer) return;

    const interval = setInterval(() => {
      setShowing((prev) => (prev + 1) % spinnerChars.length);
    }, 50);

    onCleanup(() => {
      clearInterval(interval);
    });
  });

  return () => spinnerChars[showing()];
}

export function SkeletonBox(props: SkeletonProps) {
  const spinner = useSpinner();

  return (
    <div
      class={`bg-surface0 text-overlay0 flex items-center justify-center rounded font-mono ${props.class || ""}`}
      aria-label="Loading..."
      role="status"
    >
      {spinner()}
    </div>
  );
}

export function SkeletonText(props: SkeletonProps) {
  const spinner = useSpinner();

  return (
    <div
      class={`bg-surface0 text-overlay0 inline-flex h-4 items-center rounded px-2 font-mono text-sm ${props.class || ""}`}
      aria-label="Loading..."
      role="status"
    >
      {spinner()}
    </div>
  );
}

export function SkeletonCircle(props: SkeletonProps) {
  const spinner = useSpinner();

  return (
    <div
      class={`bg-surface0 text-overlay0 flex items-center justify-center rounded-full font-mono ${props.class || ""}`}
      aria-label="Loading..."
      role="status"
    >
      {spinner()}
    </div>
  );
}
