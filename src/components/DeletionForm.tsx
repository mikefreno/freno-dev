import { createSignal, createEffect, onCleanup, Show } from "solid-js";
import CountdownCircleTimer from "~/components/CountdownCircleTimer";
import { Spinner } from "~/components/Spinner";
import { getClientCookie } from "~/lib/cookies.client";

/**
 * Product discriminator forwarded to the generalized
 * `misc.sendDeletionRequestEmail` mutation so the email copy + cooldown
 * cookie are product-appropriate (task 11).
 */
export type DeletionProduct = "lineage" | "nessa";

export interface DeletionFormProps {
  /**
   * Product whose account is being deleted. Determines the email branding
   * AND the cooldown cookie name on the server. Defaults to `"lineage"`
   * (the original / legacy flow) for backward compatibility.
   */
  product?: DeletionProduct;
  /**
   * Cooldown cookie name read on mount + written by the server response
   * (the mutation sets its own cookie; this is only for the client-side
   * countdown). Defaults to the legacy `deletionRequestSent` name so an
   * in-flight Lineage cooldown survives the legacy redirect.
   */
  cookieName?: string;
}

export default function DeletionForm(props: DeletionFormProps = {}) {
  const product = () => props.product ?? "lineage";
  const cookieName = () => props.cookieName ?? "deletionRequestSent";
  const [countDown, setCountDown] = createSignal(0);
  const [emailSent, setEmailSent] = createSignal(false);
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  let emailRef: HTMLInputElement | undefined;
  let timerInterval: number | undefined;

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
    const timer = getClientCookie(cookieName());
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
        body: JSON.stringify({ email, product: product() })
      });

      const result = await response.json();

      if (response.ok && result.result?.data?.message === "request sent") {
        setEmailSent(true);
        const timer = getClientCookie(cookieName());
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
                      <Spinner size={24} />
                    </Show>
                  </button>
                }
              >
                <CountdownCircleTimer
                  duration={60}
                  initialRemainingTime={countDown()}
                  size={48}
                  strokeWidth={6}
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
