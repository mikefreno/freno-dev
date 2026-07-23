/**
 * InputHalo landing page — net-new marketing page for inputhalo.freno.me
 * (task 06).
 *
 * Routes:
 *  - vercel.json rewrites `inputhalo.freno.me/(.*)` → `/inputhalo/$1`, so
 *    this `src/routes/inputhalo/index.tsx` serves the subdomain root.
 *
 * Sections:
 *  - Hero: app icon (dark/light variant via `useDarkMode`), title, tagline
 *  - Feature highlights (real-time tracking, menu bar, customizable, native)
 *  - Download: inline macOS DMG button (tRPC → signed S3 URL) + App Store link
 *
 * The download orchestration lives in the pure, unit-tested
 * `./download.ts` helper — this component is a thin wrapper that supplies the
 * real tRPC client + `window.location.href` redirect and the loading/error
 * UX. The pattern mirrors `downloads.tsx` and the site-aware PageHead /
 * nav-config split.
 */
import { PageHead } from "~/components/PageHead";
import Button from "~/components/ui/Button";
import DownloadOnAppStore from "~/components/icons/DownloadOnAppStore";
import { glitchText } from "~/lib/client-utils";
import { useDarkMode } from "~/context/darkMode";
import { A } from "@solidjs/router";
import { createSignal, onMount, onCleanup } from "solid-js";
import { api } from "~/lib/api";
import {
  INPUTHALO_APP_STORE_URL,
  INPUTHALO_ICON_DARK,
  INPUTHALO_ICON_DEFAULT,
  INPUTHALO_MIN_SYSTEM_VERSION,
  performInputHaloDownload
} from "./download";

export default function InputHaloLanding() {
  const { isDark } = useDarkMode();
  const [titleText, setTitleText] = createSignal("InputHalo");
  const [loading, setLoading] = createSignal(false);

  const download = () => {
    if (loading()) return;
    setLoading(true);
    performInputHaloDownload(
      (input) => api.downloads.getDownloadUrl.query(input),
      (url) => {
        window.location.href = url;
      },
      () => {
        alert("Failed to initiate download. Please try again.");
      }
    ).finally(() => setLoading(false));
  };

  onMount(() => {
    const interval = glitchText(titleText(), setTitleText);
    onCleanup(() => clearInterval(interval));
  });

  const iconSrc = () => (isDark() ? INPUTHALO_ICON_DARK : INPUTHALO_ICON_DEFAULT);

  return (
    <>
      <PageHead
        title="InputHalo"
        description="Input visualization for mouse and keyboard — a macOS menu bar app for real-time input tracking and customization."
      />

      <div class="bg-base relative min-h-screen overflow-hidden px-4 pt-[15vh] pb-12 md:px-8">
        {/* Subtle scanline effect */}
        <div class="pointer-events-none absolute inset-0 opacity-5">
          <div
            class="h-full w-full"
            style={{
              "background-image":
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)"
            }}
          />
        </div>

        <div class="relative z-10 mx-auto max-w-5xl">
          {/* Hero Section */}
          <div class="mb-16 text-center">
            {/* App Icon — dark/light variant matches the Gaze pattern */}
            <div class="mb-8 flex justify-center">
              <img
                src={iconSrc()}
                alt="InputHalo app icon"
                class="h-32 w-32 rounded-2xl shadow-lg transition-transform duration-200 hover:scale-105"
              />
            </div>

            {/* Title */}
            <h1 class="text-text mb-4 font-mono text-4xl md:text-5xl">
              <span class="text-red">{">"}</span> {titleText()}
            </h1>

            {/* Tagline (from appcast-template.xml) */}
            <p class="text-subtext0 mb-2 text-xl italic">
              Input visualization for mouse and keyboard
            </p>

            {/* Platform note */}
            <span class="text-subtext1 font-mono text-sm">
              macOS menu bar app · minimum macOS {INPUTHALO_MIN_SYSTEM_VERSION}
            </span>
          </div>

          {/* Feature Highlights */}
          <div class="mb-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div class="border-overlay0 rounded-lg border p-6 transition-transform duration-200 hover:scale-105">
              <h3 class="text-text mb-2 font-mono text-lg">
                <span class="text-red">{">"}</span> Real-time Tracking
              </h3>
              <p class="text-subtext0">
                Visualize every mouse click and keyboard press as it happens
              </p>
            </div>

            <div class="border-overlay0 rounded-lg border p-6 transition-transform duration-200 hover:scale-105">
              <h3 class="text-text mb-2 font-mono text-lg">
                <span class="text-red">{">"}</span> Menu Bar App
              </h3>
              <p class="text-subtext0">
                Lightweight presence in your menu bar — access settings anytime
              </p>
            </div>

            <div class="border-overlay0 rounded-lg border p-6 transition-transform duration-200 hover:scale-105">
              <h3 class="text-text mb-2 font-mono text-lg">
                <span class="text-red">{">"}</span> Customizable
              </h3>
              <p class="text-subtext0">
                Personalize colors, styles, and behavior to match your workflow
              </p>
            </div>

            <div class="border-overlay0 rounded-lg border p-6 transition-transform duration-200 hover:scale-105">
              <h3 class="text-text mb-2 font-mono text-lg">
                <span class="text-red">{">"}</span> Native macOS
              </h3>
              <p class="text-subtext0">
                Built with Swift and SwiftUI for optimal performance
              </p>
            </div>
          </div>

          {/* Download Section */}
          <div class="border-overlay0 rounded-lg border p-6 md:p-8">
            <h2 class="text-text mb-6 font-mono text-2xl">
              <span class="text-red">{">"}</span> Download
            </h2>

            <div class="flex flex-col gap-8 lg:flex-row lg:justify-around">
              {/* DMG Download (tRPC → signed S3 URL) */}
              <div class="flex flex-col items-center gap-3">
                <span class="text-subtext0 font-mono text-sm">
                  platform: macOS ({INPUTHALO_MIN_SYSTEM_VERSION}+)
                </span>
                <Button
                  variant="download"
                  size="lg"
                  loading={loading()}
                  onClick={download}
                >
                  download.dmg
                </Button>
                <span class="text-subtext1 text-xs">
                  # auto-updates via Sparkle
                </span>
              </div>

              {/* App Store (paid — coming soon) */}
              <div class="flex flex-col items-center gap-3">
                <span class="text-subtext0 font-mono text-sm">
                  variant: paid (coming soon)
                </span>
                <A
                  class="transition-all duration-200 ease-out hover:scale-105 active:scale-95"
                  href={INPUTHALO_APP_STORE_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  <DownloadOnAppStore size={50} />
                </A>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
