import { Switch, Match, type JSX } from "solid-js";
import { PageHead } from "~/components/PageHead";
import { DarkModeToggle } from "~/components/DarkModeToggle";
import { Typewriter } from "~/components/Typewriter";
import { useSite } from "~/context/SiteContext";
import { buildSubdomainUrl } from "~/lib/site-context";
import NessaLanding from "./nessa";
import LineageLanding from "./lineage";
import GazeLanding from "./gaze";
import InputHaloLanding from "./inputhalo";
import NookLanding from "./nook";

/**
 * Root route handler.
 *
 * SolidStart's file router cannot match on host, so `vercel.json` host
 * rewrites (`nessa.freno.me/(.*) → /nessa/$1`) map each subdomain onto its
 * `src/routes/<prefix>/*` file route in production. The vinxi dev server
 * ignores `vercel.json`, however — so in dev a subdomain root (`nessa.localhost/`)
 * would otherwise fall through to this `index.tsx` and render Mike's personal
 * page with only the sidebar changing.
 *
 * The AGENTS.md-sanctioned remedy is to branch on the resolved `Site` (via
 * the `useSite()` accessor from `src/lib/site-context.ts`, NOT raw host
 * sifting) and render the matching subdomain landing component here. This
 * makes the subdomain roots render their unique landing pages in dev *and*
 * acts as a production safety net should a Vercel rewrite ever fail to fire.
 * In production the vercel rewrite still wins — `nessa.freno.me/` →
 * `/nessa/index.tsx` directly — so the two paths render the same component:
 * `NessaLanding`.
 */
export default function Home(): JSX.Element {
  const site = useSite();

  return (
    <Switch fallback={<MainHome />}>
      <Match when={site().id === "nessa"}>
        <NessaLanding />
      </Match>
      <Match when={site().id === "lineage"}>
        <LineageLanding />
      </Match>
      <Match when={site().id === "gaze"}>
        <GazeLanding />
      </Match>
      <Match when={site().id === "inputhalo"}>
        <InputHaloLanding />
      </Match>
      <Match when={site().id === "nook"}>
        <NookLanding />
      </Match>
    </Switch>
  );
}

/** The freno.me personal site landing page (default/main host only). */
function MainHome(): JSX.Element {
  return (
    <>
      <PageHead
        title="Home"
        description="Michael Freno - Software Engineer based in Brooklyn, NY"
      />

      <main class="flex h-full flex-col gap-8 px-4 py-16 text-xl">
        <div class="flex-1">
          <Typewriter speed={30} keepAlive={2000} delay={500}>
            <div class="text-4xl">Hey!</div>
          </Typewriter>
          <Typewriter speed={80} keepAlive={2000} delay={500}>
            <div>
              My name is <span class="text-green">Mike Freno</span>, I'm a{" "}
              <span class="text-blue">Software Engineer</span> based in{" "}
              <span class="text-yellow">Brooklyn, NY.</span>
            </div>
          </Typewriter>
          <Typewriter speed={100} keepAlive={2000} delay={500}>
            I'm a passionate developer tooling, game, and open source software
            developer.
          </Typewriter>
          <Typewriter speed={100} keepAlive={2000} delay={500}>
            Recently been working in the world of{" "}
            <a
              href="https://www.love2d.org"
              class="text-blue hover-underline-animation"
            >
              LÖVE
            </a>{" "}
            (an open source game engine for Lua).{" "}
          </Typewriter>{" "}
          <Typewriter speed={100} keepAlive={2000} delay={500}>
            You can see some of my work{" "}
            <a
              href="https://github.com/mikefreno"
              class="text-blue hover-underline-animation"
            >
              here (github).
            </a>
          </Typewriter>
          <Typewriter speed={100} keepAlive={2000} delay={500}>
            If you want to get in touch, check to side bar for various links.
          </Typewriter>
          <div class="pt-8 text-center">
            <div class="pb-4">Some of my recent projects:</div>
            {/* The Nook */}
            <div class="border-surface0 mb-2 flex w-full flex-col gap-2 rounded-md border-2 p-4 text-center">
              <div>My macOS notch utility:</div>
              <a
                href={buildSubdomainUrl("nook")}
                class="text-blue hover-underline-animation mx-auto w-fit"
              >
                The Nook
              </a>
              <div class="mx-auto w-full max-w-4xl overflow-hidden rounded-lg">
                <video
                  src="/nook/demo-expansion.mp4"
                  class="h-full w-full object-cover"
                  autoplay
                  loop
                  muted
                  playsinline
                />
              </div>
              <div class="pt-2 text-left text-sm">
                A native macOS island that lives in the notch: orchestration for
                a fleet of coding agents, fan curve control, thermal gauges,
                calendar and camera modules. One-time purchase - no
                subscription, ever.
              </div>
            </div>
            <div class="flex flex-col items-center gap-2 xl:flex-row xl:items-start xl:justify-center">
              {/* FlexLöve */}
              <div class="border-surface0 flex w-full flex-col rounded-md border-2 p-4 text-center">
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
                      width={1280}
                      height={1290}
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
                      width={1148}
                      height={140}
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
                      width={1256}
                      height={134}
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
              <div class="border-surface0 flex w-full flex-col gap-2 rounded-md border-2 p-4 text-center">
                <div>My mobile game:</div>
                <a
                  class="text-blue hover-underline-animation mx-auto w-fit"
                  href="https://apps.apple.com/us/app/life-and-lineage/id6737252442"
                >
                  Life and Lineage
                </a>
                <div class="flex flex-col gap-4 sm:grid sm:grid-cols-3">
                  <div class="aspect-auto w-full overflow-hidden rounded-lg sm:col-span-1">
                    <video
                      src="/lineage-preview.mp4"
                      width={886}
                      height={1920}
                      class="h-full w-full object-cover"
                      autoplay
                      loop
                      muted
                      playsinline
                    />
                  </div>
                  <div class="grid grid-cols-2 gap-4 sm:col-span-2 sm:grid-cols-2">
                    <div class="aspect-auto w-full overflow-hidden rounded-lg">
                      <img
                        src="/lineage-home.png"
                        alt="Life and Lineage Home"
                        width={1320}
                        height={2868}
                        class="h-full w-full object-cover"
                      />
                    </div>
                    <div class="aspect-auto w-full overflow-hidden rounded-lg">
                      <img
                        src="/lineage-shops.png"
                        alt="Life and Lineage Shops"
                        width={608}
                        height={1322}
                        class="h-full w-full object-cover"
                      />
                    </div>
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
          <div class="flex justify-between pb-8 text-center">
            <Typewriter
              speed={120}
              class="mx-auto max-w-3/4 pt-8 md:max-w-1/2"
              delay={500}
            >
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
              - and also see the rest of my various dot files idk. There's a{" "}
              <a
                href="/blog/My_MacOS_rice."
                class="text-blue hover-underline-animation"
              >
                macos
              </a>{" "}
              arch linux rice in there if you're into that kinda thing and a{" "}
              <a
                href="/blog/A_Journey_in_Self_Hosting"
                class="text-blue hover-underline-animation"
              >
                home server setup too
              </a>
              .
            </Typewriter>
          </div>
          <div class="flex flex-col items-end justify-center gap-4 pr-4">
            <Typewriter speed={30} keepAlive={false} delay={500}>
              <div>
                My Collection of
                <br />
                By-the-ways:
              </div>
            </Typewriter>
            <Typewriter speed={30} keepAlive={false} delay={500}>
              <ul class="list-disc">
                <li>I use Neovim</li>
                <li>I use Arch Linux</li>
                <li>I use Rust</li>
              </ul>
            </Typewriter>
          </div>
        </div>
      </main>
    </>
  );
}
