import { Show, type JSX } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { A } from "@solidjs/router";
import RevealDropDown from "~/components/RevealDropDown";
import { ContactForm } from "~/components/ContactForm";

/**
 * Main-site contact page (`freno.me/contact`).
 *
 * Refactored (task 09) to render the shared `<ContactForm>` — the form logic,
 * Turnstile widget, cooldown timer, email-verification flow, and tRPC
 * submission all live in the shared component now. This route remains a thin
 * wrapper that supplies:
 *  - the main-site-specific disclaimer subline (hidden when
 *    `?viewer=lineage`, preserving the legacy behavior), and
 *  - the Life-and-Lineage Q&A accordion rendered above the form.
 *
 * The shared component emits `<PageHead title="Contact" description="Contact Me" />`
 * (derived from `CONTACT_CONTEXT.main`), matching the pre-refactor metadata
 * exactly. The outbound email subject stays `"freno.me Contact Request"`
 * (`buildContactSubject("freno.me")`), so inbox filters / saved searches are
 * unaffected.
 *
 * Acceptance: `localhost:3000/contact` still works identically after the
 * refactor.
 */

/**
 * The Life-and-Lineage FAQ accordion.
 *
 * Rendered on the main-site contact page (it documents the mobile product,
 * which the main site has historically hosted marketing + support for) and on
 * the `lineage.freno.me/contact` subdomain page. Kept here as the canonical
 * definition; the lineage subdomain route re-imports and re-uses it.
 */
export function LineageContactQuestions(): JSX.Element {
  return (
    <div class="w-full py-12">
      <RevealDropDown title={"Questions about Life and Lineage?"}>
        <div>
          Feel free to use the form below, I will respond as quickly as
          possible, however, you may find an answer to your question in the
          following.
        </div>
        <ol>
          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-2 pr-2">1.</span> Personal Information
            </div>
            <div class="pl-4">
              <div class="pb-2">
                You can find the entire privacy policy{" "}
                <A
                  href="https://lineage.freno.me/privacy"
                  class="text-blue underline-offset-4 hover:underline"
                >
                  here
                </A>
                .
              </div>
            </div>
          </div>
          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-2 pr-2">2.</span> Remote Backups
            </div>
            <div class="pl-4">
              <em>Life and Lineage</em> uses a per-user database approach for
              its remote storage, this provides better separation of users and
              therefore privacy, and it makes requesting the removal of your
              data simpler, you can even request the database dump if you so
              choose. This isn&apos;t particularly expensive, but not free for n
              users, so use of this feature requires a purchase of an IAP(in-app
              purchase) - this can be the specific IAP for the remote save
              feature, and any other IAP will also unlock this feature.
            </div>
          </div>
          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-2 pr-2">3.</span> Cross Device Play
            </div>
            <div class="pl-4">
              You can use the above mentioned remote-backups to save progress
              between devices/platforms.
            </div>
          </div>
          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-2 pr-2">4.</span> Online Requirements
            </div>
            <div class="pl-4">
              Currently, the only time you need to be online is for remote save
              access. There are plans for pvp, which will require an internet
              connection, but this is not implemented at time of writing.
            </div>
          </div>
          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-2 pr-2">5.</span> Microtransactions
            </div>
            <div class="pl-4">
              Microtransactions are not required to play or complete the game,
              the game can be fully completed without spending any money,
              however 2 of the classes(necromancer and ranger) are pay-walled.
              Microtransactions are supported cross-platform, so no need to pay
              for each device, you simply need to login to your
              gmail/apple/email account. This would require first creating a
              character, signing in under options{">"}remote backups first.
            </div>
          </div>
        </ol>
      </RevealDropDown>
    </div>
  );
}

export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const viewer = () => searchParams.viewer ?? "default";

  return (
    <ContactForm
      subline={
        <Show when={viewer() !== "lineage"}>
          (for this website or any of my apps...)
        </Show>
      }
    >
      <LineageContactQuestions />
    </ContactForm>
  );
}
