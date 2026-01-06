import { A } from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import SimpleParallax from "~/components/SimpleParallax";
import DownloadOnAppStoreDark from "~/components/icons/DownloadOnAppStoreDark";

export default function LifeAndLineageMarketing() {
  return (
    <>
      <PageHead
        title="Life and Lineage"
        description="A dark fantasy adventure mobile game. Download Life and Lineage on the App Store and Google Play."
      />
      <SimpleParallax>
        <div class="flex h-full flex-col items-center justify-center text-white">
          <div>
            <img
              src="/LineageIcon.png"
              alt="Lineage App Icon"
              height={128}
              width={128}
              class="object-cover object-center"
            />
          </div>
          <h1 class="mb-4 text-center text-5xl font-bold">Life and Lineage</h1>
          <p class="mb-8 text-xl">A dark fantasy adventure</p>
          <div class="flex space-x-4">
            <a
              class="my-auto transition-all duration-200 ease-out active:scale-95"
              href="https://apps.apple.com/us/app/life-and-lineage/id6737252442"
              target="_blank"
              rel="noopener noreferrer"
            >
              <DownloadOnAppStoreDark size={50} />
            </a>
            <A
              href="/downloads"
              class="transition-all duration-200 ease-out active:scale-95"
            >
              <img
                src="/google-play-badge.png"
                alt="google-play"
                width={180}
                height={60}
              />
            </A>
          </div>
        </div>
      </SimpleParallax>
    </>
  );
}
