import { Title, Meta } from "@solidjs/meta";
import { A } from "@solidjs/router";
import DownloadOnAppStore from "~/components/icons/DownloadOnAppStore";

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

          <div class="flex justify-evenly">
            <div class="flex w-1/3 flex-col">
              <div class="text-center text-lg">Android</div>
              <button
                onClick={() => download("lineage")}
                class="bg-blue mx-auto mt-2 rounded-md px-4 py-2 text-base shadow-lg transition-all duration-200 ease-out hover:brightness-125 active:scale-95"
              >
                Download APK
              </button>
              <div class="mt-2 text-center text-sm italic">
                Note the android version is not well tested, and has performance
                issues.
              </div>
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

          <div class="flex justify-evenly">
            <div class="flex flex-col">
              <div class="text-center text-lg">Android</div>
              <button
                onClick={() => download("shapes-with-abigail")}
                class="bg-blue mx-auto mt-2 rounded-md px-4 py-2 text-base shadow-lg transition-all duration-200 ease-out hover:brightness-125 active:scale-95"
              >
                Download APK
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
        </div>
      </div>
    </>
  );
}
