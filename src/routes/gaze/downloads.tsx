/**
 * Gaze per-subdomain downloads page — `gaze.freno.me/downloads`.
 *
 * Public browser path `/downloads`; vercel.json host rewrites serve this
 * from the internal `/gaze/*` route prefix while keeping the URL clean.
 *
 * Mirrors the download surface already exposed on the Gaze landing page:
 *  - Direct signed-S3 DMG download via `downloads.getDownloadUrl({ asset_name: "gaze" })`.
 *  - macOS App Store listing link.
 */
import { A } from "@solidjs/router";
import { createSignal } from "solid-js";
import { PageHead } from "~/components/PageHead";
import SubdomainHeader from "~/components/SubdomainHeader";
import DownloadOnAppStoreDark from "~/components/icons/DownloadOnAppStoreDark";
import Button from "~/components/ui/Button";
import { useDarkMode } from "~/context/darkMode";
import { useSite } from "~/context/SiteContext";
import { downloadAsset } from "~/lib/download-asset";

const GAZE_APP_STORE_URL = "https://apps.apple.com/us/app/gaze/id6757759498";
const GAZE_MIN_MACOS = "14.6";

export default function GazeDownloadsPage() {
  const site = useSite();
  const { isDark } = useDarkMode();
  const [loading, setLoading] = createSignal(false);

  const brandColor = () =>
    isDark() ? (site().brandColorDark ?? site().brandColor) : site().brandColor;

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
        title="Download Gaze"
        description="Download Gaze for macOS — menu bar app for eye and posture health."
      />

      <SubdomainHeader />

      <main class="bg-base relative min-h-screen w-full overflow-hidden px-4 pb-16">
        <div
          class="pointer-events-none fixed inset-0 z-0"
          aria-hidden="true"
          style={{
            background: `radial-gradient(50% 40% at 50% 0%, ${site().brandColor}18 0%, transparent 70%)`
          }}
        />

        <div class="relative z-10 mx-auto flex max-w-2xl flex-col items-center pt-[12vh] text-center">
          <img
            src={
              site().id === "gaze"
                ? "/Gaze Exports/Gaze-iOS-Default-1024x1024@1x.png"
                : ""
            }
            alt="Gaze app icon"
            width={128}
            height={128}
            class="mb-6 h-28 w-28 rounded-[22%] object-cover shadow-2xl"
          />

          <h1 class="mb-2 text-4xl font-bold tracking-tight">Download Gaze</h1>
          <p class="text-text/70 mb-10 max-w-md text-lg">
            Eye and posture health reminders for your Mac menu bar.
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
                onClick={handleDownload}
              >
                gaze.dmg
              </Button>
              <span class="text-subtext1 max-w-[240px] text-center text-xs">
                macOS {GAZE_MIN_MACOS}+ · signed macOS build
              </span>
            </div>

            <div class="bg-surface0/40 hidden h-24 w-px sm:block" />

            <div class="flex flex-col items-center gap-3">
              <span class="text-subtext0 text-sm tracking-wider uppercase">
                App Store
              </span>
              <A
                class="transition-all duration-200 ease-out hover:scale-105 active:scale-95"
                href={GAZE_APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <DownloadOnAppStoreDark size={50} />
              </A>
              <span class="text-subtext1 max-w-[240px] text-center text-xs">
                Also available on the Mac App Store.
              </span>
            </div>
          </div>

          <p class="text-subtext0 mt-16 text-center text-sm">
            <A
              href="/"
              class="text-text/80 hover:text-text underline underline-offset-4 transition-colors"
            >
              ← back to Gaze
            </A>
          </p>
        </div>
      </main>
    </>
  );
}
