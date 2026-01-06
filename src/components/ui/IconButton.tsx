import { JSX, splitProps, Show } from "solid-js";
import { Spinner } from "~/components/Spinner";

export interface IconButtonProps extends Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  icon: JSX.Element;
  "aria-label": string;
  variant?: "ghost" | "danger" | "primary";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export default function IconButton(props: IconButtonProps) {
  const [local, others] = splitProps(props, [
    "icon",
    "aria-label",
    "variant",
    "size",
    "loading",
    "disabled",
    "class"
  ]);

  const variant = () => local.variant || "ghost";
  const size = () => local.size || "md";

  const baseClasses =
    "inline-flex items-center justify-center rounded transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2";

  const variantClasses = () => {
    const isDisabledOrLoading = local.disabled || local.loading;

    switch (variant()) {
      case "ghost":
        return isDisabledOrLoading
          ? "cursor-not-allowed opacity-50"
          : "text-text hover:bg-surface0/50 active:scale-95";
      case "danger":
        return isDisabledOrLoading
          ? "cursor-not-allowed opacity-50"
          : "text-red hover:bg-red/10 active:scale-95";
      case "primary":
        return isDisabledOrLoading
          ? "cursor-not-allowed opacity-50"
          : "text-blue hover:bg-blue/10 active:scale-95";
      default:
        return "";
    }
  };

  const sizeClasses = () => {
    switch (size()) {
      case "sm":
        return "p-1";
      case "md":
        return "p-2";
      case "lg":
        return "p-3";
      default:
        return "";
    }
  };

  return (
    <button
      {...others}
      type="button"
      disabled={local.disabled || local.loading}
      aria-label={local["aria-label"]}
      aria-busy={local.loading}
      aria-disabled={local.disabled}
      class={`${baseClasses} ${variantClasses()} ${sizeClasses()} ${local.class || ""}`}
    >
      <Show when={local.loading} fallback={local.icon}>
        <Spinner size={20} />
      </Show>
    </button>
  );
}

export { IconButton };
