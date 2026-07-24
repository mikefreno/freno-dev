/**
 * Life and Lineage — lineage subdomain landing page.
 *
 * This intentionally preserves the original marketing-page structure: a single
 * full-viewport `SimpleParallax` Cave background with the app icon, title,
 * tagline, and store badges centered on screen. No sidebars, no scrollable
 * feature sections, and no extra content — the parallax effect depends on the
 * page being exactly one viewport tall. The persistent `SubdomainHeader`
 * sits sticky above the parallax backdrop so navigation is reachable on every
 * subdomain page.
 */
import { A } from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import SubdomainHeader from "~/components/SubdomainHeader";
import SimpleParallax from "~/components/SimpleParallax";
import DownloadOnAppStoreDark from "~/components/icons/DownloadOnAppStoreDark";
import {
  APP_STORE_URL,
  DOWNLOADS_HREF,
  APP_ICON_SRC,
  GOOGLE_PLAY_BADGE_SRC,
  PAGE_META
} from "~/routes/lineage/landing-content";

export default function LineageLandingPage() {
  return (
    <>
      <PageHead title={PAGE_META.title} description={PAGE_META.description} />
      <SubdomainHeader />
      <SimpleParallax>
        <div class="flex h-full flex-col items-center justify-center px-4 text-white">
          <div>
            <img
              src={APP_ICON_SRC}
              alt="Life and Lineage App Icon"
              height={128}
              width={128}
              class="object-cover object-center"
            />
          </div>
          <h1 class="mt-4 mb-4 text-center text-5xl font-bold">
            Life and Lineage
          </h1>
          <p class="text-xl">A dark fantasy adventure</p>

          <div class="mt-8 flex flex-wrap items-center justify-center gap-4">
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
        </div>
      </SimpleParallax>
    </>
  );
}
