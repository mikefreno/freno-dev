import { createSignal, Show, onMount } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import SubdomainHeader from "~/components/SubdomainHeader";
import Button from "~/components/ui/Button";
import { useSite } from "~/context/SiteContext";
import { useDarkMode } from "~/context/darkMode";

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 8;

export default function NookSuccess() {
  const site = useSite();
  const { isDark } = useDarkMode();
  const [searchParams] = useSearchParams();
  const sessionId = () => (searchParams.session_id as string | undefined) ?? "";

  const brandColor = () =>
    isDark() ? (site().brandColorDark ?? site().brandColor) : site().brandColor;

  const [key, setKey] = createSignal<string | null>(null);
  const [failed, setFailed] = createSignal(false);
  const [copied, setCopied] = createSignal(false);

  const copyKey = async () => {
    const value = key();
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  onMount(async () => {
    if (!sessionId()) {
      setFailed(true);
      return;
    }
    for (let i = 0; i < MAX_POLLS; i++) {
      try {
        const res = await fetch(
          `/api/the-nook/by-session?session_id=${encodeURIComponent(sessionId())}`
        );
        if (res.ok) {
          const data = (await res.json()) as { key: string };
          setKey(data.key);
          return;
        }
      } catch {
        // transient — keep polling
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    setFailed(true);
  });

  return (
    <>
      <PageHead title="Order complete" description="Your license key." />
      <SubdomainHeader />

      <div class="bg-base mx-auto max-w-xl px-4 py-16">
        <div class="border-overlay0 bg-surface0 rounded-xl border p-8 shadow-2xl">
          <Show
            when={key()}
            fallback={
              <Show
                when={failed()}
                fallback={
                  <div>
                    <h1 class="text-text mb-2 text-2xl font-bold">
                      Confirming your order…
                    </h1>
                    <p class="text-subtext0 text-sm">
                      Checking payment and preparing your license key.
                    </p>
                  </div>
                }
              >
                <div>
                  <h1 class="text-text mb-2 text-2xl font-bold">Thank you</h1>
                  <p class="text-subtext0 text-sm">
                    Check your email for your license key.
                  </p>
                </div>
              </Show>
            }
          >
            <h1 class="text-text mb-2 text-2xl font-bold">
              Thanks for buying The Nook
            </h1>
            <p class="text-subtext0 mb-6 text-sm">
              Here is your license key. Open The Nook, go to Settings, and enter
              it to activate.
            </p>

            <div class="border-overlay0 bg-base mb-4 flex items-center justify-between gap-3 rounded-lg border p-4">
              <code class="text-text text-sm break-all">{key()}</code>
            </div>

            <Button
              variant="download"
              size="md"
              color={brandColor()}
              onClick={copyKey}
            >
              {copied() ? "Copied" : "Copy key"}
            </Button>

            <p class="text-subtext1 mt-4 text-xs">
              We also emailed this key to you. You can activate up to 3 devices.
            </p>
          </Show>
        </div>
      </div>
    </>
  );
}
