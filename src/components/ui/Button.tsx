import { JSX, splitProps, Show } from "solid-js";

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

/**
 * Reusable button component with variants and loading state
 */
export default function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, [
    "variant",
    "size",
    "loading",
    "fullWidth",
    "class",
    "children",
    "disabled",
  ]);

  const variant = () => local.variant || "primary";
  const size = () => local.size || "md";

  const baseClasses = "flex justify-center items-center rounded font-semibold transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses = () => {
    switch (variant()) {
      case "primary":
        return "bg-blue-400 hover:bg-blue-500 active:scale-90 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-lg shadow-blue-300 dark:shadow-blue-700";
      case "secondary":
        return "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white";
      case "danger":
        return "bg-red-500 hover:bg-red-600 active:scale-90 text-white shadow-lg shadow-red-300 dark:shadow-red-700";
      case "ghost":
        return "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300";
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
        <svg
          class="animate-spin h-5 w-5 mr-2"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Loading...
      </Show>
    </button>
  );
}
