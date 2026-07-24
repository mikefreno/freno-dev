import { ContactForm } from "~/components/ContactForm";
import SubdomainHeader from "~/components/SubdomainHeader";

/**
 * Gaze contact page (`gaze.freno.me/contact`).
 *
 * Thin wrapper over the shared `<ContactForm>`. Site awareness —
 * subject prefix `[Gaze]`, recipient label, heading, and PageHead metadata —
 * is derived from `useSite()` inside the component via `CONTACT_CONTEXT.gaze`,
 * so this route needs no explicit props.
 *
 * vercel.json rewrites `gaze.freno.me/*` → the internal `/gaze/*` route
 * prefix; the browser URL stays `gaze.freno.me/contact`.
 *
 * Acceptance: `gaze.localhost:3000/contact` renders the contact form with
 * Gaze branding; submissions email `michael@freno.me` with subject
 * `[Gaze] Contact Request`.
 */
export default function GazeContactPage() {
  return (
    <>
      <SubdomainHeader />
      <ContactForm />
    </>
  );
}
