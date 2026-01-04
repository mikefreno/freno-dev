import { createSignal, createEffect, Show } from "solid-js";
import { A, useNavigate, useSearchParams } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import CountdownCircleTimer from "~/components/CountdownCircleTimer";
import Eye from "~/components/icons/Eye";
import EyeSlash from "~/components/icons/EyeSlash";
import { validatePassword } from "~/lib/validation";
import { api } from "~/lib/api";
import { VALIDATION_CONFIG, COUNTDOWN_CONFIG } from "~/config";

export default function PasswordResetPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [passwordBlurred, setPasswordBlurred] = createSignal(false);
  const [passwordChangeLoading, setPasswordChangeLoading] = createSignal(false);
  const [passwordsMatch, setPasswordsMatch] = createSignal(false);
  const [showPasswordLengthWarning, setShowPasswordLengthWarning] =
    createSignal(false);
  const [passwordLengthSufficient, setPasswordLengthSufficient] =
    createSignal(false);
  const [showRequestNewEmail, setShowRequestNewEmail] = createSignal(false);
  const [countDown, setCountDown] = createSignal(false);
  const [error, setError] = createSignal("");
  const [showPasswordInput, setShowPasswordInput] = createSignal(false);
  const [showPasswordConfInput, setShowPasswordConfInput] = createSignal(false);

  let newPasswordRef: HTMLInputElement | undefined;
  let newPasswordConfRef: HTMLInputElement | undefined;

  const token = searchParams.token;

  createEffect(() => {
    if (!token) {
      navigate("/login/request-password-reset");
    }
  });

  const setNewPasswordTrigger = async (e: Event) => {
    e.preventDefault();
    setShowRequestNewEmail(false);
    setError("");

    if (!newPasswordRef || !newPasswordConfRef) {
      setError("Please fill in all fields");
      return;
    }

    const newPassword = newPasswordRef.value;
    const newPasswordConf = newPasswordConfRef.value;

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0] || "Invalid password");
      return;
    }

    if (newPassword !== newPasswordConf) {
      setError("Passwords do not match");
      return;
    }

    setPasswordChangeLoading(true);

    try {
      const result = await api.auth.resetPassword.mutate({
        token: token,
        newPassword,
        newPasswordConfirmation: newPasswordConf
      });

      if (result.success) {
        setCountDown(true);
      } else {
        setError("Failed to reset password");
      }
    } catch (err: any) {
      console.error("Password reset error:", err);
      const errorMsg = err.message || "An error occurred. Please try again.";
      if (errorMsg.includes("expired") || errorMsg.includes("token")) {
        setShowRequestNewEmail(true);
        setError("Token has expired");
      } else {
        setError(errorMsg);
      }
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  const checkForMatch = (newPassword: string, newPasswordConf: string) => {
    if (newPassword === newPasswordConf) {
      setPasswordsMatch(true);
    } else {
      setPasswordsMatch(false);
    }
  };

  const checkPasswordLength = (password: string) => {
    if (password.length >= VALIDATION_CONFIG.MIN_PASSWORD_LENGTH) {
      setPasswordLengthSufficient(true);
      setShowPasswordLengthWarning(false);
    } else {
      setPasswordLengthSufficient(false);
      if (passwordBlurred()) {
        setShowPasswordLengthWarning(true);
      }
    }
  };

  const passwordLengthBlurCheck = () => {
    if (
      !passwordLengthSufficient() &&
      newPasswordRef &&
      newPasswordRef.value !== ""
    ) {
      setShowPasswordLengthWarning(true);
    }
    setPasswordBlurred(true);
  };

  const handleNewPasswordChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    checkPasswordLength(target.value);
    if (newPasswordConfRef) {
      checkForMatch(target.value, newPasswordConfRef.value);
    }
  };

  const handlePasswordConfChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (newPasswordRef) {
      checkForMatch(newPasswordRef.value, target.value);
    }
  };

  const handlePasswordBlur = () => {
    passwordLengthBlurCheck();
  };

  const renderTime = (timeRemaining: number) => {
    if (timeRemaining === 0) {
      navigate("/login");
    }
    return (
      <div class="timer text-center">
        <div class="text-green text-sm">Change Successful!</div>
        <div class="value text-blue py-1 text-3xl">{timeRemaining}</div>
        <div class="text-blue text-sm">Redirecting...</div>
      </div>
    );
  };

  return (
    <>
      <Title>Reset Password | Michael Freno</Title>
      <Meta
        name="description"
        content="Set a new password for your account to regain access to your profile and personalized features."
      />
      <div>
        <div class="pt-24 text-center text-xl font-semibold">
          Set New Password
        </div>

        <form
          onSubmit={(e) => setNewPasswordTrigger(e)}
          class="mt-4 flex w-full justify-center"
        >
          <div class="flex w-full max-w-md flex-col justify-center px-4">
            <div class="flex justify-center">
              <div class="input-group mx-4 flex">
                <input
                  ref={newPasswordRef}
                  name="newPassword"
                  type={showPasswordInput() ? "text" : "password"}
                  required
                  autofocus
                  onInput={handleNewPasswordChange}
                  onBlur={handlePasswordBlur}
                  disabled={passwordChangeLoading()}
                  placeholder=" "
                  class="underlinedInput bg-transparent"
                />
                <span class="bar"></span>
                <label class="underlinedInputLabel">New Password</label>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordInput(!showPasswordInput());
                  newPasswordRef?.focus();
                }}
                class="absolute mt-14 ml-60"
              >
                <Show
                  when={showPasswordInput()}
                  fallback={
                    <EyeSlash
                      height={24}
                      width={24}
                      strokeWidth={1}
                      class="stroke-text"
                    />
                  }
                >
                  <Eye
                    height={24}
                    width={24}
                    strokeWidth={1}
                    class="stroke-text"
                  />
                </Show>
              </button>
            </div>

            <div
              class={`${
                showPasswordLengthWarning() ? "" : "opacity-0 select-none"
              } text-red text-center transition-opacity duration-200 ease-in-out`}
            >
              Password too short! Min Length:{" "}
              {VALIDATION_CONFIG.MIN_PASSWORD_LENGTH}
            </div>

            <div class="-mt-4 flex justify-center">
              <div class="input-group mx-4 flex">
                <input
                  ref={newPasswordConfRef}
                  name="newPasswordConf"
                  onInput={handlePasswordConfChange}
                  type={showPasswordConfInput() ? "text" : "password"}
                  required
                  disabled={passwordChangeLoading()}
                  placeholder=" "
                  class="underlinedInput bg-transparent"
                />
                <span class="bar"></span>
                <label class="underlinedInputLabel">
                  Password Confirmation
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordConfInput(!showPasswordConfInput());
                  newPasswordConfRef?.focus();
                }}
                class="absolute mt-14 ml-60"
              >
                <Show
                  when={showPasswordConfInput()}
                  fallback={
                    <EyeSlash
                      height={24}
                      width={24}
                      strokeWidth={1}
                      class="stroke-text"
                    />
                  }
                >
                  <Eye
                    height={24}
                    width={24}
                    strokeWidth={1}
                    class="stroke-text"
                  />
                </Show>
              </button>
            </div>

            <div
              class={`${
                !passwordsMatch() &&
                passwordLengthSufficient() &&
                newPasswordConfRef &&
                newPasswordConfRef.value.length >=
                  VALIDATION_CONFIG.MIN_PASSWORD_CONF_LENGTH_FOR_ERROR
                  ? ""
                  : "opacity-0 select-none"
              } text-red text-center transition-opacity duration-200 ease-in-out`}
            >
              Passwords do not match!
            </div>

            <Show
              when={countDown()}
              fallback={
                <button
                  type="submit"
                  disabled={passwordChangeLoading() || !passwordsMatch()}
                  class={`${
                    passwordChangeLoading() || !passwordsMatch()
                      ? "cursor-not-allowed bg-zinc-400"
                      : "bg-blue hover:brightness-125 active:scale-90"
                  } my-6 flex justify-center rounded px-4 py-2 text-base font-medium transition-all duration-300 ease-out`}
                >
                  {passwordChangeLoading() ? "Setting..." : "Set New Password"}
                </button>
              }
            >
              <div class="mx-auto pt-4">
                <CountdownCircleTimer
                  isPlaying={countDown()}
                  duration={COUNTDOWN_CONFIG.PASSWORD_RESET_SUCCESS_DURATION_S}
                  size={200}
                  strokeWidth={12}
                  colors="var(--color-blue)"
                  onComplete={() => false}
                >
                  {({ remainingTime }) => renderTime(remainingTime)}
                </CountdownCircleTimer>
              </div>
            </Show>
          </div>
        </form>

        <Show when={error() && !showRequestNewEmail()}>
          <div class="mt-4 flex justify-center">
            <div class="text-red text-sm italic">{error()}</div>
          </div>
        </Show>

        <div
          class={`${
            showRequestNewEmail() ? "" : "opacity-0 select-none"
          } text-red flex justify-center px-4 italic transition-opacity duration-300 ease-in-out`}
        >
          Token has expired, request a new one{" "}
          <A
            class="text-blue pl-1 underline underline-offset-4 hover:brightness-125"
            href="/login/request-password-reset"
          >
            here
          </A>
        </div>

        <Show when={!countDown()}>
          <div class="mt-6 flex justify-center">
            <A
              href="/login"
              class="text-blue underline underline-offset-4 transition-colors hover:brightness-125"
            >
              Back to Login
            </A>
          </div>
        </Show>
      </div>
    </>
  );
}
