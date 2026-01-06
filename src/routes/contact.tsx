import { createSignal, onMount, createEffect, Show } from "solid-js";
import {
  useSearchParams,
  useNavigate,
  useLocation,
  query,
  createAsync
} from "@solidjs/router";
import { A } from "@solidjs/router";
import { action, redirect } from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import { api } from "~/lib/api";
import { getClientCookie, setClientCookie } from "~/lib/cookies.client";
import CountdownCircleTimer from "~/components/CountdownCircleTimer";
import RevealDropDown from "~/components/RevealDropDown";
import Input from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { useCountdown } from "~/lib/useCountdown";
import type { UserProfile } from "~/types/user";
import { getCookie, setCookie } from "vinxi/http";
import { z } from "zod";
import { env } from "~/env/server";
import {
  fetchWithTimeout,
  checkResponse,
  fetchWithRetry,
  NetworkError,
  TimeoutError,
  APIError
} from "~/server/fetch-utils";
import {
  NETWORK_CONFIG,
  COOLDOWN_TIMERS,
  VALIDATION_CONFIG,
  COUNTDOWN_CONFIG
} from "~/config";

const getContactData = query(async () => {
  "use server";
  const contactExp = getCookie("contactRequestSent");
  let remainingTime = 0;

  if (contactExp) {
    const expires = new Date(contactExp);
    remainingTime = Math.max(0, (expires.getTime() - Date.now()) / 1000);
  }

  return { remainingTime };
}, "contact-data");

const sendContactEmail = action(async (formData: FormData) => {
  "use server";
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const message = formData.get("message") as string;

  const schema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    message: z
      .string()
      .min(1, "Message is required")
      .max(VALIDATION_CONFIG.MAX_CONTACT_MESSAGE_LENGTH, "Message too long")
  });

  try {
    schema.parse({ name, email, message });
  } catch (err: any) {
    return redirect(
      `/contact?error=${encodeURIComponent(err.errors[0]?.message || "Invalid input")}`
    );
  }

  const contactExp = getCookie("contactRequestSent");
  if (contactExp) {
    const expires = new Date(contactExp);
    const remaining = expires.getTime() - Date.now();
    if (remaining > 0) {
      return redirect(
        "/contact?error=Please wait before sending another message"
      );
    }
  }

  const apiKey = env.SENDINBLUE_KEY;
  const apiUrl = "https://api.sendinblue.com/v3/smtp/email";

  const sendinblueData = {
    sender: {
      name: "freno.me",
      email: "michael@freno.me"
    },
    to: [{ email: "michael@freno.me" }],
    htmlContent: `<html><head></head><body><div>Request Name: ${name}</div><div>Request Email: ${email}</div><div>Request Message: ${message}</div></body></html>`,
    subject: "freno.me Contact Request"
  };

  try {
    await fetchWithRetry(
      async () => {
        const response = await fetchWithTimeout(apiUrl, {
          method: "POST",
          headers: {
            accept: "application/json",
            "api-key": apiKey,
            "content-type": "application/json"
          },
          body: JSON.stringify(sendinblueData),
          timeout: NETWORK_CONFIG.EMAIL_API_TIMEOUT_MS
        });

        await checkResponse(response);
        return response;
      },
      {
        maxRetries: NETWORK_CONFIG.MAX_RETRIES,
        retryDelay: NETWORK_CONFIG.RETRY_DELAY_MS
      }
    );

    const exp = new Date(Date.now() + COOLDOWN_TIMERS.CONTACT_REQUEST_MS);
    setCookie("contactRequestSent", exp.toUTCString(), {
      expires: exp,
      path: "/"
    });

    return redirect("/contact?success=true");
  } catch (error) {
    let errorMessage =
      "Failed to send message. You can reach me at michael@freno.me";

    if (error instanceof TimeoutError) {
      errorMessage =
        "Email service timed out. Please try again or contact michael@freno.me";
    } else if (error instanceof NetworkError) {
      errorMessage =
        "Network error. Please try again or contact michael@freno.me";
    } else if (error instanceof APIError) {
      errorMessage =
        "Email service error. You can reach me at michael@freno.me";
    }

    return redirect(`/contact?error=${encodeURIComponent(errorMessage)}`);
  }
});

export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const viewer = () => searchParams.viewer ?? "default";

  // Load server data using createAsync
  const contactData = createAsync(() => getContactData(), {
    deferStream: true
  });

  const [emailSent, setEmailSent] = createSignal<boolean>(
    searchParams.success === "true"
  );
  const [error, setError] = createSignal<string>(
    searchParams.error ? decodeURIComponent(searchParams.error) : ""
  );
  const [loading, setLoading] = createSignal<boolean>(false);
  const [user, setUser] = createSignal<UserProfile | null>(null);
  const [jsEnabled, setJsEnabled] = createSignal<boolean>(false);

  const { remainingTime, startCountdown, setRemainingTime } = useCountdown();

  onMount(() => {
    setJsEnabled(true);

    api.user.getProfile
      .query()
      .then((userData) => {
        if (userData) {
          setUser(userData);
        }
      })
      .catch(() => {});
  });

  createEffect(() => {
    // Try server data first (more accurate)
    const serverData = contactData();
    if (serverData?.remainingTime && serverData.remainingTime > 0) {
      const expirationTime = new Date(
        Date.now() + serverData.remainingTime * 1000
      );
      startCountdown(expirationTime);
      return;
    }

    // Fall back to client cookie if server data not available yet
    const timer = getClientCookie("contactRequestSent");
    if (timer) {
      try {
        startCountdown(timer);
      } catch (e) {
        console.error("Failed to start countdown from cookie:", e);
      }
    }
  });

  const sendEmailTrigger = async (e: Event) => {
    if (!jsEnabled()) return;

    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const message = formData.get("message") as string;

    if (name && email && message) {
      setLoading(true);
      setError("");
      setEmailSent(false);

      try {
        const res = await api.misc.sendContactRequest.mutate({
          name,
          email,
          message
        });

        if (res.message === "email sent") {
          setEmailSent(true);
          setError("");
          (e.target as HTMLFormElement).reset();

          // Set countdown directly - cookie might not be readable immediately
          const expirationTime = new Date(
            Date.now() + COOLDOWN_TIMERS.CONTACT_REQUEST_MS
          );
          startCountdown(expirationTime);
        }
      } catch (err: any) {
        setError(err.message || "An error occurred");
        setEmailSent(false);
      }
      setLoading(false);
    }
  };

  const LineageQuestionsDropDown = () => {
    return (
      <div class="w-full py-12">
        <RevealDropDown title={"Questions about Life and Lineage?"}>
          <div>
            Feel free to use the form below, I will respond as quickly as
            possible, however, you may find an answer to your question in the
            following.
          </div>
          <ol>
            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-2 pr-2">1.</span> Personal Information
              </div>
              <div class="pl-4">
                <div class="pb-2">
                  You can find the entire privacy policy{" "}
                  <A
                    href="/privacy-policy/life-and-lineage"
                    class="text-blue underline-offset-4 hover:underline"
                  >
                    here
                  </A>
                  .
                </div>
              </div>
            </div>
            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-2 pr-2">2.</span> Remote Backups
              </div>
              <div class="pl-4">
                <em>Life and Lineage</em> uses a per-user database approach for
                its remote storage, this provides better separation of users and
                therefore privacy, and it makes requesting the removal of your
                data simpler, you can even request the database dump if you so
                choose. This isn&apos;t particularly expensive, but not free for
                n users, so use of this feature requires a purchase of an
                IAP(in-app purchase) - this can be the specific IAP for the
                remote save feature, and any other IAP will also unlock this
                feature.
              </div>
            </div>
            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-2 pr-2">3.</span> Cross Device Play
              </div>
              <div class="pl-4">
                You can use the above mentioned remote-backups to save progress
                between devices/platforms.
              </div>
            </div>
            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-2 pr-2">4.</span> Online Requirements
              </div>
              <div class="pl-4">
                Currently, the only time you need to be online is for remote
                save access. There are plans for pvp, which will require an
                internet connection, but this is not implemented at time of
                writing.
              </div>
            </div>
            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-2 pr-2">5.</span> Microtransactions
              </div>
              <div class="pl-4">
                Microtransactions are not required to play or complete the game,
                the game can be fully completed without spending any money,
                however 2 of the classes(necromancer and ranger) are pay-walled.
                Microtransactions are supported cross-platform, so no need to
                pay for each device, you simply need to login to your
                gmail/apple/email account. This would require first creating a
                character, signing in under options{">"}remote backups first.
              </div>
            </div>
          </ol>
        </RevealDropDown>
      </div>
    );
  };

  const renderTime = ({ remainingTime }: { remainingTime: number }) => {
    const time = isNaN(remainingTime) ? 0 : Math.max(0, remainingTime);
    return (
      <div class="timer">
        <div class="value">{time.toFixed(0)}</div>
      </div>
    );
  };

  return (
    <>
      <PageHead title="Contact" description="Contact Me" />

      <div class="bg-base flex min-h-screen w-full justify-center">
        <div class="w-full max-w-4xl px-4 pt-[20vh]">
          <div class="text-center text-3xl tracking-widest">Contact</div>
          <Show when={viewer() !== "lineage"}>
            <div class="mt-4 -mb-4 text-center text-xl tracking-widest">
              (for this website or any of my apps...)
            </div>
          </Show>
          <LineageQuestionsDropDown />
          <form
            onSubmit={sendEmailTrigger}
            method="post"
            action={sendContactEmail}
            class="w-full"
          >
            <div class="flex w-full flex-col justify-evenly">
              <div class="mx-auto w-full justify-evenly md:flex md:flex-row">
                <Input
                  type="text"
                  required
                  name="name"
                  value={user()?.displayName ?? ""}
                  title="Please enter your name"
                  label="Name"
                  containerClass="input-group md:mx-4"
                  class="w-full"
                />
                <Input
                  type="email"
                  required
                  name="email"
                  value={user()?.email ?? ""}
                  title="Please enter a valid email address"
                  label="Email"
                  containerClass="input-group md:mx-4"
                  class="w-full"
                />
              </div>
              <div class="mx-auto w-full pt-6 md:pt-12">
                <div class="textarea-group">
                  <textarea
                    required
                    name="message"
                    placeholder=" "
                    title="Please enter your message"
                    class="underlinedInput w-full bg-transparent"
                    rows={4}
                    maxlength={VALIDATION_CONFIG.MAX_CONTACT_MESSAGE_LENGTH}
                  />
                  <span class="bar" />
                  <label class="underlinedInputLabel">Message</label>
                </div>
              </div>
              <div class="mx-auto flex w-full justify-end pt-4">
                <Show
                  when={
                    remainingTime() > 0 ||
                    (contactData()?.remainingTime ?? 0) > 0
                  }
                  fallback={
                    <Button type="submit" loading={loading()} class="w-36">
                      Send Message
                    </Button>
                  }
                >
                  <Show
                    when={jsEnabled()}
                    fallback={
                      <div class="flex items-center justify-center text-sm text-zinc-400">
                        Please wait{" "}
                        {Math.ceil(contactData()?.remainingTime ?? 0)}s before
                        sending another message
                      </div>
                    }
                  >
                    <CountdownCircleTimer
                      duration={COUNTDOWN_CONFIG.CONTACT_FORM_DURATION_S}
                      initialRemainingTime={remainingTime()}
                      size={48}
                      strokeWidth={6}
                      colors={"#60a5fa"}
                      onComplete={() => setRemainingTime(0)}
                    >
                      {renderTime}
                    </CountdownCircleTimer>
                  </Show>
                </Show>
              </div>
            </div>
          </form>
          <div
            class={`${
              emailSent()
                ? "text-green-400"
                : error() !== ""
                  ? "text-red-400"
                  : "user-select opacity-0"
            } flex justify-center text-center italic transition-opacity duration-300 ease-in-out`}
          >
            {emailSent() ? "Email Sent!" : error()}
          </div>
        </div>
      </div>
    </>
  );
}
