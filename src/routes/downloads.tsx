import { Title, Meta } from "@solidjs/meta";
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
    <>
      <Title>Downloads | Michael Freno</Title>
      <Meta
        name="description"
        content="Download Life and Lineage, Shapes with Abigail, and Cork for macOS. Available on iOS, Android, and macOS."
      />

      <div class="bg-base min-h-screen pt-[15vh] pb-12">
        <div class="text-text text-center text-3xl tracking-widest">
          Downloads
        </div>

        <div class="pt-12">
          <div class="text-text text-center text-xl tracking-wide">
            Life and Lineage
            <br />
          </div>

          <div class="flex justify-evenly md:mx-[25vw]">
            <div class="flex w-1/3 flex-col">
              <div class="text-center text-lg">Android (apk only)</div>
              <button
                onClick={() => download("lineage")}
                class="bg-blue mt-2 rounded-md px-4 py-2 text-base shadow-lg transition-all duration-200 ease-out hover:brightness-125 active:scale-95"
              >
                Download APK
              </button>
              <div class="mt-2 text-center text-sm italic">
                Note the android version is not well tested, and has performance
                issues.
              </div>
              <div class="rule-around">Or</div>

              <div class="mx-auto italic">(Coming soon)</div>
              <button
                onClick={joinBetaPrompt}
                class="mx-auto transition-all duration-200 ease-out active:scale-95"
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
          <div class="text-center text-xl tracking-wide">
            Shapes with Abigail!
            <br />
            (apk and iOS)
          </div>

          <div class="flex justify-evenly md:mx-[25vw]">
            <div class="flex flex-col">
              <div class="text-center text-lg">Android</div>
              <button
                onClick={() => download("shapes-with-abigail")}
                class="bg-blue mt-2 rounded-md px-4 py-2 text-base shadow-lg transition-all duration-200 ease-out hover:brightness-125 active:scale-95"
              >
                Download APK
              </button>
              <div class="rule-around">Or</div>
              <div class="mx-auto italic">(Coming soon)</div>
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
            <div class="text-text text-center text-xl tracking-wide">
              Cork
              <br />
              (macOS 13 Ventura or later)
            </div>

            <div class="flex justify-center">
              <button
                onClick={() => download("cork")}
                class="bg-blue my-2 rounded-md px-4 py-2 text-base shadow-lg transition-all duration-200 ease-out hover:brightness-125 active:scale-95"
              >
                Download app
              </button>
            </div>
            <div class="text-center text-sm">
              Just unzip and drag into 'Applications' folder
            </div>
          </div>

          <ul class="icons flex justify-center gap-4 pt-24 pb-6">
            <li>
              <A
                href="https://github.com/MikeFreno/"
                target="_blank"
                rel="noreferrer"
                class="shaker border-text inline-block rounded-full border transition-transform hover:scale-110"
              >
                <span class="m-auto block p-2">
                  <GitHub height={24} width={24} fill={undefined} />
                </span>
              </A>
            </li>
            <li>
              <A
                href="https://www.linkedin.com/in/michael-freno-176001256/"
                target="_blank"
                rel="noreferrer"
                class="shaker border-text inline-block rounded-full border transition-transform hover:scale-110"
              >
                <span class="m-auto block rounded-md p-2">
                  <LinkedIn height={24} width={24} fill={undefined} />
                </span>
              </A>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
