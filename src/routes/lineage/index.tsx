/**
 * Life and Lineage — lineage subdomain landing page (task 08).
 *
 * Migrates the legacy `src/routes/marketing/life-and-lineage.tsx` page to the
 * `lineage.freno.me` root (vercel.json rewrites `lineage.freno.me/*` →
 * `/lineage/*`), and enriches it with feature highlights + a game-art strip.
 *
 * Site-awareness:
 *  - `<PageHead>` reads `useSite()` → the lineage `titleSuffix`
 *    (` | Life and Lineage`) + canonical `https://lineage.freno.me/` are
 *    derived automatically (task 02); we pass only the base title here.
 *  - The Google Play badge links to the **public browser path** `/downloads`
 *    (subdomain-relative), which vercel rewrites to `/lineage/downloads`
 *    (task 11). The App Store link is an absolute external URL, unchanged.
 *  - `SimpleParallax` reuses the existing Cave parallax background — a
 *    fitting "dark fantasy" ambience — and continues to work under the
 *    subdomain because assets are served from the shared `/public` root.
 *
 * Auth: this page performs NO auth — Lineage's mobile JWT (`LINEAGE_JWT_SECRET`)
 * is for the mobile app's API calls, not the web landing page.
 */
import { A } from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import SimpleParallax from "~/components/SimpleParallax";
import DownloadOnAppStoreDark from "~/components/icons/DownloadOnAppStoreDark";
import { For } from "solid-js";
import {
  APP_STORE_URL,
  DOWNLOADS_HREF,
  APP_ICON_SRC,
  GOOGLE_PLAY_BADGE_SRC,
  SCREENSHOT_ASSETS,
  PAGE_META,
  FEATURES
} from "~/routes/lineage/landing-content";

export default function LineageLandingPage() {
  return (
    <>
      <PageHead title={PAGE_META.title} description={PAGE_META.description} />
      <SimpleParallax>
        <div class="flex h-full flex-col items-center justify-center px-4 text-white">
          {/* Hero */}
          <img
            src={APP_ICON_SRC}
            alt="Life and Lineage App Icon"
            height={128}
            width={128}
            class="object-cover object-center"
          />
          <h1 class="mb-4 mt-4 text-center text-5xl font-bold">
            Life and Lineage
          </h1>
          <p class="mb-8 text-xl">A dark fantasy adventure</p>

          {/* Store badges — App Store (external) + Google Play → /downloads */}
          <div class="flex flex-wrap items-center justify-center gap-4">
            <a
              class="my-auto transition-all duration-200 ease-out active:scale-95"
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <DownloadOnAppStoreDark size={50} />
            </a>
            <A
              href={DOWNLOADS_HREF}
              class="transition-all duration-200 ease-out active:scale-95"
            >
              <img
                src={GOOGLE_PLAY_BADGE_SRC}
                alt="Get it on Google Play"
                width={180}
                height={60}
              />
            </A>
          </div>

          {/* Feature highlights */}
          <section class="mt-16 w-full max-w-4xl">
            <h2 class="mb-6 text-center text-2xl font-semibold">
              Why players return
            </h2>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <For each={FEATURES}>
                {(feature) => (
                  <div class="bg-base/70 rounded-lg p-4 backdrop-blur-sm">
                    <h3 class="mb-1 text-lg font-bold">{feature.title}</h3>
                    <p class="text-sm text-subtext0">
                      {feature.description}
                    </p>
                  </div>
                )}
              </For>
            </div>
          </section>

          {/* Game art / screenshots strip */}
          <section class="mt-16 w-full max-w-4xl">
            <h2 class="mb-6 text-center text-2xl font-semibold">
              glimpses of the world
            </h2>
            <div class="flex flex-col items-center gap-6">
              <div class="flex flex-wrap items-center justify-center gap-6">
                <img
                  src={SCREENSHOT_ASSETS.home}
                  alt="Life and Lineage home"
                  class="h-auto w-full max-w-sm rounded-lg shadow-lg"
                  loading="lazy"
                />
                <img
                  src={SCREENSHOT_ASSETS.shops}
                  alt="Life and Lineage shops"
                  class="h-auto w-full max-w-sm rounded-lg shadow-lg"
                  loading="lazy"
                />
              </div>
              <video
                src={SCREENSHOT_ASSETS.preview}
                class="w-full max-w-2xl rounded-lg shadow-lg"
                controls
                muted
                playsinline
                preload="metadata"
              />
            </div>
          </section>

          {/* Secondary CTA → per-subdomain downloads page */}
          <p class="mt-16 text-sm text-subtext0">
            Prefer a direct download?{" "}
            <A
              href={DOWNLOADS_HREF}
              class="underline transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105"
            >
              Visit the downloads page
            </A>
            .
          </p>
        </div>
      </SimpleParallax>
    </>
  );
}
