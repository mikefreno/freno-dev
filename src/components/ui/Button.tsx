import { JSX, splitProps, Show } from "solid-js";
import LoadingSpinner from "~/components/LoadingSpinner";

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

export default function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, [
    "variant",
    "size",
    "loading",
    "fullWidth",
    "class",
    "children",
    "disabled"
  ]);

  const variant = () => local.variant || "primary";
  const size = () => local.size || "md";

  const baseClasses =
    "flex justify-center items-center rounded transition-all duration-300 ease-out";

  const variantClasses = () => {
    const isDisabledOrLoading = local.disabled || local.loading;

    switch (variant()) {
      case "primary":
        return isDisabledOrLoading
          ? "bg-blue cursor-not-allowed brightness-75"
          : "bg-blue hover:brightness-125 active:scale-90";
      case "secondary":
        return isDisabledOrLoading
          ? "bg-surface0 cursor-not-allowed brightness-75"
          : "bg-surface0 hover:brightness-125 active:scale-90";
      case "danger":
        return isDisabledOrLoading
          ? "bg-red cursor-not-allowed brightness-75"
          : "bg-red hover:brightness-125 active:scale-90";
      case "ghost":
        return isDisabledOrLoading
          ? "cursor-not-allowed opacity-50"
          : "hover:brightness-125 active:scale-90";
      default:
        return "";
    }
  };

  const sizeClasses = () => {
    switch (size()) {
      case "sm":
        return "px-3 py-1.5 text-sm";
      case "md":
        return "px-4 py-2 text-base";
      case "lg":
        return "px-6 py-3 text-lg";
      default:
        return "";
    }
  };

  const widthClass = () => (local.fullWidth ? "w-full" : "");

  return (
    <button
      {...others}
      disabled={local.disabled || local.loading}
      class={`${baseClasses} ${variantClasses()} ${sizeClasses()} ${widthClass()} ${local.class || ""}`}
    >
      <Show when={local.loading} fallback={local.children}>
        <LoadingSpinner height={24} width={24} />
      </Show>
    </button>
  );
}
