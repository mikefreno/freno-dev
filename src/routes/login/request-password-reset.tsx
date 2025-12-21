import { createSignal, createEffect, onCleanup, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import CountdownCircleTimer from "~/components/CountdownCircleTimer";
import { isValidEmail } from "~/lib/validation";
import { getClientCookie } from "~/lib/cookies.client";

export default function RequestPasswordResetPage() {
  const navigate = useNavigate();

  // State management
  const [loading, setLoading] = createSignal(false);
  const [countDown, setCountDown] = createSignal(0);
  const [showSuccessMessage, setShowSuccessMessage] = createSignal(false);
  const [error, setError] = createSignal("");

  // Form refs
  let emailRef: HTMLInputElement | undefined;
  let timerInterval: number | undefined;

  // Calculate remaining time from cookie
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

  // Check for existing timer on mount
  createEffect(() => {
    const timer = getClientCookie("passwordResetRequested");
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

  // Form submission handler
  const requestPasswordResetTrigger = async (e: Event) => {
    e.preventDefault();
    setError("");
    setShowSuccessMessage(false);

    if (!emailRef) {
      setError("Please enter an email address");
      return;
    }

    const email = emailRef.value;

    // Validate email
    if (!isValidEmail(email)) {
      setError("Invalid email address");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/trpc/auth.requestPasswordReset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (response.ok && result.result?.data) {
        setShowSuccessMessage(true);
        setError("");

        // Start countdown timer
        const timer = getClientCookie("passwordResetRequested");
        if (timer) {
          if (timerInterval) {
            clearInterval(timerInterval);
          }
          timerInterval = setInterval(() => {
            calcRemainder(timer);
          }, 1000) as unknown as number;
        }
      } else {
        const errorMsg = result.error?.message || "Failed to send reset email";
        if (errorMsg.includes("countdown not expired")) {
          setError("Please wait before requesting another reset email");
        } else {
          setError(errorMsg);
        }
      }
    } catch (err) {
      console.error("Password reset request error:", err);
      setError("An error occurred. Please try again.");
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

  return (
    <>
      <Title>Request Password Reset | Michael Freno</Title>
      <Meta
        name="description"
        content="Request a password reset link to regain access to your account. Enter your email to receive reset instructions."
      />
      <div class="pt-24 text-center text-xl font-semibold">
        Password Reset Request
      </div>

      <form
        onSubmit={(e) => requestPasswordResetTrigger(e)}
        class="mt-4 flex w-full justify-center"
      >
        <div class="flex flex-col justify-center">
          {/* Email Input */}
          <div class="input-group mx-4">
            <input
              ref={emailRef}
              name="email"
              type="email"
              required
              disabled={loading()}
              placeholder=" "
              class="underlinedInput w-full bg-transparent"
            />
            <span class="bar"></span>
            <label class="underlinedInputLabel">Enter Email</label>
          </div>

          {/* Countdown Timer or Submit Button */}
          <Show
            when={countDown() > 0}
            fallback={
              <button
                type="submit"
                disabled={loading()}
                class={`${
                  loading()
                    ? "bg-zinc-400"
                    : "bg-blue hover:brightness-125 active:scale-90"
                } my-6 flex justify-center rounded px-4 py-2 font-medium text-white transition-all duration-300 ease-out`}
              >
                {loading() ? "Sending..." : "Request Password Reset"}
              </button>
            }
          >
            <div class="mx-auto pt-4">
              <CountdownCircleTimer
                isPlaying={true}
                duration={300}
                initialRemainingTime={countDown()}
                size={48}
                strokeWidth={6}
                colors="#60a5fa"
                onComplete={() => false}
              >
                {renderTime}
              </CountdownCircleTimer>
            </div>
          </Show>
        </div>
      </form>

      {/* Success Message */}
      <div
        class={`${
          showSuccessMessage() ? "" : "opacity-0 select-none"
        } text-green flex justify-center italic transition-opacity duration-300 ease-in-out`}
      >
        If email exists, you will receive an email shortly!
      </div>

      {/* Error Message */}
      <Show when={error()}>
        <div class="mt-4 flex justify-center">
          <div class="text-red text-sm italic">{error()}</div>
        </div>
      </Show>

      {/* Back to Login Link */}
      <div class="mt-6 flex justify-center">
        <A
          href="/login"
          class="text-blue underline underline-offset-4 transition-colors hover:brightness-125"
        >
          Back to Login
        </A>
      </div>
    </>
  );
}
