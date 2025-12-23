import { createSignal, createEffect, onCleanup, Show } from "solid-js";
import CountdownCircleTimer from "~/components/CountdownCircleTimer";
import LoadingSpinner from "~/components/LoadingSpinner";
import { getClientCookie } from "~/lib/cookies.client";

export default function DeletionForm() {
  const [countDown, setCountDown] = createSignal(0);
  const [emailSent, setEmailSent] = createSignal(false);
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  // Form ref
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

  createEffect(() => {
    const timer = getClientCookie("deletionRequestSent");
    if (timer) {
      timerInterval = setInterval(
        () => calcRemainder(timer),
        1000
      ) as unknown as number;
      onCleanup(() => {
        if (timerInterval) {
          clearInterval(timerInterval);
        }
      });
    }
  });

  const sendEmailTrigger = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setEmailSent(false);

    if (!emailRef) {
      setError("Please enter your email");
      setLoading(false);
      return;
    }

    const email = emailRef.value;

    try {
      const response = await fetch("/api/trpc/misc.sendDeletionRequestEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (response.ok && result.result?.data?.message === "request sent") {
        setEmailSent(true);
        const timer = getClientCookie("deletionRequestSent");
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
          result.error?.message || "Failed to send deletion request";
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error("Deletion request error:", err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Countdown timer render function
  const renderTime = ({ remainingTime }: { remainingTime: number }) => {
    return (
      <div class="timer">
        <div class="value">{remainingTime.toFixed(0)}</div>
      </div>
    );
  };

  return (
    <div class="flex min-h-screen w-full justify-center">
      <div class="pt-[5vh]">
        <div class="text-center text-3xl tracking-widest dark:text-white">
          Deletion Form
        </div>
        <form onSubmit={sendEmailTrigger} class="min-w-[85vw]">
          <div class="flex w-full flex-col justify-evenly pt-6 md:mt-24">
            <div class="mx-auto w-full justify-evenly md:flex md:w-3/4 md:flex-row lg:w-1/2">
              <div class="input-group md:mx-4">
                <input
                  type="email"
                  required
                  ref={emailRef}
                  placeholder=" "
                  class="underlinedInput w-full bg-transparent"
                />
                <span class="bar"></span>
                <label class="underlinedInputLabel">Email</label>
              </div>
            </div>
            <div class="mx-auto pt-4">
              <Show
                when={countDown() > 0}
                fallback={
                  <button
                    type="submit"
                    disabled={loading()}
                    class={`${
                      loading()
                        ? "bg-lavender"
                        : "bg-maroon hover:brightness-125 active:scale-90"
                    } shadow-maroon flex w-36 justify-center rounded py-3 font-light text-white shadow-lg transition-all duration-300 ease-out`}
                  >
                    <Show when={loading()} fallback="Send Deletion Request">
                      <LoadingSpinner height={24} width={24} />
                    </Show>
                  </button>
                }
              >
                <CountdownCircleTimer
                  duration={60}
                  initialRemainingTime={countDown()}
                  size={48}
                  strokeWidth={6}
                  colors="#60a5fa"
                >
                  {renderTime}
                </CountdownCircleTimer>
              </Show>
            </div>
          </div>
        </form>
        <div
          class={`${
            emailSent()
              ? "text-green"
              : error() !== ""
                ? "text-red"
                : "opacity-0 select-none"
          } mt-4 flex justify-center text-center italic transition-opacity duration-300 ease-in-out`}
        >
          <Show when={emailSent()} fallback={error()}>
            Request Sent!
          </Show>
        </div>
      </div>
    </div>
  );
}
