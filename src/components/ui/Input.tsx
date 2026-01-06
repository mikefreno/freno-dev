import { JSX, splitProps } from "solid-js";

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  ref?: HTMLInputElement | ((el: HTMLInputElement) => void);
}

export default function Input(props: InputProps) {
  const [local, others] = splitProps(props, [
    "label",
    "error",
    "helperText",
    "ref"
  ]);

  return (
    <div class="input-group">
      <input
        {...others}
        ref={local.ref}
        placeholder=" "
        class={`underlinedInput w-full bg-transparent pr-10`}
        aria-invalid={!!local.error}
        aria-describedby={local.error ? `${others.id}-error` : undefined}
      />
      <span class="bar"></span>
      {local.label && <label class="underlinedInputLabel">{local.label}</label>}
      {local.error && (
        <span
          id={`${others.id}-error`}
          class="mt-1 block text-xs text-red-500"
          role="alert"
        >
          {local.error}
        </span>
      )}
      {local.helperText && !local.error && (
        <span class="mt-1 block text-xs text-gray-500">{local.helperText}</span>
      )}
    </div>
  );
}
