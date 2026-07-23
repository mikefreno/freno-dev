import { ContactForm } from "~/components/ContactForm";

/**
 * Nessa contact page (`nessa.freno.me/contact`).
 *
 * Thin wrapper over the shared `<ContactForm>` (task 09). Site awareness —
 * subject prefix `[Nessa]`, recipient label, heading, and PageHead metadata —
 * is derived from `useSite()` inside the component via
 * `CONTACT_CONTEXT.nessa`, so this route needs no explicit props.
 *
 * vercel.json rewrites `nessa.freno.me/*` → the internal `/nessa/*` route
 * prefix; the browser URL stays `nessa.freno.me/contact` so the canonical and
 * Turnstile origin resolve correctly.
 *
 * Acceptance: `nessa.localhost:3000/contact` renders the contact form with
 * Nessa branding; submissions email `michael@freno.me` with subject
 * `[Nessa] Contact Request`.
 */
export default function NessaContactPage() {
  return <ContactForm />;
}
