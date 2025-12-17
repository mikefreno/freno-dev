import { A } from "@solidjs/router";
import SimpleParallax from "~/components/SimpleParallax";
import DownloadOnAppStoreDark from "~/components/icons/DownloadOnAppStoreDark";

export default function LifeAndLineageMarketing() {
  return (
    <SimpleParallax>
      <div class="flex flex-col items-center justify-center h-full text-white">
        <div>
          <img
            src="/LineageIcon.png"
            alt="Lineage App Icon"
            height={128}
            width={128}
            class="object-cover object-center"
          />
        </div>
        <h1 class="text-5xl font-bold mb-4 text-center">
          Life and Lineage
        </h1>
        <p class="text-xl mb-8">A dark fantasy adventure</p>
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
  );
}
