/**
 * Lineage per-subdomain downloads page — `lineage.freno.me/downloads`
 * (task 11).
 *
 * Served at the public browser path `/downloads` (vercel.json host rewrites
 * `lineage.freno.me/*` → the internal `/lineage/*` route prefix, leaving the
 * browser URL clean — task 02 canonical rule). The nav-config "Downloads"
 * entry and the landing page's Google Play badge both point at this path
 * (tasks 04 + 08).
 *
 * Download surface (mirrors the Lineage section of the unified
 * `freno.me/downloads` page, byte-identical asset source):
 *  - Android APK via tRPC `downloads.getDownloadUrl({ asset_name: "lineage" })`
 *    → S3 signed URL for `Life and Lineage.apk`. Reuses the shared
 *    `downloadAsset` helper (task 05) so the click → redirect → S3 flow is a
 *    single code path shared with the Gaze landing page.
 *  - iOS App Store link (`LINEAGE_APP_STORE_URL`) — absolute external URL,
 *    identical to the link surfaced on the landing page + unified downloads.
 *
 * Site-awareness:
 *  - `<PageHead>` reads `useSite()` → the lineage `titleSuffix`
 *    (` | Life and Lineage`) + canonical `https://lineage.freno.me/downloads`
 *    are derived automatically (task 02); we pass only the base title here.
 *  - No auth — Lineage's mobile JWT (`LINEAGE_JWT_SECRET`) is for the mobile
 *    app's API calls, not the web downloads page.
 *
 * Acceptance: `lineage.localhost:3000/downloads` renders APK + App Store;
 * clicking APK redirects to an S3 signed URL; the unified downloads page is
 * unchanged (regression check).
 */
import { A } from "@solidjs/router";
import { createSignal, onMount, onCleanup } from "solid-js";
import { PageHead } from "~/components/PageHead";
import DownloadOnAppStore from "~/components/icons/DownloadOnAppStore";
import Button from "~/components/ui/Button";
import { glitchText } from "~/lib/client-utils";
import { downloadAsset } from "~/lib/download-asset";
import {
  LINEAGE_DOWNLOAD_ASSET,
  LINEAGE_APK_BUTTON_LABEL,
  LINEAGE_APP_STORE_URL,
  LINEAGE_HOME_HREF,
  PAGE_META
} from "~/routes/lineage/downloads-content";

export default function LineageDownloadsPage() {
  const [title, setTitle] = createSignal("Life and Lineage");
  const [loading, setLoading] = createSignal(false);

  const handleDownload = () => {
    if (loading()) return;
    setLoading(true);
    import("~/lib/api")
      .then(({ api }) =>
        downloadAsset({
          api,
          assetName: LINEAGE_DOWNLOAD_ASSET,
          onError: (error) => {
            console.error("Lineage download error:", error);
            alert("Failed to initiate download. Please try again.");
          }
        })
      )
      .finally(() => setLoading(false));
  };

  onMount(() => {
    const interval = glitchText(title(), setTitle);
    onCleanup(() => clearInterval(interval));
  });

  return (
    <>
      <PageHead
        title={PAGE_META.title}
        description={PAGE_META.description}
      />

      <div class="bg-base relative min-h-screen overflow-hidden px-4 pt-[15vh] pb-12 md:px-8">
        {/* Subtle scanline effect — consistent with the unified downloads page. */}
        <div class="pointer-events-none absolute inset-0 opacity-5">
          <div
            class="h-full w-full"
            style={{
              "background-image":
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)"
            }}
          />
        </div>

        <div class="relative z-10 mx-auto max-w-3xl">
          <div class="border-overlay0 rounded-lg border p-6 md:p-8">
            <h2 class="text-text mb-6 font-mono text-2xl">
              <span class="text-yellow">{">"}</span> {title()}
            </h2>

            <div class="flex flex-col gap-8 sm:flex-row sm:justify-around">
              {/* Android APK via tRPC → S3 signed URL */}
              <div class="flex flex-col items-center gap-3">
                <span class="text-subtext0 font-mono text-sm">
                  platform: android
                </span>
                <Button
                  variant="download"
                  size="lg"
                  loading={loading()}
                  onClick={handleDownload}
                >
                  {LINEAGE_APK_BUTTON_LABEL}
                </Button>
                <span class="text-subtext1 max-w-xs text-center text-xs italic">
                  # android build not optimized
                </span>
              </div>

              {/* iOS App Store */}
              <div class="flex flex-col items-center gap-3">
                <span class="text-subtext0 font-mono text-sm">
                  platform: ios
                </span>
                <A
                  class="transition-all duration-200 ease-out hover:scale-105 active:scale-95"
                  href={LINEAGE_APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <DownloadOnAppStore size={50} />
                </A>
              </div>
            </div>
          </div>

          {/* Secondary CTA → landing page */}
          <p class="mt-12 text-center text-sm text-subtext0">
            <A
              href={LINEAGE_HOME_HREF}
              class="underline transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105"
            >
              ← back to Life and Lineage
            </A>
          </p>
        </div>
      </div>
    </>
  );
}
