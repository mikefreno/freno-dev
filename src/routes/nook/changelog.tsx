/**
 * `/changelog` on the Nook subdomain — rendered from the Sparkle appcast.
 *
 * The appcast already ships HTML release notes to the updater on every
 * launch, so this page renders exactly what Sparkle publishes: one source
 * of truth, no second place to write release notes. Doubles as the raw
 * material for the release-announcement job (marketing/README.md).
 */
import { For, Show } from "solid-js";
import { query, createAsync } from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import { EdgeCacheHeaders } from "~/components/EdgeCacheHeaders";
import SubdomainHeader from "~/components/SubdomainHeader";
import { fetchAppcastReleases } from "~/routes/api/the-nook/_appcast";

const getReleases = query(async () => {
  "use server";
  return fetchAppcastReleases();
}, "nook-changelog-releases");

export default function NookChangelogPage() {
  const releases = createAsync(() => getReleases());

  return (
    <>
      <EdgeCacheHeaders maxAge={300} />
      <PageHead
        title="Changelog"
        description="Every release of The Nook, newest first — agent orchestration, fan and thermal control for macOS."
        ogTitle="The Nook changelog"
      />
      <SubdomainHeader />
      <main class="min-h-screen px-[8vw] py-[8vh]">
        <h1 class="text-text mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Changelog
        </h1>
        <p class="text-subtext0 mb-10 max-w-2xl text-lg">
          What changed in each release. The app updates through Sparkle —
          every entry here is what the updater shows.
        </p>

        <Show
          when={(releases()?.length ?? 0) > 0}
          fallback={
            <p class="text-subtext0 text-sm">
              No releases published yet — check back soon.
            </p>
          }
        >
          <div class="border-overlay0 space-y-10 border-l pl-6">
            <For each={releases()}>
              {(release) => (
                <article>
                  <div class="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 class="text-text text-xl font-semibold">
                      Version {release.version}
                    </h2>
                    <Show when={release.build}>
                      <span class="text-subtext1 font-mono text-xs">
                        build {release.build}
                      </span>
                    </Show>
                    <Show when={release.date}>
                      <span class="text-subtext1 text-xs">{release.date}</span>
                    </Show>
                  </div>
                  {/* Notes are the publisher's own HTML, written to the same
                      S3 appcast the Sparkle updater consumes. */}
                  <div
                    class="text-subtext0 text-sm [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-text [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-2 [&_ul]:mb-2"
                    innerHTML={release.notesHtml}
                  />
                </article>
              )}
            </For>
          </div>
        </Show>
      </main>
    </>
  );
}
