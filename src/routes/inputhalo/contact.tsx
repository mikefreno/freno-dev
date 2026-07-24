import { ContactForm } from "~/components/ContactForm";
import SubdomainHeader from "~/components/SubdomainHeader";

/**
 * InputHalo contact page (`inputhalo.freno.me/contact`).
 *
 * Thin wrapper over the shared `<ContactForm>` (task 09). Site awareness —
 * subject prefix `[InputHalo]`, recipient label, heading, and PageHead
 * metadata — is derived from `useSite()` inside the component via
 * `CONTACT_CONTEXT.inputhalo`, so this route needs no explicit props.
 *
 * vercel.json rewrites `inputhalo.freno.me/*` → the internal `/inputhalo/*`
 * route prefix; the browser URL stays `inputhalo.freno.me/contact`.
 *
 * Acceptance: `inputhalo.localhost:3000/contact` renders the contact form
 * with InputHalo branding; submissions email `michael@freno.me` with subject
 * `[InputHalo] Contact Request`.
 */
export default function InputHaloContactPage() {
  return (
    <>
      <SubdomainHeader />
      <ContactForm />
    </>
  );
}
