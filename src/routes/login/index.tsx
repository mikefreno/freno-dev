import { createSignal, createEffect, onCleanup, Show } from "solid-js";
import {
  A,
  useNavigate,
  useSearchParams,
  redirect,
  query
} from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { getEvent } from "vinxi/http";
import GoogleLogo from "~/components/icons/GoogleLogo";
import GitHub from "~/components/icons/GitHub";
import Eye from "~/components/icons/Eye";
import EyeSlash from "~/components/icons/EyeSlash";
import CountdownCircleTimer from "~/components/CountdownCircleTimer";
import { isValidEmail, validatePassword } from "~/lib/validation";
import { getClientCookie } from "~/lib/cookies.client";
import { env } from "~/env/client";

const checkAuth = query(async () => {
  "use server";
  const { checkAuthStatus } = await import("~/server/utils");
  const event = getEvent()!;
  const { isAuthenticated } = await checkAuthStatus(event);

  if (isAuthenticated) {
    throw redirect("/account");
  }

  return { isAuthenticated };
}, "loginAuthCheck");

export const route = {
  load: () => checkAuth()
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Derive state directly from URL parameters (no signals needed)
  const register = () => searchParams.mode === "register";
  const usePassword = () => searchParams.auth === "password";

  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [countDown, setCountDown] = createSignal(0);
  const [emailSent, setEmailSent] = createSignal(false);
  const [showPasswordError, setShowPasswordError] = createSignal(false);
  const [showPasswordSuccess, setShowPasswordSuccess] = createSignal(false);
  const [showPasswordInput, setShowPasswordInput] = createSignal(false);
  const [showPasswordConfInput, setShowPasswordConfInput] = createSignal(false);
  const [passwordsMatch, setPasswordsMatch] = createSignal(false);
  const [showPasswordLengthWarning, setShowPasswordLengthWarning] =
    createSignal(false);
  const [passwordLengthSufficient, setPasswordLengthSufficient] =
    createSignal(false);
  const [passwordBlurred, setPasswordBlurred] = createSignal(false);

  let emailRef: HTMLInputElement | undefined;
  let passwordRef: HTMLInputElement | undefined;
  let passwordConfRef: HTMLInputElement | undefined;
  let rememberMeRef: HTMLInputElement | undefined;
  let timerInterval: number | undefined;

  // Environment variables
  const googleClientId = env.VITE_GOOGLE_CLIENT_ID;
  const githubClientId = env.VITE_GITHUB_CLIENT_ID;
  const domain = env.VITE_DOMAIN || "https://www.freno.me";

  const calcRemainder = (timer: string) => {
    const expires = new Date(timer);
    const remaining = expires.getTime() - Date.now();
    const remainingInSeconds = remaining / 1000;

    if (remainingInSeconds <= 0) {
      setCountDown(0);
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    } else {
      setCountDown(remainingInSeconds);
    }
  };

  createEffect(() => {
    const timer = getClientCookie("emailLoginLinkRequested");
    if (timer) {
      timerInterval = setInterval(
        () => calcRemainder(timer),
        1000
      ) as unknown as number;
    }

    onCleanup(() => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    });
  });

  createEffect(() => {
    const errorParam = searchParams.error;
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        missing_code: "OAuth authorization failed - missing code",
        auth_failed: "Authentication failed - please try again",
        server_error: "Server error - please try again later",
        missing_params: "Invalid login link - missing parameters",
        link_expired: "Login link has expired - please request a new one",
        access_denied: "Access denied - you cancelled the login",
        email_in_use:
          "This email is already associated with another account. Please sign in with that account instead."
      };
      setError(errorMessages[errorParam] || "An error occurred during login");
    }
  });

  const formHandler = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShowPasswordError(false);
    setShowPasswordSuccess(false);

    try {
      if (register()) {
        // Registration flow
        if (!emailRef || !passwordRef || !passwordConfRef) {
          setError("Please fill in all fields");
          setLoading(false);
          return;
        }

        const email = emailRef.value;
        const password = passwordRef.value;
        const passwordConf = passwordConfRef.value;

        if (!isValidEmail(email)) {
          setError("Invalid email address");
          setLoading(false);
          return;
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
          setError(passwordValidation.errors[0] || "Invalid password");
          setLoading(false);
          return;
        }

        if (password !== passwordConf) {
          setError("passwordMismatch");
          setLoading(false);
          return;
        }

        // Call registration endpoint
        const response = await fetch("/api/trpc/auth.emailRegistration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            passwordConfirmation: passwordConf
          })
        });

        const result = await response.json();

        if (response.ok && result.result?.data) {
          navigate("/account", { replace: true });
        } else {
          const errorMsg =
            result.error?.message ||
            result.result?.data?.message ||
            "Registration failed";
          if (
            errorMsg.includes("duplicate") ||
            errorMsg.includes("already exists")
          ) {
            setError("duplicate");
          } else {
            setError(errorMsg);
          }
        }
      } else if (usePassword()) {
        // Password login flow
        if (!emailRef || !passwordRef || !rememberMeRef) {
          setError("Please fill in all fields");
          setLoading(false);
          return;
        }

        const email = emailRef.value;
        const password = passwordRef.value;
        const rememberMe = rememberMeRef.checked;

        const response = await fetch("/api/trpc/auth.emailPasswordLogin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, rememberMe })
        });

        const result = await response.json();

        if (response.ok && result.result?.data?.success) {
          setShowPasswordSuccess(true);
          setTimeout(() => {
            navigate("/account", { replace: true });
          }, 500);
        } else {
          setShowPasswordError(true);
        }
      } else {
        // Email link login flow
        if (!emailRef || !rememberMeRef) {
          setError("Please enter your email");
          setLoading(false);
          return;
        }

        const email = emailRef.value;
        const rememberMe = rememberMeRef.checked;

        if (!isValidEmail(email)) {
          setError("Invalid email address");
          setLoading(false);
          return;
        }

        const response = await fetch("/api/trpc/auth.requestEmailLinkLogin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, rememberMe })
        });

        const result = await response.json();

        if (response.ok && result.result?.data?.success) {
          setEmailSent(true);
          const timer = getClientCookie("emailLoginLinkRequested");
          if (timer) {
            if (timerInterval) {
              clearInterval(timerInterval);
            }
            timerInterval = setInterval(
              () => calcRemainder(timer),
              1000
            ) as unknown as number;
          }
        } else {
          const errorMsg =
            result.error?.message ||
            result.result?.data?.message ||
            "Failed to send email";
          setError(errorMsg);
        }
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const renderTime = ({ remainingTime }: { remainingTime: number }) => {
    return (
      <div class="timer">
        <div class="value">{remainingTime.toFixed(0)}</div>
      </div>
    );
  };

  const checkForMatch = (newPassword: string, newPasswordConf: string) => {
    setPasswordsMatch(newPassword === newPasswordConf);
  };

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

  const passwordLengthBlurCheck = () => {
    if (
      !passwordLengthSufficient() &&
      passwordRef &&
      passwordRef.value !== ""
    ) {
      setShowPasswordLengthWarning(true);
    }
    setPasswordBlurred(true);
  };

  const handleNewPasswordChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    checkPasswordLength(target.value);
  };

  const handlePasswordConfChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (passwordRef) {
      checkForMatch(passwordRef.value, target.value);
    }
  };

  const handlePasswordBlur = () => {
    passwordLengthBlurCheck();
  };

  return (
    <>
      <Title>Login | Michael Freno</Title>
      <Meta
        name="description"
        content="Sign in to your account or register for a new account to access personalized features and manage your profile."
      />
      <div class="flex h-dvh flex-row justify-evenly">
        {/* Main content */}
        <div class="relative pt-12 md:pt-24">
          {/* Error message */}
          <Show when={error()}>
            <div class="border-maroon bg-red mb-4 w-full max-w-md rounded-lg border px-4 py-3 text-center">
              <Show when={error() === "passwordMismatch"}>
                <div class="text-base text-lg font-semibold">
                  Passwords did not match!
                </div>
              </Show>
              <Show when={error() === "duplicate"}>
                <div class="text-base text-lg font-semibold">
                  Email Already Exists!
                </div>
              </Show>
              <Show
                when={
                  error() &&
                  error() !== "passwordMismatch" &&
                  error() !== "duplicate"
                }
              >
                <div class="text-base text-sm">{error()}</div>
              </Show>
            </div>
          </Show>

          {/* Title */}
          <div class="py-2 pl-6 text-2xl md:pl-0">
            {register() ? "Register" : "Login"}
          </div>

          {/* Toggle Register/Login */}
          <Show
            when={!register()}
            fallback={
              <div class="py-4 text-center md:min-w-118.75">
                Already have an account?
                <A
                  href="/login"
                  class="text-blue pl-1 underline hover:brightness-125"
                >
                  Click here to Login
                </A>
              </div>
            }
          >
            <div class="py-4 text-center md:min-w-118.75">
              Don't have an account yet?
              <A
                href="/login?mode=register"
                class="text-blue pl-1 underline hover:brightness-125"
              >
                Click here to Register
              </A>
            </div>
          </Show>

          {/* Form */}
          <form onSubmit={formHandler} class="flex flex-col px-2 py-4">
            {/* Email input */}
            <div class="flex justify-center">
              <div class="input-group mx-4">
                <input
                  type="email"
                  required
                  ref={emailRef}
                  placeholder=" "
                  title="Please enter a valid email address"
                  class="underlinedInput bg-transparent"
                />
                <span class="bar"></span>
                <label class="underlinedInputLabel">Email</label>
              </div>
            </div>

            {/* Password input - shown for login with password or registration */}
            <Show when={usePassword() || register()}>
              <div class="-mt-4 flex justify-center">
                <div class="input-group mx-4 flex">
                  <input
                    type={showPasswordInput() ? "text" : "password"}
                    required
                    minLength={8}
                    ref={passwordRef}
                    onInput={register() ? handleNewPasswordChange : undefined}
                    onBlur={register() ? handlePasswordBlur : undefined}
                    placeholder=" "
                    title="Password must be at least 8 characters"
                    class="underlinedInput bg-transparent"
                  />
                  <span class="bar"></span>
                  <label class="underlinedInputLabel">Password</label>
                </div>
                <button
                  onClick={() => {
                    setShowPasswordInput(!showPasswordInput());
                    passwordRef?.focus();
                  }}
                  class="absolute mt-14 ml-60"
                  type="button"
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
                Password too short! Min Length: 8
              </div>
            </Show>

            {/* Password confirmation - shown only for registration */}
            <Show when={register()}>
              <div class="-mt-4 flex justify-center">
                <div class="input-group mx-4">
                  <input
                    type={showPasswordConfInput() ? "text" : "password"}
                    required
                    minLength={8}
                    ref={passwordConfRef}
                    onInput={handlePasswordConfChange}
                    placeholder=" "
                    title="Password must be at least 8 characters and match the password above"
                    class="underlinedInput bg-transparent"
                  />
                  <span class="bar"></span>
                  <label class="underlinedInputLabel">Confirm Password</label>
                </div>
                <button
                  onClick={() => {
                    setShowPasswordConfInput(!showPasswordConfInput());
                    passwordConfRef?.focus();
                  }}
                  class="absolute mt-14 ml-60"
                  type="button"
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
                  passwordConfRef &&
                  passwordConfRef.value.length >= 6
                    ? ""
                    : "opacity-0 select-none"
                } text-red text-center transition-opacity duration-200 ease-in-out`}
              >
                Passwords do not match!
              </div>
            </Show>

            {/* Remember Me checkbox */}
            <div class="mx-auto flex pt-4">
              <input type="checkbox" class="my-auto" ref={rememberMeRef} />
              <div class="my-auto px-2 text-sm font-normal">Remember Me</div>
            </div>

            {/* Error/Success messages */}
            <div
              class={`${
                showPasswordError()
                  ? "text-red"
                  : showPasswordSuccess()
                    ? "text-green"
                    : "opacity-0 select-none"
              } flex min-h-4 justify-center italic transition-opacity duration-300 ease-in-out`}
            >
              <Show when={showPasswordError()}>
                Credentials did not match any record
              </Show>
              <Show when={showPasswordSuccess()}>
                Login Success! Redirecting...
              </Show>
            </div>

            {/* Submit button or countdown timer */}
            <div class="flex justify-center py-4">
              <Show
                when={!register() && !usePassword() && countDown() > 0}
                fallback={
                  <button
                    type="submit"
                    disabled={loading()}
                    class={`${
                      loading()
                        ? "bg-zinc-400"
                        : "bg-blue hover:brightness-125 active:scale-90"
                    } flex w-36 justify-center rounded py-3 text-white transition-all duration-300 ease-out`}
                  >
                    {register()
                      ? "Sign Up"
                      : usePassword()
                        ? "Sign In"
                        : "Get Link"}
                  </button>
                }
              >
                <CountdownCircleTimer
                  duration={120}
                  initialRemainingTime={countDown()}
                  size={48}
                  strokeWidth={6}
                  colors="var(--color-blue)"
                >
                  {renderTime}
                </CountdownCircleTimer>
              </Show>

              {/* Toggle password/email link */}
              <Show when={!register() && !usePassword()}>
                <A
                  href="/login?auth=password"
                  class="hover-underline-animation my-auto ml-2 px-2 text-sm"
                >
                  Use Password
                </A>
              </Show>
              <Show when={usePassword()}>
                <A
                  href="/login"
                  class="hover-underline-animation my-auto ml-2 px-2 text-sm"
                >
                  Use Email Link
                </A>
              </Show>
            </div>
          </form>

          {/* Password reset link */}
          <Show when={usePassword()}>
            <div class="pb-4 text-center text-sm">
              Trouble Logging In?{" "}
              <A
                class="text-blue underline underline-offset-4 hover:brightness-125"
                href="/login/request-password-reset"
              >
                Reset Password
              </A>
            </div>
          </Show>

          {/* Email sent confirmation */}
          <div
            class={`${
              emailSent() ? "" : "user-select opacity-0"
            } text-green flex min-h-4 justify-center text-center italic transition-opacity duration-300 ease-in-out`}
          >
            <Show when={emailSent()}>Email Sent!</Show>
          </div>

          {/* Or divider */}
          <div class="rule-around text-center">Or</div>

          {/* OAuth buttons */}
          <div class="my-2 flex justify-center">
            <div class="mx-auto mb-4 flex flex-col">
              {/* Google OAuth */}
              <A
                href={`https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${domain}/api/auth/callback/google&response_type=code&scope=openid%20email%20profile`}
                class="my-4 flex w-80 flex-row justify-between rounded border border-zinc-800 bg-white px-4 py-2 text-black shadow-md transition-all duration-300 ease-out hover:bg-zinc-100 active:scale-95 dark:border dark:border-zinc-50 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
              >
                {register() ? "Register " : "Sign in "} with Google
                <span class="my-auto">
                  <GoogleLogo height={24} width={24} />
                </span>
              </A>

              {/* GitHub OAuth */}
              <A
                href={`https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${domain}/api/auth/callback/github&scope=read:user%20user:email`}
                class="my-4 flex w-80 flex-row justify-between rounded bg-zinc-600 px-4 py-2 text-white shadow-md transition-all duration-300 ease-out hover:bg-zinc-700 active:scale-95"
              >
                {register() ? "Register " : "Sign in "} with Github
                <span class="my-auto">
                  <GitHub height={24} width={24} fill="white" />
                </span>
              </A>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
