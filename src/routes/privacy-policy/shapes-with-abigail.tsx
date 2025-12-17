import { A } from "@solidjs/router";

export default function PrivacyPolicy() {
  return (
    <div class="bg-zinc-100 dark:bg-zinc-900">
      <div class="min-h-screen px-[8vw] py-[8vh]">
        <div class="py-4 text-xl">
          Shapes with Abigail!&apos;s Privacy Policy
        </div>
        <div class="py-2">Last Updated: December 21, 2023</div>
        <div class="py-2">
          Welcome to Shapes with Abigail! (&apos;We&apos; , &apos;Us&apos;,
          &apos;Our&apos;). Your privacy is important to us. For that reason,
          our app, &quot;Shapes with Abigail!&quot; has been designed to
          provide our users with a secure environment. This privacy policy
          will help you understand our policies and procedures related to the
          non-collection, non-use, and non-storage of personal information
          from our users.
        </div>
        <ol>
          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-4 pr-2">1.</span> Personal Information
            </div>
            <div class="pl-4">
              <div class="pb-2">
                <div class="-ml-6">
                  (a) Non-Collection of Personal Data:
                </div>{" "}
                Shapes with Abigail! does not collect nor store personal data.
                We respect the privacy of our users, especially considering
                the age of our users. We believe that no information, whether
                private or personal, should be required for children to enjoy
                our fun and educational app.
              </div>
            </div>
          </div>

          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-4 pr-2">2.</span> Third-Party Access
            </div>
            <div class="pb-2 pl-4">
              <div class="-ml-6">(a) No Third-Party Access:</div> Since we
              do not collect or store any user data, there is no possibility
              of sharing or selling our users&apos; information to third
              parties. Our priority is the safety and privacy of our users.
            </div>
          </div>

          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-4 pr-2">3.</span> Security
            </div>
            <div class="pb-2 pl-4">
              <div class="-ml-6">(a) Secure Environment:</div>Shapes with
              Abigail! offers a secure and safe platform for children to play
              and learn. Not requiring any personal data naturally enhances
              security by eliminating potential risks related to data breaches
              and misuse of information.
            </div>
          </div>

          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-4 pr-2">4.</span> Changes to the Privacy
              Policy
            </div>
            <div class="pb-2 pl-4">
              <div class="-ml-6">(a) Updates:</div> We may update this
              privacy policy periodically. Any changes to this privacy policy
              will be posted on this page. However, since we do not collect
              any personal data, these updates are likely to be insignificant.
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
              <A
                href="/contact"
                class="text-blue-400 underline-offset-4 hover:underline"
              >
                here
              </A>
              .
            </div>
          </div>
        </ol>
      </div>
    </div>
  );
}
