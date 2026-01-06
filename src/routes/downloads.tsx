import { Title, Meta } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { createSignal, onMount, onCleanup } from "solid-js";
import DownloadOnAppStore from "~/components/icons/DownloadOnAppStore";
import { glitchText } from "~/lib/client-utils";

const DownloadButton = ({
  onClick,
  children
}: {
  onClick: () => void;
  children: Element | string;
}) => {
  return (
    <button
      onClick={onClick}
      class="bg-green hover:bg-green/90 cursor-pointer rounded-md px-6 py-3 font-mono text-base font-semibold shadow-lg transition-all duration-200 ease-out hover:scale-105 active:scale-95"
    >
      {children}
    </button>
  );
};

export default function DownloadsPage() {
  const [LaLText, setLaLText] = createSignal("Life and Lineage");
  const [SwAText, setSwAText] = createSignal("Shapes with Abigail!");
  const [corkText, setCorkText] = createSignal("Cork");

  const download = (assetName: string) => {
    fetch(`/api/downloads/public/${assetName}`)
      .then((response) => response.json())
      .then((data) => {
        const url = data.downloadURL;
        window.location.href = url;
      })
      .catch((error) => console.error(error));
  };

  onMount(() => {
    const lalInterval = glitchText(LaLText(), setLaLText);
    const swaInterval = glitchText(SwAText(), setSwAText);
    const corkInterval = glitchText(corkText(), setCorkText);

    onCleanup(() => {
      clearInterval(lalInterval);
      clearInterval(swaInterval);
      clearInterval(corkInterval);
    });
  });

  return (
    <>
      <Title>Downloads | Michael Freno</Title>
      <Meta
        name="description"
        content="Download Life and Lineage, Shapes with Abigail, and Cork for macOS. Available on iOS, Android, and macOS."
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
          <div class="mx-auto max-w-5xl space-y-16">
            {/* Life and Lineage */}
            <div class="border-overlay0 rounded-lg border p-6 md:p-8">
              <h2 class="text-text mb-6 font-mono text-2xl">
                <span class="text-yellow">{">"}</span> {LaLText()}
              </h2>

              <div class="flex flex-col gap-8 md:flex-row md:justify-around">
                <div class="flex flex-col items-center gap-3">
                  <span class="text-subtext0 font-mono text-sm">
                    platform: android
                  </span>
                  <DownloadButton onClick={() => download("lineage")}>
                    download.apk
                  </DownloadButton>
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

            {/* Shapes with Abigail */}
            <div class="border-overlay0 rounded-lg border p-6 md:p-8">
              <h2 class="text-text mb-6 font-mono text-2xl">
                <span class="text-yellow">{">"}</span> {SwAText()}
              </h2>

              <div class="flex flex-col gap-8 md:flex-row md:justify-around">
                <div class="flex flex-col items-center gap-3">
                  <span class="text-subtext0 font-mono text-sm">
                    platform: android
                  </span>
                  <DownloadButton
                    onClick={() => download("shapes-with-abigail")}
                  >
                    download.apk
                  </DownloadButton>
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

            {/* Cork */}
            <div class="border-overlay0 rounded-lg border p-6 md:p-8">
              <h2 class="text-text mb-6 font-mono text-2xl">
                <span class="text-yellow">{">"}</span> {corkText()}
              </h2>

              <div class="flex flex-col items-center gap-3">
                <span class="text-subtext0 font-mono text-sm">
                  platform: macOS (13+)
                </span>
                <DownloadButton onClick={() => download("cork")}>
                  download.zip
                </DownloadButton>
                <span class="text-subtext1 text-xs">
                  # unzip → drag to /Applications
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
