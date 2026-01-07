import { createSignal, createEffect, onCleanup, Show } from "solid-js";
import {
  A,
  useNavigate,
  useSearchParams,
  redirect,
  query
} from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import { revalidateUserState } from "~/components/Bars";
import { getEvent } from "vinxi/http";
import GoogleLogo from "~/components/icons/GoogleLogo";
import GitHub from "~/components/icons/GitHub";
import CountdownCircleTimer from "~/components/CountdownCircleTimer";
import { isValidEmail, validatePassword } from "~/lib/validation";
import { getClientCookie } from "~/lib/cookies.client";
import { env } from "~/env/client";
import { VALIDATION_CONFIG, COUNTDOWN_CONFIG } from "~/config";
import Input from "~/components/ui/Input";
import PasswordInput from "~/components/ui/PasswordInput";
import { Button } from "~/components/ui/Button";

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

  const register = () => searchParams.mode === "register";
  const usePassword = () => searchParams.auth === "password";

  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [countDown, setCountDown] = createSignal(0);
  const [emailSent, setEmailSent] = createSignal(false);
  const [showPasswordError, setShowPasswordError] = createSignal(false);
  const [showPasswordSuccess, setShowPasswordSuccess] = createSignal(false);
  const [passwordsMatch, setPasswordsMatch] = createSignal(false);
  const [password, setPassword] = createSignal("");
  const [passwordConf, setPasswordConf] = createSignal("");

  let emailRef: HTMLInputElement | undefined;
  let passwordRef: HTMLInputElement | undefined;
  let passwordConfRef: HTMLInputElement | undefined;
  let rememberMeRef: HTMLInputElement | undefined;
  let timerInterval: number | undefined;

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
          const errorCode = result.error?.data?.code;

          if (
            errorCode === "TOO_MANY_REQUESTS" ||
            errorMsg.includes("Too many attempts")
          ) {
            setError(errorMsg);
          } else if (
            errorMsg.includes("duplicate") ||
            errorMsg.includes("already exists")
          ) {
            setError("duplicate");
          } else {
            setError(errorMsg);
          }
        }
      } else if (usePassword()) {
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
          revalidateUserState(); // Refresh user state in sidebar
          setTimeout(() => {
            navigate("/account", { replace: true });
          }, 500);
        } else {
          const errorMessage = result.error?.message || "";
          const errorCode = result.error?.data?.code;

          if (
            errorCode === "TOO_MANY_REQUESTS" ||
            errorMessage.includes("Too many attempts")
          ) {
            setError(errorMessage);
          } else if (
            errorCode === "FORBIDDEN" ||
            errorMessage.includes("Account locked") ||
            errorMessage.includes("Account is locked")
          ) {
            setError(errorMessage);
          } else {
            setShowPasswordError(true);
          }
        }
      } else {
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
          const errorCode = result.error?.data?.code;

          if (
            errorCode === "TOO_MANY_REQUESTS" ||
            errorMsg.includes("countdown not expired") ||
            errorMsg.includes("Too many attempts")
          ) {
            setError(
              errorMsg.includes("countdown")
                ? "Please wait before requesting another email link"
                : errorMsg
            );
          } else {
            setError(errorMsg);
          }
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

  const handlePasswordChange = (e: Event) => {
    const target = e.currentTarget as HTMLInputElement;
    setPassword(target.value);
  };

  const handlePasswordConfChange = (e: Event) => {
    const target = e.currentTarget as HTMLInputElement;
    setPasswordConf(target.value);
    checkForMatch(password(), target.value);
  };

  return (
    <>
      <PageHead
        title="Login"
        description="Sign in to your account or register for a new account to access personalized features and manage your profile."
      />
      <div class="flex h-dvh flex-row justify-evenly">
        <div class="relative pt-12 md:pt-24">
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
                  error().includes("Account locked") ||
                  error().includes("Account is locked")
                }
              >
                <div class="mb-2 text-base font-semibold">
                  🔒 Account Locked
                </div>
                <div class="text-crust text-sm">{error()}</div>
              </Show>
              <Show when={error().includes("Too many attempts")}>
                <div class="mb-2 text-base font-semibold">
                  ⏱️ Rate Limit Exceeded
                </div>
                <div class="text-crust text-sm">{error()}</div>
              </Show>
              <Show
                when={
                  error() &&
                  error() !== "passwordMismatch" &&
                  error() !== "duplicate" &&
                  !error().includes("Account locked") &&
                  !error().includes("Account is locked") &&
                  !error().includes("Too many attempts")
                }
              >
                <div class="text-base text-sm">{error()}</div>
              </Show>
            </div>
          </Show>

          <div class="py-2 pl-6 text-2xl md:pl-0">
            {register() ? "Register" : "Login"}
          </div>

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

          <form onSubmit={formHandler} class="flex flex-col px-2 py-4">
            <Input
              type="email"
              required
              ref={emailRef}
              title="Please enter a valid email address"
              label="Email"
            />

            <Show when={usePassword() || register()}>
              <PasswordInput
                required
                minLength={8}
                ref={passwordRef}
                onInput={register() ? handlePasswordChange : undefined}
                title="Password must be at least 8 characters"
                label="Password"
                showStrength={register()}
                passwordValue={register() ? password() : undefined}
              />
            </Show>

            <Show when={register()}>
              <PasswordInput
                required
                minLength={8}
                ref={passwordConfRef}
                onInput={handlePasswordConfChange}
                title="Password must be at least 8 characters and match the password above"
                label="Confirm Password"
              />
            </Show>

            <Show when={register()}>
              <div
                class={`${
                  !passwordsMatch() &&
                  passwordConf().length >=
                    VALIDATION_CONFIG.MIN_PASSWORD_CONF_LENGTH_FOR_ERROR
                    ? ""
                    : "opacity-0 select-none"
                } text-red text-center transition-opacity duration-200 ease-in-out`}
              >
                Passwords do not match!
              </div>
            </Show>

            <div class="mx-auto flex pt-4">
              <input type="checkbox" class="my-auto" ref={rememberMeRef} />
              <div class="my-auto px-2 text-sm font-normal">Remember Me</div>
            </div>

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

            <div class="flex justify-center py-4">
              <Show
                when={!register() && !usePassword() && countDown() > 0}
                fallback={
                  <Button type="submit" loading={loading()} class="w-36">
                    {register()
                      ? "Sign Up"
                      : usePassword()
                        ? "Sign In"
                        : "Get Link"}
                  </Button>
                }
              >
                <CountdownCircleTimer
                  duration={COUNTDOWN_CONFIG.EMAIL_LOGIN_LINK_DURATION_S}
                  initialRemainingTime={countDown()}
                  size={48}
                  strokeWidth={6}
                  colors="var(--color-blue)"
                >
                  {renderTime}
                </CountdownCircleTimer>
              </Show>

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

          <div
            class={`${
              emailSent() ? "" : "user-select opacity-0"
            } text-green flex min-h-4 justify-center text-center italic transition-opacity duration-300 ease-in-out`}
          >
            <Show when={emailSent()}>Email Sent!</Show>
          </div>

          <div class="rule-around text-center">Or</div>

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
