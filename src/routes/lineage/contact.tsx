import { ContactForm } from "~/components/ContactForm";
import SubdomainHeader from "~/components/SubdomainHeader";

/**
 * Life and Lineage contact page (`lineage.freno.me/contact`).
 *
 * Thin wrapper over the shared `<ContactForm>`. Site awareness —
 * subject prefix `[Lineage]`, recipient label, heading, and PageHead metadata
 * — is derived from `useSite()` inside the component via
 * `CONTACT_CONTEXT.lineage`.
 *
 * Subdomain contact pages intentionally render only the shared contact form —
 * no Life-and-Lineage FAQ accordion and no main-site disclaimer subline
 * (those remain exclusive to the main `freno.me/contact` page).
 *
 * vercel.json rewrites `lineage.freno.me/*` → the internal `/lineage/*` route
 * prefix; the browser URL stays `lineage.freno.me/contact`.
 *
 * Acceptance: `lineage.localhost:3000/contact` renders the contact form with
 * Life and Lineage branding; submissions email `michael@freno.me` with subject
 * `[Lineage] Contact Request`.
 */
export default function LineageContactPage() {
  return (
    <>
      <SubdomainHeader />
      <ContactForm />
    </>
  );
}
