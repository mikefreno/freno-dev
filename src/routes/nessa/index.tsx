/**
 * Nessa landing page.
 *
 * Serves `nessa.freno.me/` (and falls back from `src/routes/index.tsx`'s
 * `useSite()` branch in dev). Reflects Nessa's actual product: a
 * privacy-first fitness app with segment leaderboards,
 * clubs, challenges, Apple Watch support, and Free / Plus / Pro pricing tiers.
 *
 * Content is sourced from `~/code/Nessa/plans/2026-03-16-marketing-strategy-launch-positioning.md`
 * and kept in a pure `./content.ts` module so the acceptance matrix is
 * testable without spinning up the router.
 */
import { For, Show } from "solid-js";
import { PageHead } from "~/components/PageHead";
import SubdomainHeader from "~/components/SubdomainHeader";
import { useDarkMode } from "~/context/darkMode";
import { useSite } from "~/context/SiteContext";
import { A } from "@solidjs/router";
import { buildMainSiteUrl } from "~/lib/site-context";
import { NESSA_LANDING_META } from "./meta";
import {
  TAGLINE,
  SUBTITLE,
  ICON_DEFAULT,
  ICON_DARK,
  SCREENSHOTS,
  FEATURES,
  PRICING,
  COMPARISON,
  WHY_NESSA
} from "./content";

/** Small SVG checkmark used in pricing cards. */
function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      class="mt-0.5 h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function NessaLanding() {
  const site = useSite();
  const { isDark } = useDarkMode();

  const iconSrc = () => (isDark() ? ICON_DARK : ICON_DEFAULT);
  const brandColor = () =>
    isDark() ? (site().brandColorDark ?? site().brandColor) : site().brandColor;

  return (
    <>
      <PageHead {...NESSA_LANDING_META} />

      <SubdomainHeader />

      <main
        class="relative min-h-screen w-full overflow-x-hidden"
        style={{ "--brand-color": brandColor() }}
      >
        {/* Soft brand-tinted backdrop */}
        <div
          class="pointer-events-none fixed inset-0 z-0"
          aria-hidden="true"
          style={{
            background: isDark()
              ? `radial-gradient(60% 50% at 50% 0%, ${brandColor()}22 0%, transparent 70%), radial-gradient(50% 40% at 80% 100%, ${brandColor()}1a 0%, transparent 70%)`
              : `radial-gradient(60% 50% at 50% 0%, ${brandColor()}18 0%, transparent 70%), radial-gradient(50% 40% at 80% 100%, ${brandColor()}12 0%, transparent 70%)`
          }}
        />

        {/* ─── Hero ───────────────────────────────────────────────── */}
        <section class="relative z-10 flex flex-col items-center px-4 pt-24 pb-16 text-center md:pt-32">
          <div class="mb-8 flex h-28 w-28 items-center justify-center rounded-[1.75rem] shadow-2xl md:h-32 md:w-32">
            <img
              src={iconSrc()}
              alt="Nessa app icon"
              width={128}
              height={128}
              class="h-full w-full rounded-[1.75rem] object-cover"
            />
          </div>

          <h1 class="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
            {TAGLINE}
          </h1>
          <p class="text-text/85 mt-4 max-w-2xl text-lg md:text-2xl">
            {SUBTITLE}
          </p>

          <div class="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <A
              href="/contact"
              class="rounded-full px-8 py-3 text-base font-semibold text-white shadow-md transition-transform hover:scale-[1.02] active:scale-95"
              style={{ background: brandColor() }}
            >
              Join the waitlist
            </A>
            <A
              href="/contact"
              class="border-surface2 hover:bg-surface0/40 text-accent rounded-full border-2 px-8 py-3 font-semibold transition-colors"
            >
              Request beta access
            </A>
          </div>
          <p class="text-text/60 mt-4 text-sm">
            Launching soon on the App Store.
          </p>
        </section>

        {/* ─── Free-tier feature highlights ───────────────────────── */}
        <section class="relative z-10 px-4 py-16" id="features">
          <div class="mx-auto max-w-6xl">
            <div class="mb-12 text-center">
              <h2 class="text-3xl font-bold md:text-4xl">
                Everything you need, free forever
              </h2>
              <p class="text-text/70 mx-auto mt-3 max-w-2xl text-base md:text-lg">
                Nessa gives away the features other apps lock behind
                subscriptions — because your workouts shouldn't cost extra.
              </p>
            </div>

            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <For each={FEATURES}>
                {(feature) => (
                  <div class="border-surface0 bg-surface0/30 hover:bg-surface0/50 flex flex-col gap-3 rounded-2xl border-2 p-6 transition-colors">
                    <div class="flex items-center justify-between">
                      <h3 class="text-xl font-semibold">{feature.title}</h3>
                      <Show when={feature.free}>
                        <span
                          class="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                          style={{ background: brandColor() }}
                        >
                          free
                        </span>
                      </Show>
                    </div>
                    <p class="text-text/80 text-base leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                )}
              </For>
            </div>
          </div>
        </section>

        {/* ─── Pricing tiers ───────────────────────────────────────── */}
        <section class="relative z-10 px-4 py-16">
          <div class="mx-auto max-w-6xl">
            <div class="mb-12 text-center">
              <h2 class="text-3xl font-bold md:text-4xl">
                Premium features, affordable pricing
              </h2>
              <p class="text-text/70 mx-auto mt-3 max-w-2xl text-base md:text-lg">
                Choose the plan that fits your training.
              </p>
            </div>

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <For each={PRICING}>
                {(tier) => {
                  const highlighted = tier.key === "plus";
                  return (
                    <div
                      class="border-surface0 bg-base/80 flex flex-col rounded-2xl border-2 p-6 backdrop-blur-sm"
                      classList={{
                        "scale-[1.02]": highlighted
                      }}
                      style={{
                        "border-color": highlighted ? brandColor() : undefined
                      }}
                    >
                      <div class="mb-4">
                        <h3 class="text-xl font-semibold">{tier.header}</h3>
                        <div class="mt-1 text-2xl font-bold">{tier.price}</div>
                        <Show when={tier.badge}>
                          <div
                            class="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                            style={{ background: brandColor() }}
                          >
                            {tier.badge}
                          </div>
                        </Show>
                      </div>

                      <p class="text-text/80 mb-6 leading-relaxed">
                        {tier.headline}
                      </p>

                      <ul class="mb-8 flex flex-col gap-3">
                        <For each={tier.features}>
                          {(item) => (
                            <li class="flex items-start gap-3 text-sm">
                              <CheckIcon />
                              <span>{item}</span>
                            </li>
                          )}
                        </For>
                      </ul>

                      <A
                        href="/contact"
                        class="mt-auto w-full rounded-full py-3 text-center text-base font-semibold transition-transform active:scale-95"
                        classList={{
                          "text-white": highlighted,
                          "border-surface2 border-2 hover:bg-surface0/40":
                            !highlighted
                        }}
                        style={{
                          background: highlighted ? brandColor() : undefined
                        }}
                      >
                        {tier.cta}
                      </A>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>
        </section>

        {/* ─── Feature highlights ─────────────────────────────────── */}
        <section class="relative z-10 px-4 py-16">
          <div class="mx-auto max-w-4xl">
            <h2 class="text-center text-3xl font-bold md:text-4xl">
              What you get with Nessa
            </h2>
            <p class="text-text/70 mt-3 text-center text-base md:text-lg">
              Free features other apps charge for, plus affordable premium
              tiers.
            </p>

            <div class="border-surface0 mt-8 overflow-hidden rounded-2xl border-2">
              <div class="bg-surface0/60 grid grid-cols-2 px-6 py-4 text-sm font-semibold">
                <span>Feature</span>
                <span class="text-center" style={{ color: brandColor() }}>
                  Nessa
                </span>
              </div>
              <For each={COMPARISON}>
                {(row, idx) => (
                  <div
                    class="grid grid-cols-2 px-6 py-4 text-sm"
                    classList={{
                      "bg-surface0/20": idx() % 2 === 1
                    }}
                  >
                    <span>{row.feature}</span>
                    <span
                      class="text-center font-medium"
                      style={{ color: brandColor() }}
                    >
                      {row.nessa}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </div>
        </section>

        {/* ─── Why Nessa ───────────────────────────────────────────── */}
        <section class="relative z-10 px-4 py-16">
          <div class="mx-auto max-w-6xl">
            <h2 class="mb-10 text-center text-3xl font-bold md:text-4xl">
              Why athletes are switching
            </h2>
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <For each={WHY_NESSA}>
                {(item) => (
                  <div class="border-surface0 bg-surface0/30 rounded-2xl border-2 p-6">
                    <h3 class="mb-2 text-lg font-semibold">{item.title}</h3>
                    <p class="text-text/80">{item.body}</p>
                  </div>
                )}
              </For>
            </div>
          </div>
        </section>

        {/* ─── Screenshots ─────────────────────────────────────────── */}
        <section class="relative z-10 px-4 py-16">
          <div class="mx-auto max-w-6xl">
            <h2 class="mb-10 text-center text-3xl font-bold md:text-4xl">
              Built for your whole training life
            </h2>
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <For each={Object.values(SCREENSHOTS)}>
                {(shot) => (
                  <div class="border-surface0 overflow-hidden rounded-2xl border-2">
                    <img
                      src={shot.src}
                      alt={shot.alt}
                      class="h-auto w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
              </For>
            </div>
          </div>
        </section>

        {/* ─── Final CTA ───────────────────────────────────────────── */}
        <section class="relative z-10 px-4 py-20">
          <div
            class="mx-auto max-w-4xl rounded-3xl px-8 py-16 text-center text-white"
            style={{ background: brandColor() }}
          >
            <h2 class="text-3xl font-bold md:text-4xl">
              Ready to put your fitness first?
            </h2>
            <p class="mx-auto mt-3 max-w-xl text-base text-white/90 md:text-lg">
              Join the waitlist and be the first to know when Nessa lands on the
              App Store.
            </p>
            <div class="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <A
                href="/contact"
                class="rounded-full bg-white px-8 py-3 text-base font-semibold transition-transform hover:scale-[1.02] active:scale-95"
                style={{ color: brandColor() }}
              >
                Join the waitlist
              </A>
              <A
                href="/privacy"
                class="text-white/90 underline-offset-4 hover:underline"
              >
                Privacy policy
              </A>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
