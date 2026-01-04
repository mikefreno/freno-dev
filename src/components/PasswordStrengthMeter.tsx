import { createMemo, For, Show } from "solid-js";
import { validatePassword } from "~/lib/validation";
import { VALIDATION_CONFIG } from "~/config";
import CheckCircle from "./icons/CheckCircle";

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
}

interface Requirement {
  label: string;
  test: (password: string) => boolean;
  optional?: boolean;
}

export default function PasswordStrengthMeter(
  props: PasswordStrengthMeterProps
) {
  const validation = createMemo(() => validatePassword(props.password));

  const strengthConfig = {
    weak: {
      color: "bg-red",
      textColor: "text-red",
      label: "Weak",
      width: "25%"
    },
    fair: {
      color: "bg-yellow",
      textColor: "text-yellow",
      label: "Fair",
      width: "50%"
    },
    good: {
      color: "bg-blue",
      textColor: "text-blue",
      label: "Good",
      width: "75%"
    },
    strong: {
      color: "bg-green",
      textColor: "text-green",
      label: "Strong",
      width: "100%"
    }
  };

  const requirements = createMemo(() => {
    const reqs: Requirement[] = [
      {
        label: `At least ${VALIDATION_CONFIG.MIN_PASSWORD_LENGTH} characters`,
        test: (pwd) => pwd.length >= VALIDATION_CONFIG.MIN_PASSWORD_LENGTH
      }
    ];

    if (VALIDATION_CONFIG.PASSWORD_REQUIRE_UPPERCASE) {
      reqs.push({
        label: "One uppercase letter",
        test: (pwd) => /[A-Z]/.test(pwd)
      });
    }

    if (VALIDATION_CONFIG.PASSWORD_REQUIRE_NUMBER) {
      reqs.push({
        label: "One number",
        test: (pwd) => /[0-9]/.test(pwd)
      });
    }

    reqs.push({
      label: "One special character\n(recommended)",
      test: (pwd) => /[^A-Za-z0-9]/.test(pwd),
      optional: true
    });

    return reqs;
  });

  const strength = createMemo(() => validation().strength);
  const config = createMemo(() => strengthConfig[strength()]);

  return (
    <div class="w-3/4 space-y-2">
      {/* Strength bar */}
      <Show when={props.password.length > 0}>
        <div class="space-y-1">
          <div class="bg-surface border-yellow h-2 w-full overflow-hidden rounded-full border">
            <div
              class={`${config().color} h-full transition-all duration-300 ease-out`}
              style={{ width: config().width }}
            />
          </div>
          <div class="flex justify-between text-xs">
            <span class={config().textColor}>{config().label}</span>
            <Show when={validation().isValid}>
              <span class="text-green flex items-center gap-1">
                <CheckCircle height={14} width={14} />
                Valid
              </span>
            </Show>
          </div>
        </div>
      </Show>

      {/* Requirements checklist */}
      <Show when={props.showRequirements !== false}>
        <div class="space-y-1 text-sm">
          <div class="text-subtext1 text-xs font-medium">
            Password Requirements:
          </div>
          <For each={requirements()}>
            {(req) => {
              const isMet = createMemo(() => req.test(props.password));
              return (
                <div
                  class={`flex items-center gap-2 transition-colors ${
                    isMet()
                      ? "text-green"
                      : req.optional
                        ? "text-blue opacity-70"
                        : props.password.length > 0
                          ? "text-red"
                          : "text-subtext0"
                  }`}
                >
                  <Show
                    when={isMet()}
                    fallback={
                      <div
                        class={`h-4 w-4 rounded-full border-2 ${
                          req.optional
                            ? "border-blue border-dashed"
                            : "border-subtext0"
                        }`}
                      />
                    }
                  >
                    <CheckCircle height={16} width={16} />
                  </Show>
                  <span class="max-w-3/4">{req.label}</span>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
