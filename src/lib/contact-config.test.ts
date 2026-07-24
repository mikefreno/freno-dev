/**
 * Unit tests for the per-site contact configuration.
 *
 * Mirrors the `meta.test.ts` / `nav-config.test.ts` testability pattern:
 * `contact-config.ts` is a pure module (no solid-js / @solidjs/router /
 * @solidjs/meta imports) so `bun:test` can resolve it directly.
 *
 * Asserts the acceptance criteria:
 *  - Each subdomain has a distinct `subjectPrefix` (email routing differs per
 *    subdomain).
 *  - The main site prefix stays `"freno.me"` so the legacy subject
 *    `"freno.me Contact Request"` is byte-identical post-refactor.
 *  - `buildContactSubject` composes the prefix + `" Contact Request"` for every
 *    subdomain — the exact strings the tRPC mutation + no-JS action emit.
 */
import { describe, it, expect } from "bun:test";
import {
  CONTACT_CONTEXT,
  CONTACT_RECIPIENT_EMAIL,
  getContactContext,
  buildContactSubject,
  type ContactContext
} from "~/lib/contact-config";
import type { SiteId } from "~/lib/site-context";

const ALL_SITES: SiteId[] = ["main", "nessa", "lineage", "gaze", "inputhalo"];

describe("contact-config — CONTEXT map", () => {
  it("defines a ContactContext for every SiteId", () => {
    for (const id of ALL_SITES) {
      expect(CONTACT_CONTEXT[id]).toBeDefined();
      expect(CONTACT_CONTEXT[id].siteId).toBe(id);
    }
  });

  it("getContactContext returns the matching entry", () => {
    for (const id of ALL_SITES) {
      expect(getContactContext(id)).toBe(CONTACT_CONTEXT[id]);
    }
  });
});

describe("contact-config — subject prefixes (email routing)", () => {
  it("main site keeps the bare 'freno.me' prefix (backwards-compat subject)", () => {
    expect(CONTACT_CONTEXT.main.subjectPrefix).toBe("freno.me");
  });

  it("each product subdomain uses a distinct bracketed prefix", () => {
    expect(CONTACT_CONTEXT.nessa.subjectPrefix).toBe("[Nessa]");
    expect(CONTACT_CONTEXT.lineage.subjectPrefix).toBe("[Lineage]");
    expect(CONTACT_CONTEXT.gaze.subjectPrefix).toBe("[Gaze]");
    expect(CONTACT_CONTEXT.inputhalo.subjectPrefix).toBe("[InputHalo]");
  });

  it("no two sites share a subjectPrefix (routing is unambiguous)", () => {
    const prefixes = ALL_SITES.map((id) => CONTACT_CONTEXT[id].subjectPrefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });
});

describe("contact-config — buildContactSubject", () => {
  it("main site subject is the legacy 'freno.me Contact Request' string", () => {
    expect(buildContactSubject(CONTACT_CONTEXT.main.subjectPrefix)).toBe(
      "freno.me Contact Request"
    );
  });

  it("each subdomain subject is prefixed with its bracketed token", () => {
    expect(buildContactSubject("[Nessa]")).toBe("[Nessa] Contact Request");
    expect(buildContactSubject("[Lineage]")).toBe("[Lineage] Contact Request");
    expect(buildContactSubject("[Gaze]")).toBe("[Gaze] Contact Request");
    expect(buildContactSubject("[InputHalo]")).toBe(
      "[InputHalo] Contact Request"
    );
  });

  it("subjects differ per subdomain", () => {
    const subjects = ALL_SITES.map((id) =>
      buildContactSubject(CONTACT_CONTEXT[id].subjectPrefix)
    );
    expect(new Set(subjects).size).toBe(subjects.length);
  });
});

describe("contact-config — recipient + branding", () => {
  it("contact recipient is a single shared inbox across all sites", () => {
    expect(CONTACT_RECIPIENT_EMAIL).toBe("michael@freno.me");
  });

  it("every site has a non-empty recipientLabel + heading + description", () => {
    for (const id of ALL_SITES) {
      const ctx: ContactContext = CONTACT_CONTEXT[id];
      expect(ctx.recipientLabel.length).toBeGreaterThan(0);
      expect(ctx.heading.length).toBeGreaterThan(0);
      expect(ctx.description.length).toBeGreaterThan(0);
      expect(ctx.pageTitle.length).toBeGreaterThan(0);
    }
  });

  it("page title is the bare 'Contact' so the site suffix composes it", () => {
    // <PageHead> appends site.titleSuffix → e.g. "Contact | Nessa".
    for (const id of ALL_SITES) {
      expect(CONTACT_CONTEXT[id].pageTitle).toBe("Contact");
    }
  });
});
