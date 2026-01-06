import { JSX, splitProps, createSignal, Show } from "solid-js";
import Input, { InputProps } from "./Input";
import Eye from "~/components/icons/Eye";
import EyeSlash from "~/components/icons/EyeSlash";
import PasswordStrengthMeter from "~/components/PasswordStrengthMeter";

export interface PasswordInputProps extends Omit<InputProps, "type"> {
  showStrength?: boolean;
  defaultVisible?: boolean;
  passwordValue?: string;
}

export default function PasswordInput(props: PasswordInputProps) {
  const [local, inputProps] = splitProps(props, [
    "showStrength",
    "defaultVisible",
    "passwordValue"
  ]);

  const [showPassword, setShowPassword] = createSignal(
    local.defaultVisible || false
  );

  return (
    <div class="flex flex-col gap-2">
      <div class={"input-group relative"}>
        <Input
          {...inputProps}
          type={showPassword() ? "text" : "password"}
          class={``}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword())}
          class="text-subtext0 absolute right-0 bottom-2 transition-all hover:brightness-125"
          aria-label={showPassword() ? "Hide password" : "Show password"}
        >
          <Show
            when={showPassword()}
            fallback={
              <EyeSlash
                height={24}
                width={24}
                strokeWidth={1}
                class="stroke-text"
              />
            }
          >
            <Eye height={24} width={24} strokeWidth={1} class="stroke-text" />
          </Show>
        </button>
      </div>

      {local.showStrength && local.passwordValue !== undefined && (
        <PasswordStrengthMeter password={local.passwordValue} />
      )}
    </div>
  );
}
