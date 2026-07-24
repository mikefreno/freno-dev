/**
 * Gaze privacy policy — `gaze.freno.me/privacy` (task 10).
 *
 * Migrated verbatim from the legacy `src/routes/privacy-policy/gaze.tsx`
 * route so there is zero content loss; the old route now 308-redirects here
 * (see `src/routes/privacy-policy/gaze.tsx`). PageHead is site-aware (task 02)
 * so the Gaze `titleSuffix` (` | Gaze`), canonical
 * (`https://gaze.freno.me/privacy`), and OG image derive automatically — we
 * only pass the base title.
 *
 * Internal links use the **public subdomain-relative paths** (`/contact`),
 * which vercel.json rewrites to the internal `/gaze/contact` route prefix
 * while leaving the browser URL clean — consistent with nav-config.ts and
 * the canonical rule in page-head-meta.ts.
 */
import { A } from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import SubdomainHeader from "~/components/SubdomainHeader";

export default function GazePrivacyPolicy() {
  return (
    <>
      <PageHead
        title="Privacy Policy"
        description="Privacy policy for Gaze, a macOS eye health reminder app."
      />
      <SubdomainHeader />
      <div class="min-h-screen px-[8vw] py-[10vh]">
        <div class="py-4 text-xl">Gaze&apos;s Privacy Policy</div>
        <div class="py-2">Last Updated: July 23, 2026</div>
        <div class="py-2">
          Welcome to Gaze (&apos;We&apos;, &apos;Us&apos;, &apos;Our&apos;).
          Your privacy is important to us. This privacy policy will help you
          understand our policies and procedures related to the collection, use,
          and storage of personal information from our users.
        </div>
        <ol>
          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-4 pr-2">1.</span> Personal Information
            </div>
            <div class="pl-4">
              <div class="pb-2">
                <div class="-ml-6">(a) Collection of Personal Data:</div> Gaze
                is designed with privacy as a core principle. We currently do
                not collect, store, or share any personal information from our
                users. The app runs entirely on your device and does not require
                any account creation or data transmission to external servers.
              </div>
              <div class="pb-2">
                <div class="-ml-6">(b) Future Data Collection:</div> We may in
                the future implement optional features such as analytics or
                crash reporting. If we do, we will clearly inform users through
                a privacy policy update and obtain explicit consent before
                collecting any data.
              </div>
              <div class="pb-2">
                <div class="-ml-6">(c) Data Removal:</div> Since we do not
                collect any personal information, there is no data to remove. If
                you have any concerns about our practices, please contact{" "}
                <A href="/contact" class="text-blue hover-underline-animation">
                  here
                </A>
                .
              </div>
            </div>
          </div>

          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-4 pr-2">2.</span> Third-Party Access
            </div>
            <div class="pb-2 pl-4">
              <div class="-ml-6">(a) No Third-Party Sharing:</div> We do not
              share, sell, or transfer any personal information to third
              parties. Currently, Gaze does not utilize any third-party services
              that would collect user data. Any future third-party services we
              may use will be transparently disclosed in our privacy policy.
            </div>
          </div>

          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-4 pr-2">3.</span> Security
            </div>
            <div class="pb-2 pl-4">
              <div class="-ml-6">(a) Data Protection:</div> Because Gaze does
              not collect or store any personal information, there is minimal
              data security risk. The app runs locally on your device using
              standard macOS security practices. Any configuration data stored
              locally on your device is encrypted using system-provided
              mechanisms.
            </div>
          </div>

          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-4 pr-2">4.</span> Changes to the Privacy Policy
            </div>
            <div class="pb-2 pl-4">
              <div class="-ml-6">(a) Updates:</div> We may update this privacy
              policy periodically, especially if we introduce new features that
              involve data collection. Any changes to this privacy policy will
              be posted on this page. We encourage users to review this policy
              regularly to stay informed about how we protect their information.
            </div>
          </div>

          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-4 pr-2">5.</span> Contact Us
            </div>
            <div class="pb-2 pl-4">
              <div class="-ml-6">(a) Reaching Out:</div> If there are any
              questions or comments regarding this privacy policy, you can
              contact us{" "}
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
