import { Title, Meta } from "@solidjs/meta";
import { DarkModeToggle } from "~/components/DarkModeToggle";
import { Typewriter } from "~/components/Typewriter";

export default function Home() {
  return (
    <>
      <Title>Home | Michael Freno</Title>
      <Meta
        name="description"
        content="Michael Freno - Software Engineer based in Brooklyn, NY"
      />

      <main class="flex h-full flex-col gap-8 px-4 text-xl">
        <div class="flex-1">
          <Typewriter speed={30} keepAlive={2000}>
            <div class="text-4xl">Hey!</div>
          </Typewriter>
          <Typewriter speed={80} keepAlive={2000}>
            <div>
              My name is <span class="text-green">Mike Freno</span>, I'm a{" "}
              <span class="text-blue">Software Engineer</span> based in{" "}
              <span class="text-yellow">Brooklyn, NY.</span>
            </div>
          </Typewriter>
          <Typewriter speed={100} keepAlive={2000}>
            I'm a passionate developer tooling, game, and open source software
            developer.
          </Typewriter>
          <Typewriter speed={100} keepAlive={2000}>
            Recently been working in the world of{" "}
            <a
              href="https://www.love2d.org"
              class="text-blue hover-underline-animation"
            >
              LÖVE
            </a>{" "}
            (an open source game engine for Lua).{" "}
          </Typewriter>{" "}
          <Typewriter speed={100} keepAlive={2000}>
            You can see some of my work{" "}
            <a
              href="https://github.com/mikefreno"
              class="text-blue hover-underline-animation"
            >
              here (github).
            </a>
          </Typewriter>
          <Typewriter speed={100} keepAlive={2000}>
            If you want to get in touch, check to side bar for various links.
          </Typewriter>
          <div class="pt-8 text-center">
            <div class="pb-4">Some of my recent projects:</div>
            <div class="flex flex-col items-center gap-2 xl:flex-row xl:items-start xl:justify-center">
              {/* FlexLöve */}
              <div class="border-surface0 flex w-full max-w-3/4 flex-col rounded-md border-2 p-4 text-center">
                <div>My LÖVE UI library</div>
                <a
                  href="https://github.com/mikefreno/flexlove"
                  class="text-blue hover-underline-animation mx-auto w-fit"
                >
                  FlexLöve
                </a>
                <div class="flex flex-col gap-4">
                  <div class="aspect-auto w-full overflow-hidden rounded-lg">
                    <video
                      src="/flexlove-scrollable.mp4"
                      class="h-full w-full object-cover"
                      autoplay
                      loop
                      muted
                      playsinline
                    />
                  </div>
                  <div class="aspect-auto w-full overflow-hidden rounded-lg">
                    <video
                      src="/flexlove-input.mp4"
                      class="h-full w-full object-cover"
                      autoplay
                      loop
                      muted
                      playsinline
                    />
                  </div>
                  <div class="aspect-auto w-full overflow-hidden rounded-lg">
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
                <div class="pt-2 text-left text-sm">
                  Built for developers who know CSS and want that same power
                  (and more) in their game UIs. FlexLöve brings CSS-familiar
                  flexbox and grid layouts to Löve2D, supporting both rapid
                  prototyping (immediate mode) and production-optimized
                  (retained mode) rendering. Whether you're sketching ideas or
                  shipping products, FlexLöve adapts to your
                  workflow—essentially no learning curve required if you've
                  touched CSS.
                </div>
              </div>

              {/* Life and Lineage */}
              <div class="border-surface0 flex w-full max-w-3/4 flex-col gap-2 rounded-md border-2 p-4 text-center 2xl:mr-4">
                <div>My mobile game:</div>
                <a
                  class="text-blue hover-underline-animation mx-auto w-fit"
                  href="https://apps.apple.com/us/app/life-and-lineage/id6737252442"
                >
                  Life and Lineage
                </a>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div class="aspect-auto w-full overflow-hidden rounded-lg">
                    <img
                      src="/lineage-home.png"
                      alt="Life and Lineage Home"
                      class="h-full w-full object-cover"
                    />
                  </div>
                  <div class="aspect-auto w-full overflow-hidden rounded-lg">
                    <video
                      src="/lineage-preview.mp4"
                      class="h-full w-full object-cover"
                      autoplay
                      loop
                      muted
                      playsinline
                    />
                  </div>
                  <div class="aspect-auto w-full overflow-hidden rounded-lg">
                    <img
                      src="/lineage-shops.png"
                      alt="Life and Lineage Shops"
                      class="h-full w-full object-cover"
                    />
                  </div>
                </div>
                <div class="pt-2 text-left text-sm">
                  Started as a basic project to learn react-native, it grew over
                  time into a full-fledged mobile game. It's a turn-based
                  dungeon crawler with a family lineage twist - each time you
                  die (which happens a lot) you can continue on through your
                  children (if you have any) - otherwise you start from square
                  one.
                </div>
              </div>
            </div>
          </div>
          <Typewriter speed={120} class="mx-auto max-w-3/4 pt-8 md:max-w-1/2">
            And if you love the color schemes of this site
            <div class="mx-auto w-fit">
              <DarkModeToggle />
            </div>
            (which of course you do), you can see{" "}
            <a
              href="https://github.com/mikefreno/dots/blob/master/mac/nvim/lua/colors.lua"
              class="text-blue hover-underline-animation"
            >
              here
            </a>{" "}
            - and also see the rest of my various dot files idk. There's a macos
            and arch linux rice in there if you're into that kinda thing and a
            home server setup too. Which I will write about soon™.
          </Typewriter>
        </div>

        <div class="flex flex-col items-end gap-4 pr-4">
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
    </>
  );
}
