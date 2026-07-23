/**
 * Per-site contact form configuration (task 09 — per-subdomain contact pages).
 *
 * Pure module — imports NOTHING from solid-js / @solidjs/router / @solidjs/meta —
 * so it can be unit-tested in `bun:test` without spinning up the router / Meta
 * provider, mirroring the testability pattern established by `page-head-meta.ts`
 * and `nav-config.ts`.
 *
 * The shared `<ContactForm>` (`src/components/ContactForm.tsx`) reads the active
 * `site` via `useSite()` and derives its `subjectPrefix`, recipient label,
 * heading copy, and PageHead description from this map. Call sites may still
 * override these defaults via props (e.g. to inject a site-specific subline or
 * render a `children` block such as the Life-and-Lineage Q&A accordion).
 *
 * Email routing contract:
 *  - `subjectPrefix` is the bare prefix token placed in front of `" Contact
 *    Request"`. The main site keeps `"freno.me"` (no brackets) so the existing
 *    `"freno.me Contact Request"` subject is byte-identical after the refactor
 *    (backwards compatibility for any inbox filters / saved searches). Each
 *    product subdomain uses a bracketed token (`"[Nessa]"`, `"[Lineage]"`,
 *    `"[Gaze]"`, `"[InputHalo]"`) per the task spec so inbound mail can be
 *    routed / triaged by source product.
 *  - All mail is delivered to `michael@freno.me` (single owner across every
 *    product); `recipientLabel` is a display-only affordance, not an alternate
 *    SMTP recipient.
 *  - The tRPC `misc.sendContactRequest` mutation and the no-JS server action
 *    both receive this prefix and emit the identical subject — a single source
 *    of truth lives here.
 */
import type { SiteId } from "~/lib/site-context";

/** Canonical recipient for every contact submission (single product owner). */
export const CONTACT_RECIPIENT_EMAIL = "michael@freno.me";
/** Canonical sender identity shown on outbound contact mail. */
export const CONTACT_SENDER = { name: "freno.me", email: CONTACT_RECIPIENT_EMAIL };

export interface ContactContext {
  siteId: SiteId;
  /**
   * Prefix token prepended to the outbound email subject. Bare `"freno.me"`
   * for the main site (preserves the historical subject verbatim); bracketed
   * `[Nessa]` / `[Lineage]` / `[Gaze]` / `[InputHalo]` for the product
   * subdomains so mail can be triaged by source.
   */
  subjectPrefix: string;
  /** Display-only label for who receives the message (no SMTP routing effect). */
  recipientLabel: string;
  /** `<h1>` heading rendered at the top of the contact form. */
  heading: string;
  /** `<PageHead description>` for the per-site `/contact` page. */
  description: string;
  /**
   * Page title passed to `<PageHead>`. Composes with the site `titleSuffix`
   * (e.g. `"Contact" | Life and Lineage`). The main site keeps the bare
   * `"Contact"` so its title remains `"Contact | Michael Freno"`.
   */
  pageTitle: string;
}

export const CONTACT_CONTEXT: Record<SiteId, ContactContext> = {
  main: {
    siteId: "main",
    subjectPrefix: "freno.me",
    recipientLabel: "Michael Freno",
    heading: "Contact",
    description: "Contact Me",
    pageTitle: "Contact"
  },
  nessa: {
    siteId: "nessa",
    subjectPrefix: "[Nessa]",
    recipientLabel: "the Nessa team",
    heading: "Contact",
    description:
      "Get in touch with the Nessa community platform — questions about clubs, challenges, the social feed, or events.",
    pageTitle: "Contact"
  },
  lineage: {
    siteId: "lineage",
    subjectPrefix: "[Lineage]",
    recipientLabel: "the Life and Lineage team",
    heading: "Contact",
    description:
      "Contact the Life and Lineage team — questions about gameplay, remote backups, cross-device play, or account deletion.",
    pageTitle: "Contact"
  },
  gaze: {
    siteId: "gaze",
    subjectPrefix: "[Gaze]",
    recipientLabel: "the Gaze team",
    heading: "Contact",
    description:
      "Get in touch with the Gaze team — questions, feedback, or support for the Gaze macOS app.",
    pageTitle: "Contact"
  },
  inputhalo: {
    siteId: "inputhalo",
    subjectPrefix: "[InputHalo]",
    recipientLabel: "the InputHalo team",
    heading: "Contact",
    description:
      "Get in touch with the InputHalo team — questions, feedback, or support for the InputHalo app.",
    pageTitle: "Contact"
  }
};

/** Resolve the contact context for a given site id. */
export function getContactContext(siteId: SiteId): ContactContext {
  return CONTACT_CONTEXT[siteId];
}

/**
 * Build the outbound contact email subject for a given prefix token.
 *
 * Kept pure + exported so the tRPC mutation (`misc.sendContactRequest`) and the
 * no-JS server action in `ContactForm.tsx` emit byte-identical subjects — and
 * so the unit tests can assert the per-subdomain subject strings without
 * driving the network.
 */
export function buildContactSubject(subjectPrefix: string): string {
  return `${subjectPrefix} Contact Request`;
}
