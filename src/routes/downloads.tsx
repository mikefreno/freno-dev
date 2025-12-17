import { A } from "@solidjs/router";
import DownloadOnAppStore from "~/components/icons/DownloadOnAppStore";
import GitHub from "~/components/icons/GitHub";
import LinkedIn from "~/components/icons/LinkedIn";

export default function DownloadsPage() {
  const download = (assetName: string) => {
    fetch(`/api/downloads/public/${assetName}`)
      .then((response) => response.json())
      .then((data) => {
        const url = data.downloadURL;
        window.location.href = url;
      })
      .catch((error) => console.error(error));
  };

  const joinBetaPrompt = () => {
    window.alert(
      "This isn't released yet, if you would like to help test, please go the contact page and include the game and platform you would like to help test in the message. Otherwise the apk is available for direct install. Thanks!"
    );
  };

  return (
    <div class="pb-12 pt-[15vh] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 min-h-screen">
      <div class="text-center text-3xl tracking-widest dark:text-white">
        Downloads
      </div>

      <div class="pt-12">
        <div class="text-center text-xl tracking-wide dark:text-white">
          Life and Lineage
          <br />
        </div>

        <div class="flex justify-evenly md:mx-[25vw]">
          <div class="flex flex-col w-1/3">
            <div class="text-center text-lg">Android (apk only)</div>
            <button
              onClick={() => download("lineage")}
              class="mt-2 rounded-md bg-blue-500 px-4 py-2 text-white shadow-lg transition-all duration-200 ease-out hover:opacity-90 active:scale-95 active:opacity-90"
            >
              Download APK
            </button>
            <div class="text-center italic text-sm mt-2">
              Note the android version is not well tested, and has performance
              issues.
            </div>
            <div class="rule-around">Or</div>

            <div class="italic mx-auto">(Coming soon)</div>
            <button
              onClick={joinBetaPrompt}
              class="transition-all mx-auto duration-200 ease-out active:scale-95"
            >
              <img
                src="/google-play-badge.png"
                alt="google-play"
                width={180}
                height={60}
              />
            </button>
          </div>

          <div class="flex flex-col">
            <div class="text-center text-lg">iOS</div>
            <A
              class="my-auto transition-all duration-200 ease-out active:scale-95"
              href="https://apps.apple.com/us/app/life-and-lineage/id6737252442"
            >
              <DownloadOnAppStore size={50} />
            </A>
          </div>
        </div>
      </div>

      <div class="pt-12">
        <div class="text-center text-xl tracking-wide dark:text-white">
          Shapes with Abigail!
          <br />
          (apk and iOS)
        </div>

        <div class="flex justify-evenly md:mx-[25vw]">
          <div class="flex flex-col">
            <div class="text-center text-lg">Android</div>
            <button
              onClick={() => download("shapes-with-abigail")}
              class="mt-2 rounded-md bg-blue-500 px-4 py-2 text-white shadow-lg transition-all duration-200 ease-out hover:opacity-90 active:scale-95 active:opacity-90"
            >
              Download APK
            </button>
            <div class="rule-around">Or</div>
            <div class="italic mx-auto">(Coming soon)</div>
            <button
              onClick={joinBetaPrompt}
              class="transition-all duration-200 ease-out active:scale-95"
            >
              <img
                src="/google-play-badge.png"
                alt="google-play"
                width={180}
                height={60}
              />
            </button>
          </div>

          <div class="flex flex-col">
            <div class="text-center text-lg">iOS</div>
            <A
              class="my-auto transition-all duration-200 ease-out active:scale-95"
              href="https://apps.apple.com/us/app/shapes-with-abigail/id6474561117"
            >
              <DownloadOnAppStore size={50} />
            </A>
          </div>
        </div>

        <div class="pt-12">
          <div class="text-center text-xl tracking-wide dark:text-white">
            Cork
            <br />
            (macOS 13 Ventura or later)
          </div>

          <div class="flex justify-center">
            <button
              onClick={() => download("cork")}
              class="my-2 rounded-md bg-blue-500 px-4 py-2 text-white shadow-lg transition-all duration-200 ease-out hover:opacity-90 active:scale-95 active:opacity-90"
            >
              Download app
            </button>
          </div>
          <div class="text-center text-sm">
            Just unzip and drag into 'Applications' folder
          </div>
        </div>

        <ul class="icons flex justify-center pb-6 pt-24 gap-4">
          <li>
            <A
              href="https://github.com/MikeFreno/"
              target="_blank"
              rel="noreferrer"
              class="shaker rounded-full border border-zinc-800 dark:border-zinc-300 inline-block hover:scale-110 transition-transform"
            >
              <span class="m-auto p-2 block">
                <GitHub height={24} width={24} fill={undefined} />
              </span>
            </A>
          </li>
          <li>
            <A
              href="https://www.linkedin.com/in/michael-freno-176001256/"
              target="_blank"
              rel="noreferrer"
              class="shaker rounded-full border border-zinc-800 dark:border-zinc-300 inline-block hover:scale-110 transition-transform"
            >
              <span class="m-auto rounded-md p-2 block">
                <LinkedIn height={24} width={24} fill={undefined} />
              </span>
            </A>
          </li>
        </ul>
      </div>
    </div>
  );
}
