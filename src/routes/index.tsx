import DownloadOnAppStore from "~/components/icons/DownloadOnAppStore";
import { Typewriter } from "~/components/Typewriter";

export default function Home() {
  return (
    <main class="flex h-full flex-col gap-8 p-4 text-xl">
      <div class="flex-1">
        <Typewriter speed={30} keepAlive={2000}>
          <div class="text-4xl">Hey!</div>
        </Typewriter>
        <Typewriter speed={80} keepAlive={2000}>
          <div>
            My name is <span class="text-green">Mike Freno</span>, I'm a{" "}
            <span class="text-blue">Software Engineer</span> based in{" "}
            <span class="text-yellow">Brooklyn, NY</span>
          </div>
        </Typewriter>
        <Typewriter speed={100} keepAlive={2000}>
          I'm a passionate dev tooling, game, and open source software
          developer. Recently been working in the world of{" "}
          <a
            href="https://www.love2d.org"
            class="text-blue hover-underline-animation"
          >
            LÖVE
          </a>{" "}
        </Typewriter>
        <Typewriter speed={100} keepAlive={2000}>
          You can see some of my work{" "}
          <a
            href="https://github.com/mikefreno"
            class="text-blue hover-underline-animation"
          >
            here (github)
          </a>
        </Typewriter>
        <div class="pt-[10%] text-center">
          Some of my recent projects:
          <div class="flex flex-col items-center justify-center gap-4 2xl:flex-row">
            <div class="border-surface0 flex flex-col gap-2 rounded-md border-2 p-4 text-center">
              My mobile game:
              <a
                class="text-blue hover-underline-animation"
                href="https://apps.apple.com/us/app/life-and-lineage/id6737252442"
              >
                Life and Lineage{" "}
              </a>
              <div class="flex flex-col items-center justify-center gap-2 xl:flex-row">
                <div class="aspect-auto w-36 overflow-hidden rounded-lg md:w-52 xl:w-64">
                  <img
                    src="/lineage-home.png"
                    alt="Work sample 1"
                    class="h-full w-full object-cover"
                  />
                </div>
                <div class="aspect-auto w-36 overflow-hidden rounded-lg md:w-52 xl:w-80">
                  <video
                    src="/lineage-preview.mp4"
                    class="h-full w-full object-cover"
                    autoplay
                    loop
                    muted
                    playsinline
                  />
                </div>
                <div class="aspect-auto w-36 overflow-hidden rounded-lg md:w-52 xl:w-64">
                  <img
                    src="/lineage-shops.png"
                    alt="Work sample 2"
                    class="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
            <div class="border-surface0 flex flex-col gap-2 rounded-md border-2 p-4 text-center">
              My LÖVE UI library{" "}
              <a
                href="https://github.com/mikefreno/flexlove"
                class="text-blue hover-underline-animation"
              >
                FlexLöve
              </a>
              <div class="aspect-auto w-48 overflow-hidden rounded-lg md:w-64 xl:w-80">
                <video
                  src="/flexlove-scrollable.mp4"
                  class="h-full w-full object-cover"
                  autoplay
                  loop
                  muted
                  playsinline
                />
              </div>
              <div class="aspect-auto w-48 overflow-hidden rounded-lg md:w-64 xl:w-80">
                <video
                  src="/flexlove-input.mp4"
                  class="h-full w-full object-cover"
                  autoplay
                  loop
                  muted
                  playsinline
                />
              </div>
              <div class="aspect-auto w-48 overflow-hidden rounded-lg md:w-64 xl:w-80">
                <video
                  src="/flexlove-slider.mp4"
                  class="h-full w-full object-cover"
                  autoplay
                  loop
                  muted
                  playsinline
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col items-end gap-4">
        <Typewriter speed={50} keepAlive={false}>
          <div>
            My Collection of
            <br />
            By-the-ways:
          </div>
        </Typewriter>
        <Typewriter speed={50} keepAlive={false}>
          <ul class="list-disc">
            <li>I use Neovim</li>
            <li>I use Arch Linux</li>
            <li>I use Rust</li>
          </ul>
        </Typewriter>
      </div>
    </main>
  );
}
