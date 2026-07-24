/**
 * InputHalo landing page — net-new marketing page for inputhalo.freno.me.
 *
 * InputHalo is a polished macOS menu bar app that visualizes mouse and
 * keyboard input on screen: keyboard indicators, cursor halos, click ripples,
 * scroll indicators, and sensitive-input detection. It is built with SwiftUI
 * and distributed via direct DMG (Sparkle auto-updates) with a paid App Store
 * variant planned.
 *
 * The download orchestration stays in the testable pure `./download.ts` module;
 * this component is a thin wrapper around it plus the landing-page UX.
 */
import { For, createSignal } from "solid-js";
import { A } from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import SubdomainHeader from "~/components/SubdomainHeader";
import Button from "~/components/ui/Button";
import DownloadOnAppStoreDark from "~/components/icons/DownloadOnAppStoreDark";
import { useDarkMode } from "~/context/darkMode";
import { useSite } from "~/context/SiteContext";
import { api } from "~/lib/api";
import {
  INPUTHALO_APP_STORE_URL,
  INPUTHALO_ICON_DARK,
  INPUTHALO_ICON_DEFAULT,
  INPUTHALO_MIN_SYSTEM_VERSION,
  performInputHaloDownload
} from "./download";

const FEATURES = [
  {
    title: "Keyboard indicator overlay",
    body: "Display the keys you press in a clean, configurable on-screen overlay — perfect for demos and tutorials."
  },
  {
    title: "Mouse halo & click ripples",
    body: "Add a subtle halo around your cursor and visual click feedback so viewers never lose track of your pointer."
  },
  {
    title: "Scroll indicators",
    body: "Show scroll direction and intensity in real time, useful for screencasts and accessibility demos."
  },
  {
    title: "Sensitive input detection",
    body: "InputHalo automatically hides visual feedback when you type into password or secure fields."
  },
  {
    title: "Fully customizable",
    body: "Choose colors, sizes, animations, position, and behavior to match your setup and brand."
  },
  {
    title: "Native macOS menu bar app",
    body: "Built with SwiftUI, runs quietly in the menu bar, and uses system accessibility APIs responsibly."
  }
] as const;

const USE_CASES = [
  {
    title: "Streamers & creators",
    body: "Let your audience see exactly what you're clicking and typing without cluttering your scene."
  },
  {
    title: "Presenters & educators",
    body: "Make keyboard shortcuts and cursor movement crystal clear during demos and recordings."
  },
  {
    title: "Developers",
    body: "Show input interactions in bug reports, design reviews, and pair-programming sessions."
  },
  {
    title: "Accessibility",
    body: "Visualize inputs to make workflows easier to follow for users who benefit from clear feedback."
  }
] as const;

export default function InputHaloLanding() {
  const site = useSite();
  const { isDark } = useDarkMode();
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

  const iconSrc = () =>
    isDark() ? INPUTHALO_ICON_DARK : INPUTHALO_ICON_DEFAULT;
  const brandColor = () => site().brandColor;

  return (
    <>
      <PageHead
        title="InputHalo"
        description="A polished macOS menu bar app that visualizes keyboard presses, mouse clicks, cursor halos, and scroll events on screen — for streamers, presenters, and developers."
      />

      <SubdomainHeader />

      <main
        class="relative min-h-screen w-full overflow-x-hidden"
        style={{ "--brand-color": brandColor() }}
      >
        {/* Soft pink halos in the background */}
        <div
          class="pointer-events-none fixed inset-0 z-0"
          aria-hidden="true"
          style={{
            background: isDark()
              ? `radial-gradient(60% 50% at 80% 0%, ${brandColor()}20 0%, transparent 70%), radial-gradient(50% 40% at 20% 100%, ${brandColor()}16 0%, transparent 70%)`
              : `radial-gradient(60% 50% at 80% 0%, ${brandColor()}16 0%, transparent 70%), radial-gradient(50% 40% at 20% 100%, ${brandColor()}12 0%, transparent 70%)`
          }}
        />

        {/* ─── Hero ───────────────────────────────────────────────── */}
        <section class="relative z-10 flex flex-col items-center px-4 pt-24 pb-16 text-center md:pt-32">
          <div
            class="mb-8 flex h-28 w-28 items-center justify-center rounded-[1.75rem] shadow-2xl md:h-32 md:w-32"
            style={{ color: brandColor() }}
          >
            <img
              src={iconSrc()}
              alt="InputHalo app icon"
              width={128}
              height={128}
              class="h-full w-full rounded-[1.75rem] object-cover"
            />
          </div>

          <h1 class="text-5xl font-bold tracking-tight md:text-7xl">
            InputHalo
          </h1>
          <p class="text-text/85 mt-4 max-w-2xl text-lg md:text-2xl">
            Show every keystroke, click, and scroll.
          </p>
          <p class="text-text/70 mt-3 max-w-xl text-base md:text-lg">
            A polished macOS menu bar app for input visualization — built for
            streamers, presenters, developers, and anyone who wants their inputs
            seen.
          </p>

          <div class="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Button
              variant="download"
              size="lg"
              loading={loading()}
              onClick={download}
            >
              download.dmg
            </Button>
            <A
              class="my-auto transition-all duration-200 ease-out hover:scale-105 active:scale-95"
              href={INPUTHALO_APP_STORE_URL}
              target="_blank"
              rel="noreferrer"
            >
              <DownloadOnAppStoreDark size={50} />
            </A>
          </div>
          <p class="text-text/50 mt-3 text-sm">
            macOS {INPUTHALO_MIN_SYSTEM_VERSION}+ · auto-updates via Sparkle
          </p>
        </section>

        {/* ─── Feature highlights ─────────────────────────────────── */}
        <section class="bg-surface0/30 relative z-10 px-4 py-20">
          <div class="mx-auto max-w-6xl">
            <h2 class="text-text mb-12 text-center text-3xl font-bold md:text-4xl">
              Made for showing your inputs
            </h2>
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <For each={FEATURES}>
                {(feature) => (
                  <div class="border-surface0 bg-base/80 flex flex-col gap-3 rounded-2xl border-2 p-6 backdrop-blur-sm">
                    <div
                      class="mb-1 flex h-8 w-8 items-center justify-center rounded-full text-white"
                      style={{ background: brandColor() }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        class="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </div>
                    <h3 class="text-lg font-semibold">{feature.title}</h3>
                    <p class="text-text/80 text-sm leading-relaxed">
                      {feature.body}
                    </p>
                  </div>
                )}
              </For>
            </div>
          </div>
        </section>

        {/* ─── Use cases ──────────────────────────────────────────── */}
        <section class="relative z-10 px-4 py-20">
          <div class="mx-auto max-w-6xl">
            <h2 class="text-text mb-12 text-center text-3xl font-bold md:text-4xl">
              Who it's for
            </h2>
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <For each={USE_CASES}>
                {(use) => (
                  <div class="border-surface0 hover:bg-surface0/30 flex flex-col gap-2 rounded-2xl border-2 p-6 transition-colors">
                    <h3
                      class="text-lg font-semibold"
                      style={{ color: brandColor() }}
                    >
                      {use.title}
                    </h3>
                    <p class="text-text/80 text-sm leading-relaxed">
                      {use.body}
                    </p>
                  </div>
                )}
              </For>
            </div>
          </div>
        </section>

        {/* ─── Download CTA ───────────────────────────────────────── */}
        <section class="bg-surface0/30 relative z-10 px-4 py-20">
          <div class="mx-auto max-w-4xl text-center">
            <h2 class="text-text mb-4 text-3xl font-bold">
              Ready to visualize your inputs?
            </h2>
            <p class="text-subtext0 mx-auto mb-10 max-w-2xl leading-relaxed">
              Download the latest signed macOS build directly, or grab the App
              Store version once it launches.
            </p>
            <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                variant="download"
                size="lg"
                loading={loading()}
                onClick={download}
              >
                download.dmg
              </Button>
              <A
                class="my-auto transition-all duration-200 ease-out hover:scale-105 active:scale-95"
                href={INPUTHALO_APP_STORE_URL}
                target="_blank"
                rel="noreferrer"
              >
                <DownloadOnAppStoreDark size={50} />
              </A>
            </div>
            <p class="text-subtext1 mt-6 text-xs">
              Requires macOS {INPUTHALO_MIN_SYSTEM_VERSION} or later.
            </p>
          </div>
        </section>

        {/* ─── Footer ─────────────────────────────────────────────── */}
        <footer class="border-surface0 relative z-10 border-t px-4 py-10">
          <div class="text-text/60 mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm sm:flex-row">
            <span>{site().displayName}</span>
            <A
              href="https://freno.me"
              class="hover:text-text underline-offset-4 hover:underline"
            >
              freno.me
            </A>
          </div>
        </footer>
      </main>
    </>
  );
}
