import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { api } from "~/lib/api";
import GitHub from "~/components/icons/GitHub";
import LinkedIn from "~/components/icons/LinkedIn";
import { getClientCookie, setClientCookie } from "~/lib/cookies.client";
import CountdownCircleTimer from "~/components/CountdownCircleTimer";
import LoadingSpinner from "~/components/LoadingSpinner";
import RevealDropDown from "~/components/RevealDropDown";
import type { UserProfile } from "~/types/user";

export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const viewer = () => searchParams.viewer ?? "default";

  const [countDown, setCountDown] = createSignal<number>(0);
  const [emailSent, setEmailSent] = createSignal<boolean>(false);
  const [error, setError] = createSignal<string>("");
  const [loading, setLoading] = createSignal<boolean>(false);
  const [user, setUser] = createSignal<UserProfile | null>(null);

  let timerIdRef: ReturnType<typeof setInterval> | null = null;

  const calcRemainder = (timer: string) => {
    const expires = new Date(timer);
    const remaining = expires.getTime() - Date.now();
    const remainingInSeconds = remaining / 1000;

    if (remainingInSeconds <= 0) {
      setCountDown(0);
      if (timerIdRef !== null) {
        clearInterval(timerIdRef);
      }
    } else {
      setCountDown(remainingInSeconds);
    }
  };

  onMount(() => {
    // Check for existing timer
    const timer = getClientCookie("contactRequestSent");
    if (timer) {
      timerIdRef = setInterval(() => calcRemainder(timer), 1000);
    }

    // Fetch user data if authenticated
    api.user.getProfile
      .query()
      .then((userData) => {
        if (userData) {
          setUser(userData);
        }
      })
      .catch(() => {
        // User not authenticated, no problem
      });

    onCleanup(() => {
      if (timerIdRef !== null) {
        clearInterval(timerIdRef);
      }
    });
  });

  const sendEmailTrigger = async (e: Event) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const message = formData.get("message") as string;

    if (name && email && message) {
      setLoading(true);
      try {
        const res = await api.misc.sendContactRequest.mutate({
          name,
          email,
          message
        });

        if (res.message === "email sent") {
          setEmailSent(true);
          setError("");
          const timer = getClientCookie("contactRequestSent");
          if (timer) {
            if (timerIdRef !== null) {
              clearInterval(timerIdRef);
            }
            timerIdRef = setInterval(() => calcRemainder(timer), 1000);
          }
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
      <div class="mx-auto px-4 py-12 md:w-3/4 md:flex-row lg:w-1/2">
        <RevealDropDown title={"Questions about Life and Lineage?"}>
          <div>
            Feel free to use the form{" "}
            {viewer() === "lineage" ? "below" : "above"}, I will respond as
            quickly as possible, however, you may find an answer to your
            question in the following.
          </div>
          <ol>
            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">1.</span> Personal Information
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
                <span class="-ml-4 pr-2">2.</span> Remote Backups
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
                <span class="-ml-4 pr-2">3.</span> Cross Device Play
              </div>
              <div class="pl-4">
                You can use the above mentioned remote-backups to save progress
                between devices/platforms.
              </div>
            </div>
            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">4.</span> Online Requirements
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
                <span class="-ml-4 pr-2">5.</span> Microtransactions
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

  const renderTime = (time: number) => {
    return (
      <div class="timer">
        <div class="value">{time.toFixed(0)}</div>
      </div>
    );
  };

  return (
    <>
      <Title>Contact | Michael Freno</Title>
      <Meta name="description" content="Contact Me" />

      <div class="flex min-h-screen w-full justify-center">
        <div class="pt-[20vh]">
          <div class="text-center text-3xl tracking-widest dark:text-white">
            Contact
          </div>
          <Show when={viewer() !== "lineage"}>
            <div class="mt-4 -mb-4 text-center text-xl tracking-widest dark:text-white">
              (for this website or any of my apps...)
            </div>
          </Show>
          <Show when={viewer() === "lineage"}>
            <LineageQuestionsDropDown />
          </Show>
          <form onSubmit={sendEmailTrigger} class="min-w-[85vw] px-4">
            <div
              class={`flex w-full flex-col justify-evenly pt-6 ${
                viewer() !== "lineage" ? "md:mt-24" : ""
              }`}
            >
              <div class="mx-auto w-full justify-evenly md:flex md:w-3/4 md:flex-row lg:w-1/2">
                <div class="input-group md:mx-4">
                  <input
                    type="text"
                    required
                    name="name"
                    value={user()?.displayName ?? ""}
                    placeholder=" "
                    class="underlinedInput w-full bg-transparent"
                  />
                  <span class="bar"></span>
                  <label class="underlinedInputLabel">Name</label>
                </div>
                <div class="input-group md:mx-4">
                  <input
                    type="email"
                    required
                    name="email"
                    value={user()?.email ?? ""}
                    placeholder=" "
                    class="underlinedInput w-full bg-transparent"
                  />
                  <span class="bar"></span>
                  <label class="underlinedInputLabel">Email</label>
                </div>
              </div>
              <div class="mx-auto w-full pt-6 md:w-3/4 md:pt-12 lg:w-1/2">
                <div class="textarea-group">
                  <textarea
                    required
                    name="message"
                    placeholder=" "
                    class="underlinedInput w-full bg-transparent"
                    rows={4}
                  />
                  <span class="bar" />
                  <label class="underlinedInputLabel">Message</label>
                </div>
              </div>
              <div class="mx-auto flex w-full justify-end pt-4 md:w-3/4 lg:w-1/2">
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
                      } flex w-36 justify-center rounded py-3 text-base font-light transition-all duration-300 ease-out`}
                    >
                      <Show when={loading()} fallback="Send Message">
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
                    colors={"#60a5fa"}
                    onComplete={() => setCountDown(0)}
                  >
                    {renderTime}
                  </CountdownCircleTimer>
                </Show>
              </div>
            </div>
          </form>
          <Show when={viewer() !== "lineage"}>
            <LineageQuestionsDropDown />
          </Show>
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
          <ul class="icons flex justify-center pt-24 pb-6">
            <li>
              <A
                href="https://github.com/MikeFreno/"
                target="_blank"
                rel="noreferrer"
                class="shaker rounded-full border-zinc-800 dark:border-zinc-300"
              >
                <span class="m-auto p-2">
                  <GitHub height={24} width={24} fill={undefined} />
                </span>
              </A>
            </li>
            <li>
              <A
                href="https://www.linkedin.com/in/michael-freno-176001256/"
                target="_blank"
                rel="noreferrer"
                class="shaker rounded-full border-zinc-800 dark:border-zinc-300"
              >
                <span class="m-auto rounded-md p-2">
                  <LinkedIn height={24} width={24} fill={undefined} />
                </span>
              </A>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
