/**
 * InputHalo privacy policy — `inputhalo.freno.me/privacy` (task 10).
 *
 * Net-new privacy policy for the InputHalo subdomain. InputHalo is a macOS
 * menu bar application (`LSUIElement: true`,
 * `LSApplicationCategoryType: public.app-category.productivity`) — a
 * productivity utility that lives in the system menu bar. Following the task
 * notes, Gaze&apos;s privacy policy is the template for macOS menu bar apps
 * (both are local-only menu bar utilities), so this policy mirrors Gaze&apos;s
 * structure and language while describing InputHalo&apos;s own practices.
 *
 * Data practices stated here reflect InputHalo as shipped:
 *  - No account is required and none is created.
 *  - The app runs entirely on your device; no personal information is
 *    collected, stored, or transmitted to external servers.
 *  - Settings and any cached state are stored locally using standard
 *    macOS mechanisms and are never sent off-device.
 *
 * PageHead is site-aware (task 02): only the base title is supplied; the
 * ` | InputHalo` suffix, `https://inputhalo.freno.me/privacy` canonical, and
 * OG image are derived automatically. Internal links use public
 * subdomain-relative paths (`/contact`) consistent with nav-config.ts and
 * page-head-meta.ts.
 */
import { A } from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import SubdomainHeader from "~/components/SubdomainHeader";

export default function InputHaloPrivacyPolicy() {
  return (
    <>
      <PageHead
        title="Privacy Policy"
        description="Privacy policy for InputHalo, a macOS menu bar productivity app."
      />
      <SubdomainHeader />
      <div class="min-h-screen px-[8vw] py-[10vh]">
        <div class="py-4 text-xl">InputHalo&apos;s Privacy Policy</div>
        <div class="py-2">Last Updated: July 23, 2026</div>
        <div class="py-2">
          Welcome to InputHalo (&apos;We&apos;, &apos;Us&apos;,
          &apos;Our&apos;). Your privacy is important to us. This privacy policy
          will help you understand our policies and procedures related to the
          collection, use, and storage of personal information from our users.
        </div>
        <ol>
          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-4 pr-2">1.</span> Personal Information
            </div>
            <div class="pl-4">
              <div class="pb-2">
                <div class="-ml-6">(a) Collection of Personal Data:</div>{" "}
                InputHalo is designed with privacy as a core principle. We
                currently do not collect, store, or share any personal
                information from our users. The app runs entirely on your device
                as a menu bar utility and does not require any account creation
                or data transmission to external servers.
              </div>
              <div class="pb-2">
                <div class="-ml-6">(b) Local-Only Settings:</div> Any
                preferences, configuration, or cached state InputHalo maintains
                is stored locally on your device using standard macOS mechanisms
                (such as the user defaults system). This data never leaves your
                device and is not transmitted to us or to any third-party
                service.
              </div>
              <div class="pb-2">
                <div class="-ml-6">(c) Future Data Collection:</div> We may in
                the future implement optional features such as usage analytics
                or crash reporting. If we do, we will clearly inform users
                through a privacy policy update and obtain explicit consent
                before collecting any data. Until then, no data of any kind is
                transmitted off your device.
              </div>
              <div class="pb-2">
                <div class="-ml-6">(d) Data Removal:</div> Since we do not
                collect any personal information, there is no server-side data
                to remove. To clear InputHalo&apos;s local data at any time, you
                can remove the app from your Mac, which deletes the locally
                stored settings alongside it. If you have any concerns about our
                practices, please contact{" "}
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
            <div class="pl-4">
              <div class="pb-2">
                <div class="-ml-6">(a) No Third-Party Sharing:</div> We do not
                share, sell, or transfer any personal information to third
                parties. Currently, InputHalo does not utilize any third-party
                services that would collect user data. Any future third-party
                services we may use will be transparently disclosed in our
                privacy policy.
              </div>
              <div class="pb-2">
                <div class="-ml-6">(b) No Network Telemetry:</div> InputHalo
                does not phone home. The app does not make network requests to
                our servers or to any analytics, advertising, or tracking
                endpoint as part of its normal operation. The only network
                activity the app performs is whatever you explicitly initiate
                through its features.
              </div>
            </div>
          </div>

          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-4 pr-2">3.</span> Security
            </div>
            <div class="pb-2 pl-4">
              <div class="-ml-6">(a) Data Protection:</div> Because InputHalo
              does not collect or store any personal information, there is
              minimal data security risk. The app runs locally on your device
              using standard macOS security practices. Any configuration data
              stored locally on your device is managed using system-provided
              mechanisms and is not transmitted off your device.
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
