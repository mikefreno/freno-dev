/**
 * The Nook privacy policy — `nook.freno.me/privacy`.
 *
 * Reflects the actual data The Nook sends when licensing: a masked hardware
 * UUID + device name for trial/activation limits, the email used for purchase,
 * and Stripe payment processing.
 */
import { A } from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import SubdomainHeader from "~/components/SubdomainHeader";

export default function NookPrivacyPolicy() {
  return (
    <>
      <PageHead
        title="Privacy Policy"
        description="Privacy policy for The Nook, a coding-agent orchestration and hardware control app."
      />
      <SubdomainHeader />
      <div class="min-h-screen px-[8vw] py-[10vh]">
        <div class="py-4 text-xl">The Nook&apos;s Privacy Policy</div>
        <div class="py-2">Last Updated: August 26, 2026</div>
        <div class="py-2">
          Welcome to The Nook (&apos;We&apos;, &apos;Us&apos;, &apos;Our&apos;).
          Your privacy is important to us. This policy explains what we collect,
          why, and how it is handled. The app itself runs locally on your device
          and sends only the minimal data required for trial and licensing.
        </div>
        <ol>
          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-4 pr-2">1.</span> Data We Collect
            </div>
            <div class="pl-4">
              <div class="pb-2">
                <div class="-ml-6">(a) Device hardware UUID:</div> When you start
                a trial or activate a license, The Nook sends a hardware UUID
                from your Mac. It is used solely to enforce the 14-day trial and
                the 3-device activation limit, and to prevent resetting the
                trial by reinstalling the app.
              </div>
              <div class="pb-2">
                <div class="-ml-6">(b) Device name:</div> The Nook sends your
                Mac&apos;s name so you can recognize the device in your license
                activations. It is not used for any other purpose.
              </div>
              <div class="pb-2">
                <div class="-ml-6">(c) Email:</div> The email you provide at
                checkout is used to deliver your license key and to look up your
                order.
              </div>
              <div class="pb-2">
                <div class="-ml-6">(d) Payment:</div> Payments are processed by
                Stripe. We never see or store your card details.
              </div>
            </div>
          </div>

          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-4 pr-2">2.</span> How We Use It
            </div>
            <div class="pb-2 pl-4">
              Device identifiers, your email, and license records are used only
              to operate the trial, deliver purchases, and enforce the 3-device
              license. We do not use them for advertising or sell them to anyone.
            </div>
          </div>

          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-4 pr-2">3.</span> Data Security
            </div>
            <div class="pb-2 pl-4">
              License keys are signed and verified with Ed25519. The connection
              to our servers uses TLS. Your license key is stored in the macOS
              Keychain on your Mac.
            </div>
          </div>

          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-4 pr-2">4.</span> Changes to the Privacy Policy
            </div>
            <div class="pb-2 pl-4">
              We may update this policy periodically. Any changes are posted on
              this page, so please review it from time to time.
            </div>
          </div>

          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-4 pr-2">5.</span> Contact Us
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
    </>
  );
}
