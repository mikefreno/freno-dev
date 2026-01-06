import { Title, Meta } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { createSignal, onMount, onCleanup } from "solid-js";
import DownloadOnAppStore from "~/components/icons/DownloadOnAppStore";

export default function DownloadsPage() {
  const [glitchText, setGlitchText] = createSignal("$ downloads");

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
    const originalText = "$ downloads";
    const glitchChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?~`";

    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.9) {
        let glitched = "";
        for (let i = 0; i < originalText.length; i++) {
          if (Math.random() > 0.8) {
            glitched +=
              glitchChars[Math.floor(Math.random() * glitchChars.length)];
          } else {
            glitched += originalText[i];
          }
        }
        setGlitchText(glitched);

        setTimeout(() => {
          setGlitchText(originalText);
        }, 80);
      }
    }, 300);

    onCleanup(() => {
      clearInterval(glitchInterval);
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
          <div class="text-text mb-12 font-mono text-3xl tracking-wider">
            <span class="text-green">freno@downloads</span>
            <span class="text-subtext1">:</span>
            <span class="text-blue">~</span>
            <span class="text-subtext1 ml-2">{glitchText()}</span>
          </div>

          <div class="mx-auto max-w-5xl space-y-16">
            {/* Life and Lineage */}
            <div class="border-overlay0 rounded-lg border p-6 md:p-8">
              <h2 class="text-text mb-6 font-mono text-2xl">
                <span class="text-yellow">{">"}</span> Life and Lineage
              </h2>

              <div class="flex flex-col gap-8 md:flex-row md:justify-around">
                <div class="flex flex-col items-center gap-3">
                  <span class="text-subtext0 font-mono text-sm">
                    platform: android
                  </span>
                  <button
                    onClick={() => download("lineage")}
                    class="bg-green hover:bg-green/90 rounded-md px-6 py-3 font-mono text-base font-semibold shadow-lg transition-all duration-200 ease-out hover:scale-105 active:scale-95"
                  >
                    download.apk
                  </button>
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
                <span class="text-yellow">{">"}</span> Shapes with Abigail!
              </h2>

              <div class="flex flex-col gap-8 md:flex-row md:justify-around">
                <div class="flex flex-col items-center gap-3">
                  <span class="text-subtext0 font-mono text-sm">
                    platform: android
                  </span>
                  <button
                    onClick={() => download("shapes-with-abigail")}
                    class="bg-green hover:bg-green/90 rounded-md px-6 py-3 font-mono text-base font-semibold shadow-lg transition-all duration-200 ease-out hover:scale-105 active:scale-95"
                  >
                    download.apk
                  </button>
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
                <span class="text-yellow">{">"}</span> Cork
              </h2>

              <div class="flex flex-col items-center gap-3">
                <span class="text-subtext0 font-mono text-sm">
                  platform: macOS (13+)
                </span>
                <button
                  onClick={() => download("cork")}
                  class="bg-green hover:bg-green/90 rounded-md px-6 py-3 font-mono text-base font-semibold shadow-lg transition-all duration-200 ease-out hover:scale-105 active:scale-95"
                >
                  download.zip
                </button>
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
