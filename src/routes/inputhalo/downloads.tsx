/**
 * InputHalo per-subdomain downloads page — `inputhalo.freno.me/downloads`.
 *
 * Public browser path `/downloads`; vercel.json host rewrites serve this
 * from the internal `/inputhalo/*` route prefix while keeping the URL clean.
 *
 * Mirrors the download surface already exposed on the InputHalo landing page:
 *  - Direct signed-S3 DMG download via `downloads.getDownloadUrl({ asset_name: "inputhalo" })`.
 *  - macOS App Store listing link (paid variant — currently a placeholder URL).
 */
import { A } from "@solidjs/router";
import { createSignal } from "solid-js";
import { PageHead } from "~/components/PageHead";
import SubdomainHeader from "~/components/SubdomainHeader";
import DownloadOnAppStoreDark from "~/components/icons/DownloadOnAppStoreDark";
import Button from "~/components/ui/Button";
import { useDarkMode } from "~/context/darkMode";
import { useSite } from "~/context/SiteContext";
import { api } from "~/lib/api";
import {
  INPUTHALO_APP_STORE_URL,
  INPUTHALO_ICON_DARK,
  INPUTHALO_ICON_DEFAULT,
  INPUTHALO_MIN_SYSTEM_VERSION,
  performInputHaloDownload
} from "~/routes/inputhalo/download";

export default function InputHaloDownloadsPage() {
  const site = useSite();
  const { isDark } = useDarkMode();
  const [loading, setLoading] = createSignal(false);

  const iconSrc = () =>
    isDark() ? INPUTHALO_ICON_DARK : INPUTHALO_ICON_DEFAULT;

  const brandColor = () => site().brandColor;

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

  return (
    <>
      <PageHead
        title="Download InputHalo"
        description="Download InputHalo for macOS — menu bar app for keyboard, mouse, and scroll visualization."
      />

      <SubdomainHeader />

      <main class="bg-base relative min-h-screen w-full overflow-hidden px-4 pb-16">
        <div
          class="pointer-events-none fixed inset-0 z-0"
          aria-hidden="true"
          style={{
            background: `radial-gradient(50% 40% at 50% 0%, ${site().brandColor}16 0%, transparent 70%)`
          }}
        />

        <div class="relative z-10 mx-auto flex max-w-2xl flex-col items-center pt-[12vh] text-center">
          <img
            src={iconSrc()}
            alt="InputHalo app icon"
            width={128}
            height={128}
            class="mb-6 h-28 w-28 rounded-[22%] object-cover shadow-2xl"
          />

          <h1 class="mb-2 text-4xl font-bold tracking-tight">
            Download InputHalo
          </h1>
          <p class="text-text/70 mb-10 max-w-md text-lg">
            Show every keystroke, click, and scroll on macOS.
          </p>

          <div class="flex w-full flex-col items-center justify-center gap-8 sm:flex-row">
            <div class="flex flex-col items-center gap-3">
              <span class="text-subtext0 text-sm tracking-wider uppercase">
                Direct download
              </span>
              <Button
                variant="download"
                size="lg"
                color={brandColor()}
                loading={loading()}
                onClick={download}
              >
                inputhalo.dmg
              </Button>
              <span class="text-subtext1 max-w-[240px] text-center text-xs">
                macOS {INPUTHALO_MIN_SYSTEM_VERSION}+ · auto-updates via Sparkle
              </span>
            </div>

            <div class="bg-surface0/40 hidden h-24 w-px sm:block" />

            <div class="flex flex-col items-center gap-3">
              <span class="text-subtext0 text-sm tracking-wider uppercase">
                App Store
              </span>
              <A
                class="transition-all duration-200 ease-out hover:scale-105 active:scale-95"
                href={INPUTHALO_APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <DownloadOnAppStoreDark size={50} />
              </A>
              <span class="text-subtext1 max-w-[240px] text-center text-xs">
                Paid App Store variant coming soon.
              </span>
            </div>
          </div>

          <p class="text-subtext0 mt-16 text-center text-sm">
            <A
              href="/"
              class="text-text/80 hover:text-text underline underline-offset-4 transition-colors"
            >
              ← back to InputHalo
            </A>
          </p>
        </div>
      </main>
    </>
  );
}
