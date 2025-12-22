import { onMount, onCleanup, createSignal, JSX } from "solid-js";
import { isServer } from "solid-js/web";

const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl" | number;
  class?: string;
  "aria-label"?: string;
}

const sizeMap = {
  sm: "text-base",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-6xl"
};

export function Spinner(props: SpinnerProps) {
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

  const sizeClass = () => {
    if (typeof props.size === "number") {
      return "";
    }
    return sizeMap[props.size || "md"];
  };

  const style = () => {
    if (typeof props.size === "number") {
      return { "font-size": `${props.size}px`, "line-height": "1" };
    }
    return {};
  };

  return (
    <span
      class={`font-mono ${sizeClass()} ${props.class || ""}`}
      style={style()}
      aria-label={props["aria-label"] || "Loading..."}
      role="status"
    >
      {spinnerChars[showing()]}
    </span>
  );
}
