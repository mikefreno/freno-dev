import { JSX, splitProps } from "solid-js";

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

/**
 * Reusable input component with label and error handling
 * Styled to match Next.js migration source (underlined input style)
 */
export default function Input(props: InputProps) {
  const [local, others] = splitProps(props, ["label", "error", "helperText", "class"]);

  return (
    <div class="input-group">
      <input
        {...others}
        placeholder=" "
        class={`underlinedInput bg-transparent ${local.class || ""}`}
        aria-invalid={!!local.error}
        aria-describedby={local.error ? `${others.id}-error` : undefined}
      />
      <span class="bar"></span>
      {local.label && (
        <label class="underlinedInputLabel">{local.label}</label>
      )}
      {local.error && (
        <span
          id={`${others.id}-error`}
          class="text-xs text-red-500 mt-1 block"
          role="alert"
        >
          {local.error}
        </span>
      )}
      {local.helperText && !local.error && (
        <span class="text-xs text-gray-500 mt-1 block">
          {local.helperText}
        </span>
      )}
    </div>
  );
}
