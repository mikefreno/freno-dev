/**
 * `/changelog` on the Nook subdomain — rendered from the Sparkle appcast.
 *
 * The appcast already ships HTML release notes to the updater on every
 * launch, so this page renders exactly what Sparkle publishes: one source
 * of truth, no second place to write release notes. Doubles as the raw
 * material for the release-announcement job (marketing/README.md).
 *
 * Layout: the version list lives in a fixed-height vertical scroller, so
 * expanding a release never shifts the page — history is browsed inside
 * the panel. Rows collapse to their header; notes stay in the DOM
 * (visibility toggled, not unmounted) so crawlers still see every entry.
 */
import { For, Show, createSignal } from "solid-js";
import { query, createAsync } from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import { EdgeCacheHeaders } from "~/components/EdgeCacheHeaders";
import SubdomainHeader from "~/components/SubdomainHeader";
import { fetchAppcastReleases } from "~/routes/api/the-nook/_appcast";
import { ARCHIVED_RELEASES } from "~/routes/nook/changelog-archive";

const getReleases = query(async () => {
  "use server";
  // Appcast items are authoritative (they carry build numbers); releases
  // older than the appcast's retention come from the checked-in archive,
  // recovered from the changelog file's git history. Both normalize to
  // AppcastRelease so the page renders one shape.
  const live = await fetchAppcastReleases();
  const liveVersions = new Set(live.map((r) => r.version));
  const archived = ARCHIVED_RELEASES.filter(
    (r) => !liveVersions.has(r.version)
  ).map((r) => ({ ...r, build: null }));
  return [...live, ...archived];
}, "nook-changelog-releases");

export default function NookChangelogPage() {
  const releases = createAsync(() => getReleases());
  // Newest release starts open; every other row starts collapsed. `null`
  // means "the user hasn't touched the accordion yet"; after any click the
  // signal holds a version or the NONE sentinel — collapsing the open row
  // sets NONE, so all sections stay closed instead of snapping back open.
  const NONE = "__none__";
  const [openVersion, setOpenVersion] = createSignal<string | null>(null);

  const isOpen = (version: string, index: number) => {
    const open = openVersion();
    if (open === null) return index === 0;
    return open !== NONE && open === version;
  };

  const toggle = (version: string, index: number) =>
    setOpenVersion(isOpen(version, index) ? NONE : version);

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
          <div class="border-overlay0 bg-surface0/40 max-h-[70vh] overflow-y-auto rounded-2xl border">
            <For each={releases()}>
              {(release, i) => (
                <article class="border-overlay0 not-last:border-b">
                  <button
                    type="button"
                    class="hover:bg-base flex w-full items-baseline gap-x-3 gap-y-1 p-5 text-left transition-colors"
                    aria-expanded={isOpen(release.version, i())}
                    onClick={() => toggle(release.version, i())}
                  >
                    <span class="text-subtext1 w-4 shrink-0 font-mono text-sm">
                      {isOpen(release.version, i()) ? "−" : "+"}
                    </span>
                    <h2 class="text-text text-lg font-semibold">
                      Version {release.version}
                    </h2>
                    <Show when={release.build}>
                      <span class="text-subtext1 font-mono text-xs">
                        build {release.build}
                      </span>
                    </Show>
                    <Show when={release.date}>
                      <span class="text-subtext1 ml-auto text-xs">
                        {release.date}
                      </span>
                    </Show>
                  </button>
                  {/* Notes are the publisher's own HTML, written to the same
                      S3 appcast the Sparkle updater consumes. Kept mounted
                      and toggled via `hidden` so the content stays crawlable.
                      Releases that shipped before notes were embedded in the
                      appcast carry no description — say so instead of
                      rendering a blank expanse. */}
                  <div
                    classList={{ hidden: !isOpen(release.version, i()) }}
                    class="text-subtext0 px-5 pb-5 pl-14 text-sm [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-text [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-2 [&_ul]:mb-2"
                  >
                    <Show
                      when={release.notesHtml}
                      fallback={
                        <p class="text-subtext1 italic">
                          No notes recorded for this release.
                        </p>
                      }
                    >
                      <div innerHTML={release.notesHtml} />
                    </Show>
                  </div>
                </article>
              )}
            </For>
          </div>
        </Show>
      </main>
    </>
  );
}
