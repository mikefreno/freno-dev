import { createSignal, createEffect, Show } from "solid-js";
import { A, useNavigate, useSearchParams } from "@solidjs/router";
import CountdownCircleTimer from "~/components/CountdownCircleTimer";
import Eye from "~/components/icons/Eye";
import EyeSlash from "~/components/icons/EyeSlash";
import { validatePassword } from "~/lib/validation";

export default function PasswordResetPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State management
  const [passwordBlurred, setPasswordBlurred] = createSignal(false);
  const [passwordChangeLoading, setPasswordChangeLoading] = createSignal(false);
  const [passwordsMatch, setPasswordsMatch] = createSignal(false);
  const [showPasswordLengthWarning, setShowPasswordLengthWarning] = createSignal(false);
  const [passwordLengthSufficient, setPasswordLengthSufficient] = createSignal(false);
  const [showRequestNewEmail, setShowRequestNewEmail] = createSignal(false);
  const [countDown, setCountDown] = createSignal(false);
  const [error, setError] = createSignal("");
  const [showPasswordInput, setShowPasswordInput] = createSignal(false);
  const [showPasswordConfInput, setShowPasswordConfInput] = createSignal(false);

  // Form refs
  let newPasswordRef: HTMLInputElement | undefined;
  let newPasswordConfRef: HTMLInputElement | undefined;

  // Get token from URL
  const token = searchParams.token;

  // Redirect to request page if no token
  createEffect(() => {
    if (!token) {
      navigate("/login/request-password-reset");
    }
  });

  // Form submission handler
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

    // Validate password
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
      const response = await fetch("/api/trpc/auth.resetPassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          newPassword,
          newPasswordConfirmation: newPasswordConf,
        }),
      });

      const result = await response.json();

      if (response.ok && result.result?.data) {
        setCountDown(true);
      } else {
        const errorMsg = result.error?.message || "Failed to reset password";
        if (errorMsg.includes("expired") || errorMsg.includes("token")) {
          setShowRequestNewEmail(true);
          setError("Token has expired");
        } else {
          setError(errorMsg);
        }
      }
    } catch (err) {
      console.error("Password reset error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  // Check if passwords match
  const checkForMatch = (newPassword: string, newPasswordConf: string) => {
    if (newPassword === newPasswordConf) {
      setPasswordsMatch(true);
    } else {
      setPasswordsMatch(false);
    }
  };

  // Check password length
  const checkPasswordLength = (password: string) => {
    if (password.length >= 8) {
      setPasswordLengthSufficient(true);
      setShowPasswordLengthWarning(false);
    } else {
      setPasswordLengthSufficient(false);
      if (passwordBlurred()) {
        setShowPasswordLengthWarning(true);
      }
    }
  };

  // Handle password blur
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

  // Handle new password change
  const handleNewPasswordChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    checkPasswordLength(target.value);
    if (newPasswordConfRef) {
      checkForMatch(target.value, newPasswordConfRef.value);
    }
  };

  // Handle password confirmation change
  const handlePasswordConfChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (newPasswordRef) {
      checkForMatch(newPasswordRef.value, target.value);
    }
  };

  // Handle password blur
  const handlePasswordBlur = () => {
    passwordLengthBlurCheck();
  };

  // Render countdown timer
  const renderTime = (timeRemaining: number) => {
    if (timeRemaining === 0) {
      navigate("/login");
    }
    return (
      <div class="timer text-center">
        <div class="text-sm text-slate-700 dark:text-slate-300">Change Successful!</div>
        <div class="value py-1 text-3xl text-blue-500 dark:text-blue-400">{timeRemaining}</div>
        <div class="text-sm text-slate-700 dark:text-slate-300">Redirecting...</div>
      </div>
    );
  };

  return (
    <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div class="pt-24 text-center text-xl font-semibold text-slate-800 dark:text-slate-100">
        Set New Password
      </div>

      <form
        onSubmit={(e) => setNewPasswordTrigger(e)}
        class="mt-4 flex w-full justify-center"
      >
        <div class="flex flex-col justify-center max-w-md w-full px-4">
          {/* New Password Input */}
          <div class="input-group mx-4 relative">
            <input
              ref={newPasswordRef}
              name="newPassword"
              type={showPasswordInput() ? "text" : "password"}
              required
              onInput={handleNewPasswordChange}
              onBlur={handlePasswordBlur}
              disabled={passwordChangeLoading()}
              placeholder=" "
              class="underlinedInput w-full bg-transparent pr-10"
            />
            <span class="bar"></span>
            <label class="underlinedInputLabel">New Password</label>
            <button
              type="button"
              onClick={() => setShowPasswordInput(!showPasswordInput())}
              class="absolute right-0 top-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <Show when={showPasswordInput()} fallback={<Eye />}>
                <EyeSlash />
              </Show>
            </button>
          </div>

          {/* Password Length Warning */}
          <div
            class={`${
              showPasswordLengthWarning() ? "" : "select-none opacity-0"
            } transition-opacity text-center text-red-500 text-sm duration-200 ease-in-out mt-2`}
          >
            Password too short! Min Length: 8
          </div>

          {/* Password Confirmation Input */}
          <div class="input-group mx-4 mt-6 relative">
            <input
              ref={newPasswordConfRef}
              name="newPasswordConf"
              onInput={handlePasswordConfChange}
              type={showPasswordConfInput() ? "text" : "password"}
              required
              disabled={passwordChangeLoading()}
              placeholder=" "
              class="underlinedInput w-full bg-transparent pr-10"
            />
            <span class="bar"></span>
            <label class="underlinedInputLabel">Password Confirmation</label>
            <button
              type="button"
              onClick={() => setShowPasswordConfInput(!showPasswordConfInput())}
              class="absolute right-0 top-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <Show when={showPasswordConfInput()} fallback={<Eye />}>
                <EyeSlash />
              </Show>
            </button>
          </div>

          {/* Password Mismatch Warning */}
          <div
            class={`${
              !passwordsMatch() &&
              passwordLengthSufficient() &&
              newPasswordConfRef &&
              newPasswordConfRef.value.length >= 6
                ? ""
                : "select-none opacity-0"
            } transition-opacity text-center text-red-500 text-sm duration-200 ease-in-out mt-2`}
          >
            Passwords do not match!
          </div>

          {/* Countdown Timer or Submit Button */}
          <Show
            when={countDown()}
            fallback={
              <button
                type="submit"
                disabled={passwordChangeLoading() || !passwordsMatch()}
                class={`${
                  passwordChangeLoading() || !passwordsMatch()
                    ? "bg-zinc-400 cursor-not-allowed"
                    : "bg-blue-400 hover:bg-blue-500 active:scale-90 dark:bg-blue-600 dark:hover:bg-blue-700"
                } flex justify-center rounded transition-all duration-300 ease-out my-6 px-4 py-2 text-white font-medium`}
              >
                {passwordChangeLoading() ? "Setting..." : "Set New Password"}
              </button>
            }
          >
            <div class="mx-auto pt-4">
              <CountdownCircleTimer
                isPlaying={countDown()}
                duration={5}
                size={200}
                strokeWidth={12}
                colors="#60a5fa"
                onComplete={() => false}
              >
                {({ remainingTime }) => renderTime(remainingTime)}
              </CountdownCircleTimer>
            </div>
          </Show>
        </div>
      </form>

      {/* Error Message */}
      <Show when={error() && !showRequestNewEmail()}>
        <div class="flex justify-center mt-4">
          <div class="text-red-500 text-sm italic">{error()}</div>
        </div>
      </Show>

      {/* Token Expired Message */}
      <div
        class={`${
          showRequestNewEmail() ? "" : "select-none opacity-0"
        } text-red-500 italic transition-opacity flex justify-center duration-300 ease-in-out px-4`}
      >
        Token has expired, request a new one{" "}
        <A
          class="pl-1 text-blue-500 underline underline-offset-4 hover:text-blue-400"
          href="/login/request-password-reset"
        >
          here
        </A>
      </div>

      {/* Back to Login Link */}
      <Show when={!countDown()}>
        <div class="flex justify-center mt-6">
          <A
            href="/login"
            class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-4 transition-colors"
          >
            Back to Login
          </A>
        </div>
      </Show>
    </div>
  );
}
