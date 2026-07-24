/**
 * Nessa privacy policy — `nessa.freno.me/privacy` (task 10).
 *
 * Net-new privacy policy for the Nessa subdomain. Modeled on the Life and
 * Lineage policy (the template for products with user accounts, per the task
 * notes) but scoped to Nessa's real data practices:
 *
 *  - Authentication: user accounts are managed by Clerk
 *    (`src/server/nessa-auth.ts` verifies Clerk session JWTs via the Clerk
 *    Backend JWKS endpoint). Nessa itself does not store passwords — Clerk is
 *    the identity provider.
 *  - Community content: clubs, club challenges, club posts, post likes, and
 *    post comments (see `src/server/api/routers/nessa-community.ts`,
 *    `clubMemberships`, `clubChallenges`, `clubChallengeParticipations`,
 *    `clubPosts`, `clubPostLikes`, `clubPostComments`).
 *  - Storage: the Nessa data lives in a dedicated Turso (libSQL) database
 *    (`NessaConnectionFactory` in `src/server/db-connections.ts`), separate
 *    from the freno.me main DB and the Lineage DB.
 *
 * PageHead is site-aware (task 02): only the base title is supplied; the
 * ` | Nessa` suffix, `https://nessa.freno.me/privacy` canonical, and OG image
 * are derived automatically. Internal links use public subdomain-relative
 * paths (`/contact`) consistent with nav-config.ts and page-head-meta.ts.
 *
 * Nessa does not yet ship a dedicated account-deletion form route; per the
 * task notes ("reference the deletion flow if Nessa has user accounts"),
 * account/data deletion is initiated by contacting us — Clerk user records
 * and the associated Nessa community content are then purged manually until a
 * self-serve flow is built.
 */
import { A } from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import SubdomainHeader from "~/components/SubdomainHeader";

export default function NessaPrivacyPolicy() {
  return (
    <>
      <PageHead
        title="Privacy Policy"
        description="Privacy policy for Nessa, a community platform for clubs, challenges, and social features."
      />
      <SubdomainHeader />
      <div class="min-h-screen px-[8vw] py-[10vh]">
        <div class="py-4 text-xl">Nessa&apos;s Privacy Policy</div>
        <div class="py-2">Last Updated: July 23, 2026</div>
        <div class="py-2">
          Welcome to Nessa (&apos;We&apos;, &apos;Us&apos;, &apos;Our&apos;).
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
                <div class="-ml-6">(a) Collection of Personal Data:</div> Nessa
                authenticates users through Clerk, our third-party identity
                provider. When you create or sign in to your Nessa account, the
                information you provide to Clerk (such as your email address,
                and depending on the sign-in method you choose, your name or
                OAuth profile details) is processed by Clerk to establish and
                maintain your account. Nessa stores only the Clerk user id
                needed to associate your account with the content you create —
                we do not receive or store your Clerk password.
              </div>
              <div class="pb-2">
                <div class="-ml-6">(b) Community Content:</div> When you use
                Nessa&apos;s community features — creating or joining clubs,
                participating in challenges, posting, commenting, or liking
                posts — the content you submit is stored in our database and
                associated with your account. This includes club names,
                descriptions, and rules you author, challenge progress and
                completion data, and any posts, comments, or likes you create.
                This content is visible to other members according to the
                privacy settings of the club it belongs to.
              </div>
              <div class="pb-2">
                <div class="-ml-6">(c) Data Storage:</div> Nessa&apos;s data is
                stored in a dedicated Turso (libSQL) database that is separate
                from the freno.me main database and the Life and Lineage
                database. Your Nessa community content is never shared with or
                accessible through those other products.
              </div>
              <div class="pb-2">
                <div class="-ml-6">(d) Data Removal:</div> You can request the
                removal of your Nessa account and all associated content by
                contacting us{" "}
                <A href="/contact" class="text-blue hover-underline-animation">
                  here
                </A>
                . On receipt of your request we will remove your account record,
                your club memberships, your challenges and participation data,
                and your posts, comments, and likes from the Nessa database, and
                we will request that Clerk delete the corresponding user record.
                A short grace period may apply while the deletion is processed.
              </div>
            </div>
          </div>

          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-4 pr-2">2.</span> Third-Party Access
            </div>
            <div class="pl-4">
              <div class="pb-2">
                <div class="-ml-6">(a) Limited Third-Party Access:</div> We do
                not sell or rent your personal information. We share data with
                third parties only as necessary to operate Nessa: Clerk
                processes your authentication credentials and account metadata,
                and Turso hosts the database in which your community content is
                stored. We may also use third-party services for crash reporting
                and performance profiling; these services receive only
                anonymized data related to app performance and stability, never
                personal user content.
              </div>
              <div class="pb-2">
                <div class="-ml-6">(b) Clerk as Identity Provider:</div> Your
                authentication credentials (such as your password, if you use an
                email/password sign-in) are handled exclusively by Clerk under
                Clerk&apos;s own privacy policy. Nessa never receives, stores,
                or transmits your password. When you sign in, Nessa receives a
                session token from Clerk that lets us identify you; this token
                is verified on each request and is not persisted in our
                database.
              </div>
            </div>
          </div>

          <div class="py-2">
            <div class="pb-2 text-lg">
              <span class="-ml-4 pr-2">3.</span> Security
            </div>
            <div class="pl-4">
              <div class="pb-2">
                <div class="-ml-6">(a) Data Protection:</div> Nessa takes
                appropriate measures to protect your account and the content you
                create. Authentication is delegated to Clerk, which maintains
                industry-standard security for credentials and session tokens.
                Your community content is stored in the Nessa Turso database,
                access to which is restricted to authenticated, authorized API
                requests. We implement standard security protocols to prevent
                unauthorized access, disclosure, alteration, or destruction of
                user data.
              </div>
              <div class="pb-2">
                <div class="-ml-6">(b) Club-Level Visibility:</div> Community
                content you author is shared with other Nessa members only
                according to the visibility rules of the club it belongs to.
                Public clubs expose their content to any signed-in Nessa member;
                private clubs restrict content to their members. You are
                responsible for the content you choose to post.
              </div>
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
