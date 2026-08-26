import { PageHead } from "~/components/PageHead";
import SubdomainHeader from "~/components/SubdomainHeader";
import Button from "~/components/ui/Button";
import { useDarkMode } from "~/context/darkMode";
import { useSite } from "~/context/SiteContext";

const NOOK_DOWNLOAD_URL = "https://freno.me/api/downloads/TheNook-0.2.0.zip";

const FEATURES = [
  {
    title: "Unified device control",
    body: "Monitor and control the hardware and services behind your Mac from one fast, native panel."
  },
  {
    title: "Fan & thermal insight",
    body: "Read and control system fans, watch temperatures, and keep performance predictable under load."
  },
  {
    title: "Private by design",
    body: "Runs fully on your machine with no mandatory accounts. Your hardware data never leaves the device."
  },
  {
    title: "One-time license",
    body: "Pay once, activate on up to three of your own Macs. No subscriptions, no forced renewals."
  }
] as const;

export default function NookLanding() {
  const site = useSite();
  const { isDark } = useDarkMode();
  const brandColor = () =>
    isDark() ? (site().brandColorDark ?? site().brandColor) : site().brandColor;

  return (
    <>
      <PageHead
        title="Home"
        description="The Nook — a native macOS utility for hardware control, fan and thermal insight, and quiet system services."
        ogImage="/nook/og-default.png"
        ogTitle="The Nook — native macOS hardware control"
        ogDescription="A one-time-purchase macOS app for fan control, thermal insight, and quiet system services."
      />

      <SubdomainHeader />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div class="relative flex min-h-screen flex-col overflow-hidden">
        <div
          class="fixed inset-0 z-0"
          style={{
            background: isDark()
              ? "radial-gradient(ellipse at top, #241a38 0%, #0b0b10 70%)"
              : "radial-gradient(ellipse at top, #efe9ff 0%, #f5f5f5 70%)"
          }}
        />
        <div class="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-24 text-center">
          <div class="text-text/90 mb-6 rounded-2xl px-5 py-3 text-sm font-semibold tracking-wide backdrop-blur-sm"
            style={{ border: "1px solid var(--color-overlay0)", background: "var(--color-surface0)" }}>
            The Nook
          </div>
          <h1 class="text-text mb-4 text-5xl font-bold tracking-tight">
            Your Mac, under your control
          </h1>
          <p class="text-subtext0 mb-2 max-w-xl text-xl">
            Fan control, thermal insight, and quiet system services — native macOS, one-time license.
          </p>
          <p class="text-subtext1 mb-8 text-sm">
            macOS 14+ · 14-day free trial · 3 devices
          </p>

          <div class="flex flex-col items-center gap-4 sm:flex-row sm:space-x-4">
            <Button
              variant="download"
              size="lg"
              color={brandColor()}
              onClick={() => (window.location.href = NOOK_DOWNLOAD_URL)}
            >
              Download trial
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => (window.location.href = "/checkout")}
            >
              Buy
            </Button>
          </div>
          <p class="text-subtext1 mt-3 text-xs">
            $10 one-time · 3 devices · 14-day free trial
          </p>
        </div>
      </div>

      {/* ── Feature highlights ───────────────────────────────────────── */}
      <section class="bg-base relative z-20 px-4 py-20 md:px-8">
        <div class="mx-auto max-w-4xl">
          <h2 class="text-text mb-12 text-center text-3xl font-bold">
            Quiet power, right where it belongs
          </h2>
          <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-2">
            {FEATURES.map((feature) => (
              <div class="border-overlay0 bg-surface0 rounded-lg border p-6">
                <h3 class="text-text mb-2 text-xl font-semibold">
                  {feature.title}
                </h3>
                <p class="text-subtext0 leading-relaxed">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section class="bg-surface0 relative z-20 px-4 py-20 md:px-8">
        <div class="mx-auto max-w-4xl text-center">
          <h2 class="text-text mb-4 text-3xl font-bold">
            Try it free for 14 days
          </h2>
          <p class="text-subtext0 mx-auto mb-10 max-w-2xl leading-relaxed">
            Watch temperatures, take control of your fans, and keep background
            services quiet. When the trial ends, unlock everything with a
            single one-time payment — no subscription, ever.
          </p>
          <div class="flex flex-col items-center justify-center gap-4 sm:flex-row sm:space-x-4">
            <Button
              variant="download"
              size="lg"
              color={brandColor()}
              onClick={() => (window.location.href = NOOK_DOWNLOAD_URL)}
            >
              Download trial
            </Button>
            <a
              class="text-subtext1 my-auto text-sm underline decoration-dotted hover:opacity-80"
              href="/checkout"
            >
              Buy a license → $10
            </a>
          </div>
          <p class="text-subtext1 mt-6 text-xs">
            One license covers up to 3 of your own Macs.
          </p>
        </div>
      </section>
    </>
  );
}
