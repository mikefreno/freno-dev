import { createSignal, createEffect, onCleanup, onMount, Show } from "solid-js";
import {
  A,
  useNavigate,
  useSearchParams,
  redirect,
  query,
  createAsync
} from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import { revalidateAuth } from "~/lib/auth-query";
import { getEvent, getCookie } from "vinxi/http";
import GoogleLogo from "~/components/icons/GoogleLogo";
import GitHub from "~/components/icons/GitHub";
import CountdownCircleTimer from "~/components/CountdownCircleTimer";
import { isValidEmail, validatePassword } from "~/lib/validation";
import { getClientCookie } from "~/lib/cookies.client";
import { env } from "~/env/client";
import {
  VALIDATION_CONFIG,
  COUNTDOWN_CONFIG,
  COOLDOWN_TIMERS,
  AUTH_CONFIG
} from "~/config";
import Input from "~/components/ui/Input";
import PasswordInput from "~/components/ui/PasswordInput";
import { Button } from "~/components/ui/Button";
import { useCountdown } from "~/lib/useCountdown";

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

const getLoginData = query(async () => {
  "use server";
  const emailLinkExp = getCookie("emailLoginLinkRequested");
  let remainingTime = 0;

  if (emailLinkExp) {
    const expires = new Date(emailLinkExp);
    remainingTime = Math.max(0, (expires.getTime() - Date.now()) / 1000);
  }

  return { remainingTime };
}, "login-data");

export const route = {
  load: () => checkAuth()
};

// Helper to convert expiry string to human-readable format
function expiryToHuman(expiry: string): string {
  const value = parseInt(expiry);
  if (expiry.endsWith("m")) {
    return value === 1 ? "1 minute" : `${value} minutes`;
  } else if (expiry.endsWith("h")) {
    return value === 1 ? "1 hour" : `${value} hours`;
  } else if (expiry.endsWith("d")) {
    return value === 1 ? "1 day" : `${value} days`;
  }
  return expiry;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const register = () => searchParams.mode === "register";
  const usePassword = () => searchParams.auth === "password";

  // Load server data using createAsync
  const loginData = createAsync(() => getLoginData(), {
    deferStream: true
  });

  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [emailSent, setEmailSent] = createSignal(false);
  const [loginCode, setLoginCode] = createSignal("");
  const [codeError, setCodeError] = createSignal("");
  const [codeLoading, setCodeLoading] = createSignal(false);
  const [showPasswordError, setShowPasswordError] = createSignal(false);
  const [showPasswordSuccess, setShowPasswordSuccess] = createSignal(false);
  const [passwordsMatch, setPasswordsMatch] = createSignal(false);
  const [password, setPassword] = createSignal("");
  const [passwordConf, setPasswordConf] = createSignal("");
  const [jsEnabled, setJsEnabled] = createSignal(false);

  let emailRef: HTMLInputElement | undefined;
  let passwordRef: HTMLInputElement | undefined;
  let passwordConfRef: HTMLInputElement | undefined;
  let rememberMeRef: HTMLInputElement | undefined;

  const googleClientId = env.VITE_GOOGLE_CLIENT_ID;
  const githubClientId = env.VITE_GITHUB_CLIENT_ID;
  const domain = env.VITE_DOMAIN || "https://www.freno.me";

  const { remainingTime, startCountdown, setRemainingTime } = useCountdown();

  onMount(() => {
    setJsEnabled(true);
  });

  createEffect(() => {
    // Try server data first (more accurate)
    const serverData = loginData();
    if (serverData?.remainingTime && serverData.remainingTime > 0) {
      const expirationTime = new Date(
        Date.now() + serverData.remainingTime * 1000
      );
      startCountdown(expirationTime);
      return;
    }

    // Fall back to client cookie if server data not available yet
    const timer = getClientCookie("emailLoginLinkRequested");
    if (timer) {
      try {
        startCountdown(timer);
      } catch (e) {
        console.error("Failed to start countdown from cookie:", e);
      }
    }
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
          revalidateAuth(); // Refresh auth state globally
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

          // Set countdown directly - cookie might not be readable immediately
          const expirationTime = new Date(
            Date.now() + COOLDOWN_TIMERS.EMAIL_LOGIN_LINK_MS
          );
          startCountdown(expirationTime);
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

            // Start the countdown timer when rate limited
            const timer = getClientCookie("emailLoginLinkRequested");
            if (timer) {
              try {
                startCountdown(timer);
              } catch (e) {
                console.error("Failed to start countdown from cookie:", e);
              }
            }
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
    const time = isNaN(remainingTime) ? 0 : Math.max(0, remainingTime);
    return (
      <div class="timer">
        <div class="value">{time.toFixed(0)}</div>
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

  const handleCodeSubmit = async (e: Event) => {
    e.preventDefault();
    setCodeLoading(true);
    setCodeError("");

    if (!emailRef || !loginCode() || loginCode().length !== 6) {
      setCodeError("Please enter a valid 6-digit code");
      setCodeLoading(false);
      return;
    }

    const email = emailRef.value;
    const rememberMe = rememberMeRef?.checked || false;

    try {
      const response = await fetch("/api/trpc/auth.emailCodeLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: loginCode(), rememberMe })
      });

      const result = await response.json();

      if (response.ok && result.result?.data?.success) {
        revalidateAuth();
        navigate("/account", { replace: true });
      } else {
        const errorMsg =
          result.error?.message ||
          result.result?.data?.message ||
          "Invalid code";
        setCodeError(errorMsg);
      }
    } catch (err: any) {
      console.error("Code login error:", err);
      setCodeError(err.message || "An error occurred");
    } finally {
      setCodeLoading(false);
    }
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
            {/* Code Input Section */}
            <Show when={emailSent() && !register() && !usePassword()}>
              <div class="bg-surface0 text-text mx-auto mt-6 w-full max-w-md rounded-lg border p-6">
                <h3 class="mb-2 text-center text-lg font-semibold">
                  Enter Your Code
                </h3>
                <p class="text-surface2 mb-2 text-center text-sm">
                  Check your email for a 6-digit code
                </p>
                <p class="text-surface2 mb-4 text-center text-xs italic">
                  Code expires in{" "}
                  {expiryToHuman(AUTH_CONFIG.EMAIL_LOGIN_LINK_EXPIRY)}
                </p>

                <form onSubmit={handleCodeSubmit} class="flex flex-col gap-4">
                  <div>
                    <input
                      type="text"
                      value={loginCode()}
                      onInput={(e) =>
                        setLoginCode(
                          e.currentTarget.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      placeholder="000000"
                      maxLength={6}
                      class="text-blue mx-auto block w-48 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-center text-2xl font-bold tracking-widest dark:border-zinc-600 dark:bg-zinc-900"
                      autocomplete="off"
                    />
                  </div>

                  <Show when={codeError()}>
                    <div class="text-red text-center text-sm">
                      {codeError()}
                    </div>
                  </Show>

                  <Button
                    type="submit"
                    loading={codeLoading()}
                    disabled={loginCode().length !== 6}
                    class="mx-auto w-full"
                  >
                    Verify Code
                  </Button>
                </form>
              </div>
            </Show>
            <div class="flex justify-center py-4">
              <Show
                when={
                  !register() &&
                  !usePassword() &&
                  (remainingTime() > 0 || (loginData()?.remainingTime ?? 0) > 0)
                }
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
                <Show
                  when={jsEnabled()}
                  fallback={
                    <div class="flex items-center justify-center text-sm text-zinc-400">
                      Please wait {Math.ceil(loginData()?.remainingTime ?? 0)}s
                      before requesting another link
                    </div>
                  }
                >
                  <CountdownCircleTimer
                    duration={COUNTDOWN_CONFIG.EMAIL_LOGIN_LINK_DURATION_S}
                    initialRemainingTime={remainingTime()}
                    size={48}
                    strokeWidth={6}
                    onComplete={() => setRemainingTime(0)}
                  >
                    {renderTime}
                  </CountdownCircleTimer>
                </Show>
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
