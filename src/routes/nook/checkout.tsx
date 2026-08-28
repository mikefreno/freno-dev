import { createSignal, onMount } from "solid-js";
import { PageHead } from "~/components/PageHead";
import SubdomainHeader from "~/components/SubdomainHeader";
import Button from "~/components/ui/Button";
import { env } from "~/env/client";
import { useSite } from "~/context/SiteContext";
import { useDarkMode } from "~/context/darkMode";

export default function NookCheckout() {
  const site = useSite();
  const { isDark } = useDarkMode();
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [turnstileToken, setTurnstileToken] = createSignal("");

  const brandColor = () =>
    isDark() ? (site().brandColorDark ?? site().brandColor) : site().brandColor;

  onMount(() => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const container = document.getElementById("turnstile-widget-nook");
      if (container && (window as any).turnstile) {
        (window as any).turnstile.render(container, {
          sitekey: env.VITE_TURNSTILE_SITE_KEY,
          theme: isDark() ? "dark" : "light",
          callback: (token: string) => setTurnstileToken(token),
          "expired-callback": () => setTurnstileToken("")
        });
      }
    };
    document.head.appendChild(script);
  });

  const buy = async () => {
    if (loading()) return;
    if (!turnstileToken()) {
      setError("Complete the security check to continue.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/the-nook/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ turnstileToken: turnstileToken() })
      });
      const data = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? "Unable to start checkout. Please try again.");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Unable to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHead
        title="Checkout"
        description="Buy a The Nook license — $10 beta price (33% off) for up to 3 devices."
      />
      <SubdomainHeader />

      <div class="bg-base mx-auto max-w-lg px-4 py-16">
        <div class="border-overlay0 bg-surface0 rounded-xl border p-8 shadow-2xl">
          <div class="mb-2 flex items-end gap-3">
            <div class="text-text text-4xl font-extrabold">
              $10<span class="text-subtext0 text-base font-normal"> one-time</span>
            </div>
            <div class="text-subtext0 mb-1 text-2xl font-medium line-through">
              $15
            </div>
          </div>
          <p class="mb-6 text-sm font-medium">
            <span
              class="border-overlay0 bg-surface0 text-subtext0 inline-block rounded-full border px-3 py-1 text-xs font-semibold tracking-wide"
            >
              Beta pricing — 33% off
            </span>
          </p>
          <ul class="text-subtext0 mb-6 space-y-2 text-sm">
            <li>• Activate on up to 3 of your own Macs</li>
            <li>• No subscription, ever</li>
            <li>• Key delivered by email + on this page</li>
          </ul>

          <div id="turnstile-widget-nook" class="mb-4" />

          <Button
            variant="download"
            size="lg"
            color={brandColor()}
            fullWidth
            loading={loading()}
            onClick={buy}
          >
            Pay $10
          </Button>

          {error() && (
            <p class="text-red mt-4 text-sm">{error()}</p>
          )}
          <p class="text-subtext1 mt-4 text-xs">
            Billed once through Stripe. License delivered immediately after payment.
          </p>
        </div>
      </div>
    </>
  );
}
