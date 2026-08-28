import { A } from "@solidjs/router";
import { PageHead } from "~/components/PageHead";

/**
 * Main-site privacy policy — `freno.me/privacy-policy`.
 *
 * Covers the personal site (freno.me): accounts, blog comments & likes, the
 * contact form, transactional email, and error monitoring. Product
 * subdomains (Nessa, Lineage, Gaze, InputHalo, The Nook) each publish their
 * own policy at `<product>.freno.me/privacy`.
 *
 * The legacy `/privacy-policy/shapes-with-abigail` 308-redirects here.
 */
export default function PrivacyPolicy() {
  return (
    <>
      <PageHead
        title="Privacy Policy"
        description="Privacy policy for the freno.me blog and personal site, covering accounts, comments, and contact forms."
      />
      <div class="bg-base">
        <div class="min-h-screen px-[8vw] py-[8vh]">
          <div class="py-4 text-xl">
            freno.me&apos;s Privacy Policy
          </div>
          <div class="py-2">Last Updated: August 28, 2026</div>
          <div class="py-2">
            Welcome to freno.me (&apos;We&apos;, &apos;Us&apos;, &apos;Our&apos;).
            This site is a personal site and blog. This policy explains what
            we collect, why, and how it is handled.
          </div>
          <ol>
            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">1.</span> Data We Collect
              </div>
              <div class="pl-4">
                <div class="pb-2">
                  <div class="-ml-6">(a) Account:</div> If you create an
                  account with an email and password, we store your email, a
                  hash of your password, and your profile name. If you sign in
                  with Google or GitHub, we store your name, email, and avatar
                  as provided by the provider.
                </div>
                <div class="pb-2">
                  <div class="-ml-6">(b) Blog:</div> If you comment on a post,
                  we store your username, your comment, and its date. If you
                  like a post, we store that you liked it, so the like can be
                  removed.
                </div>
                <div class="pb-2">
                  <div class="-ml-6">(c) Contact:</div> If you submit the
                  contact form, we store your name, email, and message so we
                  can reply.
                </div>
              </div>
            </div>

            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">2.</span> How We Use It
              </div>
              <div class="pb-2 pl-4">
                We use your data only to operate the site: to authenticate
                you, to publish your comments, and to reply to your messages.
                We do not use it for advertising and we do not sell it to
                anyone.
              </div>
            </div>

            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">3.</span> Cookies
              </div>
              <div class="pb-2 pl-4">
                We use a session cookie to keep you signed in and short-lived
                cookies to rate-limit the login and contact forms against
                abuse. No tracking or advertising cookies are set.
              </div>
            </div>

            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">4.</span> Third-Party Services
              </div>
              <div class="pb-2 pl-4">
                <div class="pb-2">
                  <div class="-ml-6">(a) Email:</div> Transactional email
                  (login links, password resets, contact replies) is sent by
                  Sendinblue. We share only the email address needed to
                  deliver the message.
                </div>
                <div class="pb-2">
                  <div class="-ml-6">(b) Error monitoring:</div> We use Sentry
                  to collect crash reports, which include your browser type
                  and page URL. Your account details are never sent.
                </div>
              </div>
            </div>

            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">5.</span> Data Retention &amp;
                Deletion
              </div>
              <div class="pb-2 pl-4">
                You can delete your account and your comments or messages any
                time by contacting us. We delete the data when we receive your
                request.
              </div>
            </div>

            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">6.</span> Security
              </div>
              <div class="pb-2 pl-4">
                All connections use TLS. Passwords are stored as salted
                hashes. Access to the database is restricted to the site
                operator.
              </div>
            </div>

            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">7.</span> Changes to the Privacy
                Policy
              </div>
              <div class="pb-2 pl-4">
                We may update this policy periodically. Any changes are posted
                on this page, so please review it from time to time.
              </div>
            </div>

            <div class="py-2">
              <div class="pb-2 text-lg">
                <span class="-ml-4 pr-2">8.</span> Contact Us
              </div>
              <div class="pb-2 pl-4">
                If you have any questions about this policy, you can contact
                us{" "}
                <A
                  href="/contact"
                  class="text-blue hover-underline-animation"
                >
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
