/**
 * Nessa per-subdomain account-deletion page — `nessa.freno.me/deletion`
 * (task 11).
 *
 * Served at the public browser path `/deletion` (vercel.json host rewrites
 * `nessa.freno.me/*` → the internal `/nessa/*` route prefix, leaving the
 * browser URL clean — task 02 canonical rule).
 *
 * Nessa deletion assessment (see `./deletion-content.ts` for the full
 * rationale): Nessa stores user data (`users`, `workouts`, `workoutPlans`,
 * `exerciseLibrary`, community memberships) in a per-user Turso DB +
 * shared community tables, authenticated via Clerk. → A deletion flow IS
 * needed; this page provides it via the same email-request pattern Lineage
 * uses, reusing the shared `DeletionForm` with `product="nessa"` so the
 * generalized `misc.sendDeletionRequestEmail` mutation sends Nessa-branded
 * email + writes a Nessa-specific cooldown cookie.
 *
 * Auth: NO freno.me web-auth — Nessa authenticates via Clerk; the deletion
 * request is email-based (the requester may be locked out of their Clerk
 * session), NOT an authenticated self-delete. The nav-config does NOT list
 * a Nessa deletion link by default, so this page is reachable by direct URL
 * + from the Nessa privacy policy (task-provided).
 *
 * Acceptance: `nessa.localhost:3000/deletion` renders the deletion form.
 */
import { PageHead } from "~/components/PageHead";
import SubdomainHeader from "~/components/SubdomainHeader";
import DeletionForm from "~/components/DeletionForm";
import {
  DELETION_PRODUCT_KEY,
  DELETION_COOKIE_NAME,
  DELETION_GRACE_PERIOD_LABEL,
  PAGE_META
} from "~/routes/nessa/deletion-content";

export default function NessaDeletionPage() {
  return (
    <>
      <PageHead title={PAGE_META.title} description={PAGE_META.description} />
      <SubdomainHeader />
      <div class="pt-20">
        <div class="mx-auto p-4 md:p-6 lg:p-12">
          <div class="text-text w-full justify-center">
            <div class="text-xl">
              <em>What will happen</em>:
            </div>
            Once you send, if a match to the email provided is found in our
            system, a {DELETION_GRACE_PERIOD_LABEL} grace period is started
            where you can request a cancellation of the account deletion. Once
            the grace period ends, your Nessa account entry, your workout and
            plan data, and your community memberships will be completely
            removed. No data related to the account is retained in any way.
          </div>

          <DeletionForm
            product={DELETION_PRODUCT_KEY}
            cookieName={DELETION_COOKIE_NAME}
          />
        </div>
      </div>
    </>
  );
}
