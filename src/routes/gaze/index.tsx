import { createSignal } from "solid-js";
import { PageHead } from "~/components/PageHead";
import DownloadOnAppStoreDark from "~/components/icons/DownloadOnAppStoreDark";
import Button from "~/components/ui/Button";
import { useDarkMode } from "~/context/darkMode";
import { downloadAsset } from "~/lib/download-asset";

const GAZE_APP_STORE_URL =
  "https://apps.apple.com/us/app/gaze/id6757759498";
const GAZE_MIN_MACOS = "13.0";

const FEATURES = [
  {
    title: "Take regular breaks",
    body: "Gentle, dismissable reminders nudge you to step away from the screen so you can rest and reset."
  },
  {
    title: "Eye health reminders",
    body: "Follow the 20-20-20 rule — every 20 minutes, look at something 20 feet away for 20 seconds."
  },
  {
    title: "Posture reminders",
    body: "Periodic check-ins help you catch slouching before it becomes a habit."
  },
  {
    title: "Lives in your menu bar",
    body: "A lightweight menu bar app — no dock icon, no intrusive overlays. Just a quiet, reliable companion."
  }
] as const;

export default function GazeLanding() {
  const { isDark } = useDarkMode();
  const [loading, setLoading] = createSignal(false);

  const handleDownload = () => {
    if (loading()) return;
    setLoading(true);
    import("~/lib/api")
      .then(({ api }) =>
        downloadAsset({
          api,
          assetName: "gaze",
          onError: (error) => {
            console.error("Gaze download error:", error);
            alert("Failed to initiate download. Please try again.");
          }
        })
      )
      .finally(() => setLoading(false));
  };

  return (
    <>
      <PageHead
        title="Eye & posture health reminder for macOS"
        description="Gaze is a macOS menu bar app for eye and posture health — gentle reminders to take breaks, rest your eyes, and sit up straight. Download Gaze for macOS."
        ogImage="/look-away.png"
        ogTitle="Gaze — Eye and posture health reminder for macOS"
        ogDescription="A macOS menu bar app that helps you remember to take breaks and rest your eyes."
      />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div class="relative flex min-h-screen flex-col">
        <div class="fixed inset-0 z-0 overflow-hidden brightness-75">
          <img
            src="/look-away.png"
            alt="Look away — Gaze hero background"
            class="h-full w-full select-none object-cover"
            style={{ "pointer-events": "none" }}
          />
        </div>

        <div class="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-24 text-center text-white backdrop-blur-sm">
          <img
            src={
              isDark()
                ? "/Gaze Exports/Gaze-iOS-Dark-1024x1024@1x.png"
                : "/Gaze Exports/Gaze-iOS-Default-1024x1024@1x.png"
            }
            alt="Gaze App Icon"
            height={128}
            width={128}
            class="h-32 w-32 rounded-[22%] object-cover object-center shadow-2xl"
          />
          <h1 class="py-4 text-5xl font-bold tracking-tight">Gaze</h1>
          <p class="mb-2 max-w-xl text-xl text-white/90">
            Eye and posture health reminder for macOS
          </p>
          <p class="mb-8 text-sm text-white/60">
            macOS {GAZE_MIN_MACOS}+ · menu bar app
          </p>

          <div class="flex flex-col items-center gap-4 sm:flex-row sm:space-x-4">
            <Button
              variant="download"
              size="lg"
              loading={loading()}
              onClick={handleDownload}
            >
              download.dmg
            </Button>
            <a
              class="my-auto transition-all duration-200 ease-out hover:scale-105 active:scale-95"
              href={GAZE_APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <DownloadOnAppStoreDark size={50} />
            </a>
          </div>
          <p class="mt-3 text-xs text-white/50">
            Direct download serves the latest signed macOS build.
          </p>
        </div>
      </div>

      {/* ── Feature highlights ───────────────────────────────────────── */}
      <section class="bg-base relative z-20 px-4 py-20 md:px-8">
        <div class="mx-auto max-w-4xl">
          <h2 class="text-text mb-12 text-center text-3xl font-bold">
            Small reminders, healthier habits
          </h2>
          <div class="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                class="border-overlay0 bg-surface0 rounded-lg border p-6"
              >
                <h3 class="text-text mb-2 text-xl font-semibold">
                  {feature.title}
                </h3>
                <p class="text-subtext0 leading-relaxed">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── App preview / CTA ──────────────────────────────────────── */}
      <section class="bg-surface0 relative z-20 px-4 py-20 md:px-8">
        <div class="mx-auto max-w-4xl text-center">
          <h2 class="text-text mb-4 text-3xl font-bold">
            A quieter way to look after yourself
          </h2>
          <p class="text-subtext0 mx-auto mb-10 max-w-2xl leading-relaxed">
            Gaze runs quietly in your menu bar, surfacing a gentle, dismissable
            reminder when it's time to look away, stretch, or reset your
            posture. No accounts, no clunky dashboards — just a steady rhythm
            that helps you build better habits.
          </p>
          <div class="flex flex-col items-center justify-center gap-4 sm:flex-row sm:space-x-4">
            <Button
              variant="download"
              size="lg"
              loading={loading()}
              onClick={handleDownload}
            >
              download.dmg
            </Button>
            <a
              class="my-auto transition-all duration-200 ease-out hover:scale-105 active:scale-95"
              href={GAZE_APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <DownloadOnAppStoreDark size={50} />
            </a>
          </div>
          <p class="text-subtext1 mt-6 text-xs">
            Requires macOS {GAZE_MIN_MACOS} or later.
          </p>
        </div>
      </section>
    </>
  );
}
