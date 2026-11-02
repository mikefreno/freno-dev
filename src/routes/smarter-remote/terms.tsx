/**
 * A Smarter Remote terms of use — `freno.me/smarter-remote/terms`.
 *
 * Linked from the iOS app's paywall (App Review 3.1.2). Builds on Apple's
 * standard EULA and adds the Pro subscription and lifetime purchase terms.
 */
import { A } from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import { EdgeCacheHeaders } from "~/components/EdgeCacheHeaders";

export default function SmarterRemoteTerms() {
  return (
    <>
      <EdgeCacheHeaders maxAge={300} />
      <PageHead
        title="A Smarter Remote Terms of Use"
        description="Terms of use for A Smarter Remote and its Pro subscription."
      />
      <div class="bg-base">
        <div class="min-h-screen px-[8vw] py-[8vh]">
          <div class="py-4 text-xl">A Smarter Remote&apos;s Terms of Use</div>
          <div class="py-2">Last Updated: November 2, 2026</div>
          <div class="py-2">
            These terms cover your use of the A Smarter Remote app (&apos;the
            App&apos;). By using the App you agree to them. The App is licensed
            to you under Apple&apos;s{" "}
            <a
              href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue hover-underline-animation"
            >
              Licensed Application End User License Agreement
            </a>
            , and the terms below add to it.
          </div>
          <ol>
            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">1.</span> A Smarter Remote Pro
              </div>
              <div class="pl-4">
                <div class="pb-2">
                  <div class="-ml-6">(a) What it includes:</div> The free App
                  controls one TV. Pro removes that limit and unlocks the
                  features marked Pro in the App.
                </div>
                <div class="pb-2">
                  <div class="-ml-6">(b) Yearly subscription:</div> Payment is
                  charged to your Apple account when you confirm the purchase,
                  or when any free trial ends. The subscription renews
                  automatically at the same price unless you cancel at least 24
                  hours before the end of the current period. Your account is
                  charged for renewal within 24 hours before the period ends.
                  Any unused part of a free trial is forfeited when you buy a
                  subscription.
                </div>
                <div class="pb-2">
                  <div class="-ml-6">(c) Lifetime purchase:</div> A one-time
                  payment that unlocks Pro with no recurring charge.
                </div>
                <div class="pb-2">
                  <div class="-ml-6">(d) Managing and refunds:</div> You can
                  manage or cancel a subscription in your App Store account
                  settings. Refunds are handled by Apple under its policies.
                  Restore Purchases in the App re-unlocks Pro on another device
                  signed in to the same Apple account.
                </div>
              </div>
            </div>

            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">2.</span> Your TVs
              </div>
              <div class="pb-2 pl-4">
                The App controls TVs through the network features their makers
                provide. Which features work depends on your TV&apos;s model and
                software, which can change without notice. We do not guarantee
                that every feature works on every TV. Only control TVs you own
                or have permission to use.
              </div>
            </div>

            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">3.</span> No Warranty
              </div>
              <div class="pb-2 pl-4">
                The App is provided &apos;as is&apos;, without warranties of any
                kind, to the extent the law allows. To the extent the law allows,
                we are not liable for indirect or consequential damages arising
                from your use of the App.
              </div>
            </div>

            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">4.</span> Privacy
              </div>
              <div class="pb-2 pl-4">
                How the App handles data is described in the{" "}
                <A
                  href="/smarter-remote/privacy"
                  class="text-blue hover-underline-animation"
                >
                  Privacy Policy
                </A>
                .
              </div>
            </div>

            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">5.</span> Changes to These Terms
              </div>
              <div class="pb-2 pl-4">
                We may update these terms periodically. Any changes are posted on
                this page. Continuing to use the App after a change means you
                accept the new terms.
              </div>
            </div>

            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">6.</span> Contact Us
              </div>
              <div class="pb-2 pl-4">
                If you have any questions about these terms, you can contact us{" "}
                <A href="/contact" class="text-blue hover-underline-animation">
                  here
                </A>
                .
              </div>
            </div>
          </ol>
        </div>
      </div>
    </>
  );
}
