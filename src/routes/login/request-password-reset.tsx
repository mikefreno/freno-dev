import { createSignal, createEffect, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import CountdownCircleTimer from "~/components/CountdownCircleTimer";
import { isValidEmail } from "~/lib/validation";
import { getClientCookie } from "~/lib/cookies.client";
import { COUNTDOWN_CONFIG } from "~/config";
import Input from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import FormFeedback from "~/components/ui/FormFeedback";
import { useCountdown } from "~/lib/useCountdown";

export default function RequestPasswordResetPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = createSignal(false);
  const [showSuccessMessage, setShowSuccessMessage] = createSignal(false);
  const [error, setError] = createSignal("");

  const { remainingTime, startCountdown } = useCountdown();

  let emailRef: HTMLInputElement | undefined;

  createEffect(() => {
    const timer = getClientCookie("passwordResetRequested");
    if (timer) {
      startCountdown(timer);
    }
  });

  const requestPasswordResetTrigger = async (e: Event) => {
    e.preventDefault();
    setError("");
    setShowSuccessMessage(false);

    if (!emailRef) {
      setError("Please enter an email address");
      return;
    }

    const email = emailRef.value;

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

        const timer = getClientCookie("passwordResetRequested");
        if (timer) {
          startCountdown(timer);
        }
      } else {
        const errorMsg = result.error?.message || "Failed to send reset email";
        const errorCode = result.error?.data?.code;

        if (
          errorCode === "TOO_MANY_REQUESTS" ||
          errorMsg.includes("Too many attempts")
        ) {
          setError(errorMsg);
        } else if (errorMsg.includes("countdown not expired")) {
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
      <PageHead
        title="Request Password Reset"
        description="Request a password reset link to regain access to your account. Enter your email to receive reset instructions."
      />
      <div class="pt-24 text-center text-xl font-semibold">
        Password Reset Request
      </div>

      <form
        onSubmit={(e) => requestPasswordResetTrigger(e)}
        class="mt-4 flex w-full justify-center"
      >
        <div class="flex flex-col justify-center">
          <Input
            ref={emailRef}
            name="email"
            type="email"
            required
            disabled={loading()}
            title="Please enter a valid email address"
            label="Enter Email"
            containerClass="input-group mx-4"
            class="w-full"
          />

          <Show
            when={remainingTime() > 0}
            fallback={
              <Button type="submit" loading={loading()} class="my-6">
                Request Password Reset
              </Button>
            }
          >
            <div class="mx-auto pt-4">
              <CountdownCircleTimer
                isPlaying={true}
                duration={COUNTDOWN_CONFIG.PASSWORD_RESET_DURATION_S}
                initialRemainingTime={remainingTime()}
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

      <FormFeedback
        type="success"
        message="If email exists, you will receive an email shortly!"
        show={showSuccessMessage()}
      />

      <FormFeedback
        type="error"
        message={error()}
        show={error() !== ""}
        class="mt-4"
      />

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
