import { PageHead } from "~/components/PageHead";
import DownloadOnAppStoreDark from "~/components/icons/DownloadOnAppStoreDark";
import { useDarkMode } from "~/context/darkMode";

export default function GazeMarketing() {
  const { isDark } = useDarkMode();

  return (
    <>
      <PageHead
        title="Gaze - Eye Health Reminder"
        description="A macOS menu bar app that helps you remember to take breaks and rest your eyes. Download Gaze today."
      />
      <div class="relative h-full">
        <div class="fixed inset-0 z-0 overflow-hidden brightness-75">
          <img
            src="/look-away.png"
            alt="background"
            class="h-full w-full object-cover select-none"
            style={{
              "pointer-events": "none"
            }}
          />
        </div>
        <div class="relative z-10 flex h-full flex-col items-center justify-center text-white backdrop-blur">
          <div>
            <img
              src={
                isDark()
                  ? "/Gaze Exports/Gaze-iOS-Dark-1024x1024@1x.png"
                  : "/Gaze Exports/Gaze-iOS-Default-1024x1024@1x.png"
              }
              alt="Gaze App Icon"
              height={128}
              width={128}
              class="object-cover object-center"
            />
          </div>
          <h1 class="py-4 text-center text-5xl font-bold">Gaze</h1>
          <p class="text-text mb-8 text-xl">
            Eye and posture health reminder for macOS
          </p>
          <div class="flex space-x-4">
            <a
              class="my-auto transition-all duration-200 ease-out active:scale-95"
              href="https://apps.apple.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <DownloadOnAppStoreDark size={50} />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
