import { PageHead } from "~/components/PageHead";
import { A } from "@solidjs/router";
import { createSignal, onMount, onCleanup, Switch, Match } from "solid-js";
import DownloadOnAppStore from "~/components/icons/DownloadOnAppStore";
import { glitchText } from "~/lib/client-utils";
import { buildSubdomainUrl } from "~/lib/subdomain-url";
import Button from "~/components/ui/Button";
import { useSite } from "~/context/SiteContext";
import LineageDownloadsPage from "./lineage/downloads";
import GazeDownloadsPage from "./gaze/downloads";
import InputHaloDownloadsPage from "./inputhalo/downloads";

function MainDownloadsPage() {
  const [LaLText, setLaLText] = createSignal("Life and Lineage");
  const [SwAText, setSwAText] = createSignal("Shapes with Abigail!");
  const [corkText, setCorkText] = createSignal("Cork");
  const [gazeText, setGazeText] = createSignal("Gaze");
  const [inputHaloText, setInputHaloText] = createSignal("InputHalo");

  // Track loading states for each download button
  const [loadingState, setLoadingState] = createSignal<Record<string, boolean>>(
    {
      lineage: false,
      cork: false,
      gaze: false,
      "shapes-with-abigail": false,
      inputhalo: false
    }
  );

  const download = (assetName: string) => {
    // Prevent multiple rapid clicks
    if (loadingState()[assetName]) return;

    // Set loading state
    setLoadingState((prev) => ({ ...prev, [assetName]: true }));

    // Call the tRPC endpoint directly
    import("~/lib/api").then(({ api }) => {
      api.downloads.getDownloadUrl
        .query({ asset_name: assetName })
        .then((data) => {
          const url = data.downloadURL;
          window.location.href = url;
        })
        .catch((error) => {
          console.error("Download error:", error);
          // Optionally show user a message
          alert("Failed to initiate download. Please try again.");
        })
        .finally(() => {
          // Reset loading state regardless of success/failure
          setLoadingState((prev) => ({ ...prev, [assetName]: false }));
        });
    });
  };

  onMount(() => {
    const lalInterval = glitchText(LaLText(), setLaLText);
    const swaInterval = glitchText(SwAText(), setSwAText);
    const corkInterval = glitchText(corkText(), setCorkText);
    const gazeInterval = glitchText(gazeText(), setGazeText);
    const inputHaloInterval = glitchText(inputHaloText(), setInputHaloText);

    onCleanup(() => {
      clearInterval(lalInterval);
      clearInterval(swaInterval);
      clearInterval(corkInterval);
      clearInterval(gazeInterval);
      clearInterval(inputHaloInterval);
    });
  });

  return (
    <>
      <PageHead
        title="Downloads"
        description="Download InputHalo, Gaze, Life and Lineage, Shapes with Abigail, and Cork. Available on iOS, Android, and macOS."
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

        <div class="relative z-10">
          <div class="text-center text-xl italic">
            Ordered by date of initial release
          </div>
          <div class="mx-auto max-w-5xl space-y-16">
            {/* InputHalo */}
            <div class="border-overlay0 rounded-lg border p-6 md:p-8">
              <h2 class="text-text mb-6 font-mono text-2xl">
                <span class="text-yellow">{">"}</span>{" "}
                <A
                  href={buildSubdomainUrl("inputhalo")}
                  class="text-text hover:text-yellow transition-colors"
                >
                  {inputHaloText()}
                </A>
              </h2>

              <div class="flex flex-col gap-8 lg:flex-row lg:justify-around">
                <div class="flex flex-col items-center gap-3">
                  <span class="text-subtext0 font-mono text-sm">
                    platform: macOS (14.6+)
                  </span>
                  <Button
                    variant="download"
                    size="lg"
                    loading={loadingState()["inputhalo"]}
                    onClick={() => download("inputhalo")}
                  >
                    download.dmg
                  </Button>
                </div>

                <div class="flex flex-col items-center gap-3">
                  <span class="text-subtext0 font-mono text-sm">
                    variant: paid (coming soon)
                  </span>
                  <A
                    class="transition-all duration-200 ease-out hover:scale-105 active:scale-95"
                    href="https://apps.apple.com/us/app/inputhalo/"
                  >
                    <DownloadOnAppStore size={50} />
                  </A>
                </div>
                <div class="flex flex-col items-center gap-3">
                  <span class="text-subtext0 font-mono text-sm">
                    variant: free (coming soon)
                  </span>
                  <A
                    class="transition-all duration-200 ease-out hover:scale-105 active:scale-95"
                    href=""
                  >
                    <DownloadOnAppStore size={50} />
                  </A>
                </div>
              </div>
            </div>

            {/* Gaze */}
            <div class="border-overlay0 rounded-lg border p-6 md:p-8">
              <h2 class="text-text mb-6 font-mono text-2xl">
                <span class="text-yellow">{">"}</span>{" "}
                <A
                  href={buildSubdomainUrl("gaze")}
                  class="text-text hover:text-yellow transition-colors"
                >
                  {gazeText()}
                </A>
              </h2>

              <div class="flex flex-col gap-8 lg:flex-row lg:justify-around">
                <div class="flex flex-col items-center gap-3">
                  <span class="text-subtext0 font-mono text-sm">
                    platform: macOS (14.6+)
                  </span>
                  <Button
                    variant="download"
                    size="lg"
                    loading={loadingState()["gaze"]}
                    onClick={() => download("gaze")}
                  >
                    download.dmg
                  </Button>
                </div>

                <div class="flex flex-col items-center gap-3">
                  <span class="text-subtext0 font-mono text-sm">
                    variant: paid
                  </span>
                  <A
                    class="transition-all duration-200 ease-out hover:scale-105 active:scale-95"
                    href="https://apps.apple.com/us/app/gaze/id6757759498"
                  >
                    <DownloadOnAppStore size={50} />
                  </A>
                </div>
                <div class="flex flex-col items-center gap-3">
                  <span class="text-subtext0 font-mono text-sm">
                    variant: free (coming soon)
                  </span>
                  <A
                    class="transition-all duration-200 ease-out hover:scale-105 active:scale-95"
                    href=""
                  >
                    <DownloadOnAppStore size={50} />
                  </A>
                </div>
              </div>
            </div>
            <div class="border-overlay0 rounded-lg border p-6 md:p-8">
              <h2 class="text-text mb-6 font-mono text-2xl">
                <span class="text-yellow">{">"}</span>{" "}
                <A
                  href={buildSubdomainUrl("lineage")}
                  class="text-text hover:text-yellow transition-colors"
                >
                  {LaLText()}
                </A>
              </h2>

              <div class="flex flex-col gap-8 lg:flex-row lg:justify-around">
                <div class="flex flex-col items-center gap-3">
                  <span class="text-subtext0 font-mono text-sm">
                    platform: android
                  </span>
                  <Button
                    variant="download"
                    size="lg"
                    loading={loadingState()["lineage"]}
                    onClick={() => download("lineage")}
                  >
                    download.apk
                  </Button>
                  <span class="text-subtext1 max-w-xs text-center text-xs italic">
                    # android build not optimized
                  </span>
                </div>

                <div class="flex flex-col items-center gap-3">
                  <span class="text-subtext0 font-mono text-sm">
                    platform: ios
                  </span>
                  <A
                    class="transition-all duration-200 ease-out hover:scale-105 active:scale-95"
                    href="https://apps.apple.com/us/app/life-and-lineage/id6737252442"
                  >
                    <DownloadOnAppStore size={50} />
                  </A>
                </div>
              </div>
            </div>
            {/* Cork */}
            <div class="border-overlay0 rounded-lg border p-6 md:p-8">
              <h2 class="text-text mb-6 font-mono text-2xl">
                <span class="text-yellow">{">"}</span> {corkText()}
              </h2>

              <div class="flex flex-col items-center gap-3">
                <span class="text-subtext0 font-mono text-sm">
                  platform: macOS (13.0+)
                </span>
                <Button
                  variant="download"
                  size="lg"
                  loading={loadingState()["cork"]}
                  onClick={() => download("cork")}
                >
                  download.zip
                </Button>
                <span class="text-subtext1 text-xs">
                  # unzip → drag to /Applications
                </span>
              </div>
            </div>

            {/* Shapes with Abigail */}
            <div class="border-overlay0 rounded-lg border p-6 md:p-8">
              <h2 class="text-text mb-6 font-mono text-2xl">
                <span class="text-yellow">{">"}</span> {SwAText()}
              </h2>

              <div class="flex flex-col gap-8 lg:flex-row lg:justify-around">
                <div class="flex flex-col items-center gap-3">
                  <span class="text-subtext0 font-mono text-sm">
                    platform: android
                  </span>
                  <Button
                    variant="download"
                    size="lg"
                    loading={loadingState()["shapes-with-abigail"]}
                    onClick={() => download("shapes-with-abigail")}
                  >
                    download.apk
                  </Button>
                </div>

                <div class="flex flex-col items-center gap-3">
                  <span class="text-subtext0 font-mono text-sm">
                    platform: ios
                  </span>
                  <A
                    class="transition-all duration-200 ease-out hover:scale-105 active:scale-95"
                    href="https://apps.apple.com/us/app/shapes-with-abigail/id6474561117"
                  >
                    <DownloadOnAppStore size={50} />
                  </A>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Host-aware downloads route handler.
 *
 * Dispatches to the per-subdomain download surface based on the resolved
 * site (see `src/routes/index.tsx` for the pattern). Nessa has no dedicated
 * downloads page, so it falls back to the unified downloads listing —
 * matching the pre-middleware behavior. Resolving the public path on both
 * server and client avoids the hydration mismatch the path-rewriting
 * middleware caused.
 */
export default function DownloadsPage() {
  const site = useSite();
  return (
    <Switch fallback={<MainDownloadsPage />}>
      <Match when={site().id === "lineage"}>
        <LineageDownloadsPage />
      </Match>
      <Match when={site().id === "gaze"}>
        <GazeDownloadsPage />
      </Match>
      <Match when={site().id === "inputhalo"}>
        <InputHaloDownloadsPage />
      </Match>
    </Switch>
  );
}
