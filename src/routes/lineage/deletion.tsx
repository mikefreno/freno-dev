/**
 * Lineage per-subdomain account-deletion page — `lineage.freno.me/deletion`
 * (see `./deletion-content.ts`).
 *
 * Migrated from `src/routes/deletion/life-and-lineage.tsx` (which is now a
 * 308 redirect to this public URL — see `LEGACY_DELETION_REDIRECT_TARGET`).
 *
 * Served at the public browser path `/deletion` (vercel.json host rewrites
 * `lineage.freno.me/*` → the internal `/lineage/*` route prefix, leaving the
 * browser URL clean. The nav-config "Account
 * Deletion" entry points at this path.
 *
 * Deletion flow:
 *  - Reuses the shared `DeletionForm` component, now generalized to forward
 *    a `product` discriminator to the `misc.sendDeletionRequestEmail`
 *    mutation. For Lineage we pass `product="lineage"` + the legacy
 *    cooldown cookie name (`deletionRequestSent`) so an in-flight cooldown
 *    from the old `/deletion/life-and-lineage` route is honored across the
 *    308 redirect (no forced re-send).
 *  - On the server, the mutation sends a Lineage-branded email to
 *    michael@freno.me + the requester; Mike then manually drops the central
 *    account row + the user's per-user Turso remote-save DB after the 24h
 *    grace window (`LINEAGE_CONFIG.DELETION_GRACE_PERIOD_MS`). This is the
 *    SAME flow the legacy page used — only the URL + branding moved.
 *
 * Site-awareness:
 *  - `<PageHead>` reads `useSite()` → lineage title suffix + canonical are
 *    derived automatically.
 *  - No auth — the deletion request is email-based (the requester may be
 *    locked out of their account), NOT an authenticated self-delete.
 *
 * Acceptance: `lineage.localhost:3000/deletion` renders the deletion form;
 * the form posts to the correct tRPC mutation (Lineage-branded email).
 */
import { PageHead } from "~/components/PageHead";
import SubdomainHeader from "~/components/SubdomainHeader";
import DeletionForm from "~/components/DeletionForm";
import {
  DELETION_PRODUCT_KEY,
  DELETION_COOKIE_NAME,
  DELETION_GRACE_PERIOD_LABEL,
  PAGE_META
} from "~/routes/lineage/deletion-content";

export default function LineageDeletionPage() {
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
            the grace period ends, the account&apos;s entry in our central
            database will be completely removed, and your individual database
            storing your remote saves will also be deleted. No data related to
            the account is retained in any way.
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
