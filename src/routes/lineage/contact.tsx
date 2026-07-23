import { ContactForm } from "~/components/ContactForm";
import { LineageContactQuestions } from "~/routes/contact";

/**
 * Life and Lineage contact page (`lineage.freno.me/contact`).
 *
 * Thin wrapper over the shared `<ContactForm>` (task 09). Site awareness —
 * subject prefix `[Lineage]`, recipient label, heading, and PageHead metadata
 * — is derived from `useSite()` inside the component via
 * `CONTACT_CONTEXT.lineage`.
 *
 * Renders the Life-and-Lineage FAQ accordion (re-imported from the main-site
 * contact route so the canonical definition lives in one place) above the
 * form — the lineage subdomain is the natural home for product support Q&A.
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
    <ContactForm>
      <LineageContactQuestions />
    </ContactForm>
  );
}
