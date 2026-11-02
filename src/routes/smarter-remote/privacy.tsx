/**
 * A Smarter Remote privacy policy — `freno.me/smarter-remote/privacy`.
 *
 * Linked from the iOS app's paywall (App Review 3.1.2). Reflects what the app
 * actually does: TV control stays on the local network, pairing data stays on
 * the phone, purchases go through Apple and RevenueCat, and sharing is a QR
 * code passed between phones.
 */
import { A } from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import { EdgeCacheHeaders } from "~/components/EdgeCacheHeaders";

export default function SmarterRemotePrivacyPolicy() {
  return (
    <>
      <EdgeCacheHeaders maxAge={300} />
      <PageHead
        title="A Smarter Remote Privacy Policy"
        description="Privacy policy for A Smarter Remote, a universal TV remote app that works over your local Wi-Fi network."
      />
      <div class="bg-base">
        <div class="min-h-screen px-[8vw] py-[8vh]">
          <div class="py-4 text-xl">A Smarter Remote&apos;s Privacy Policy</div>
          <div class="py-2">Last Updated: November 2, 2026</div>
          <div class="py-2">
            Welcome to A Smarter Remote (&apos;We&apos;, &apos;Us&apos;,
            &apos;Our&apos;). The app controls your TVs over your own Wi-Fi
            network. It has no accounts, no ads, and no analytics. This policy
            explains the little data it does handle.
          </div>
          <ol>
            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">1.</span> Data We Collect
              </div>
              <div class="pl-4">
                <div class="pb-2">
                  <div class="-ml-6">(a) Your TVs:</div> The app finds TVs on
                  your local network and stores their names, network addresses,
                  and platform on your phone. Pairing codes and tokens are kept
                  in your phone&apos;s Keychain. This data is sent only to the
                  TV itself, over your local network. It never reaches us.
                </div>
                <div class="pb-2">
                  <div class="-ml-6">(b) Purchases:</div> Payments are handled
                  by Apple. We use RevenueCat to check whether you own A Smarter
                  Remote Pro. RevenueCat receives an anonymous app user ID, your
                  purchase and subscription history, and basic device and app
                  details such as OS version, app version, and region. It does
                  not receive your name, email, or payment details.
                </div>
                <div class="pb-2">
                  <div class="-ml-6">(c) Voice input:</div> If you use voice
                  search, your speech is converted to text by Apple&apos;s
                  speech recognition. Apple may process it on its servers. The
                  resulting text is sent only to your TV.
                </div>
                <div class="pb-2">
                  <div class="-ml-6">(d) Sharing:</div> If you share a TV with
                  someone, its name, address, and platform are put into a QR
                  code on your screen for them to scan. It goes from one phone
                  to the other and does not pass through our servers.
                </div>
              </div>
            </div>

            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">2.</span> How We Use It
              </div>
              <div class="pb-2 pl-4">
                Data about your TVs is used only to control them. Purchase
                records are used only to unlock Pro. We do not use any of it for
                advertising, and we do not sell it.
              </div>
            </div>

            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">3.</span> Local Network Access
              </div>
              <div class="pb-2 pl-4">
                iOS asks for permission before the app can use your local
                network. The app needs it to find and control your TVs. If you
                decline, the app cannot reach your TVs. You can change this in
                Settings &gt; Privacy &amp; Security &gt; Local Network.
              </div>
            </div>

            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">4.</span> Deleting Your Data
              </div>
              <div class="pb-2 pl-4">
                Removing a TV in the app deletes its stored details and
                credentials from your phone. Deleting the app removes all of
                them. Subscriptions are managed and cancelled in your App Store
                account settings.
              </div>
            </div>

            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">5.</span> Children&apos;s Privacy
              </div>
              <div class="pb-2 pl-4">
                The app does not knowingly collect personal information from
                anyone, including children under 13.
              </div>
            </div>

            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">6.</span> Changes to the Privacy Policy
              </div>
              <div class="pb-2 pl-4">
                We may update this policy periodically. Any changes are posted on
                this page, so please review it from time to time.
              </div>
            </div>

            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">7.</span> Contact Us
              </div>
              <div class="pb-2 pl-4">
                If you have any questions about this policy, you can contact us{" "}
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
