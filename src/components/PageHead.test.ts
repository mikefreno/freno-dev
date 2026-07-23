/**
 * Unit tests for `PageHead` site-aware metadata derivation (task 02).
 *
 * `resolvePageHeadMeta` is a pure function over (props, site, pathname), so
 * these tests mirror the acceptance matrix without a DOM / SolidJS router.
 * The render layer (`PageHead` component) is a thin wrapper over this function.
 */
import { describe, it, expect } from "bun:test";
import {
  resolvePageHeadMeta,
  type PageHeadProps
} from "~/components/page-head-meta";
import { SITE_CONFIG, type SiteId } from "~/lib/site-context";

const BASE_PROPS: PageHeadProps = {
  title: "Blog",
  description: "Technical blog posts about web development."
};

describe("resolvePageHeadMeta — title suffix per site", () => {
  const cases: Array<{ id: SiteId; suffix: string }> = [
    { id: "main", suffix: " | Michael Freno" },
    { id: "nessa", suffix: " | Nessa" },
    { id: "lineage", suffix: " | Life and Lineage" },
    { id: "gaze", suffix: " | Gaze" },
    { id: "inputhalo", suffix: " | InputHalo" }
  ];

  for (const { id, suffix } of cases) {
    it(`${id} → title is "${BASE_PROPS.title}${suffix}"`, () => {
      const meta = resolvePageHeadMeta(
        BASE_PROPS,
        SITE_CONFIG[id],
        "/blog"
      );
      expect(meta.title).toBe(`${BASE_PROPS.title}${suffix}`);
    });
  }

  it("main produces 'Home | Michael Freno' for the homepage", () => {
    const meta = resolvePageHeadMeta(
      { title: "Home" },
      SITE_CONFIG.main,
      "/"
    );
    expect(meta.title).toBe("Home | Michael Freno");
  });
});

describe("resolvePageHeadMeta — canonical URL derivation", () => {
  it("main → canonical starts with https://freno.me", () => {
    const meta = resolvePageHeadMeta(BASE_PROPS, SITE_CONFIG.main, "/");
    expect(meta.canonical).toBe("https://freno.me/");
  });

  it("main blog → https://freno.me/blog", () => {
    const meta = resolvePageHeadMeta(BASE_PROPS, SITE_CONFIG.main, "/blog");
    expect(meta.canonical).toBe("https://freno.me/blog");
  });

  it("nessa → canonical starts with https://nessa.freno.me", () => {
    const meta = resolvePageHeadMeta(BASE_PROPS, SITE_CONFIG.nessa, "/");
    expect(meta.canonical).toBe("https://nessa.freno.me/");
  });

  it("nessa /contact → https://nessa.freno.me/contact", () => {
    const meta = resolvePageHeadMeta(
      BASE_PROPS,
      SITE_CONFIG.nessa,
      "/contact"
    );
    expect(meta.canonical).toBe("https://nessa.freno.me/contact");
  });

  it("lineage → canonical starts with https://lineage.freno.me", () => {
    const meta = resolvePageHeadMeta(BASE_PROPS, SITE_CONFIG.lineage, "/");
    expect(meta.canonical.startsWith("https://lineage.freno.me")).toBe(true);
  });

  it("gaze → canonical starts with https://gaze.freno.me", () => {
    const meta = resolvePageHeadMeta(BASE_PROPS, SITE_CONFIG.gaze, "/");
    expect(meta.canonical.startsWith("https://gaze.freno.me")).toBe(true);
  });

  it("inputhalo → canonical starts with https://inputhalo.freno.me", () => {
    const meta = resolvePageHeadMeta(BASE_PROPS, SITE_CONFIG.inputhalo, "/");
    expect(meta.canonical.startsWith("https://inputhalo.freno.me")).toBe(true);
  });

  it("preserves the full pathname including nested segments + search is NOT included", () => {
    // useLocation().pathname excludes the query string; canonical should too.
    const meta = resolvePageHeadMeta(
      BASE_PROPS,
      SITE_CONFIG.main,
      "/blog/my-post"
    );
    expect(meta.canonical).toBe("https://freno.me/blog/my-post");
  });

  it("explicit `canonical` prop overrides auto-derivation", () => {
    const meta = resolvePageHeadMeta(
      { ...BASE_PROPS, canonical: "https://example.com/override" },
      SITE_CONFIG.nessa,
      "/contact"
    );
    expect(meta.canonical).toBe("https://example.com/override");
  });
});

describe("resolvePageHeadMeta — OpenGraph fallbacks", () => {
  it("ogImage defaults to the site's ogDefaultImage when not provided", () => {
    const meta = resolvePageHeadMeta(BASE_PROPS, SITE_CONFIG.nessa, "/");
    expect(meta.ogImage).toBe(SITE_CONFIG.nessa.ogDefaultImage);
  });

  it("explicit ogImage overrides the site default", () => {
    const meta = resolvePageHeadMeta(
      { ...BASE_PROPS, ogImage: "https://cdn/custom.png" },
      SITE_CONFIG.main,
      "/"
    );
    expect(meta.ogImage).toBe("https://cdn/custom.png");
  });

  it("ogTitle falls back to the base title (no suffix)", () => {
    const meta = resolvePageHeadMeta(BASE_PROPS, SITE_CONFIG.main, "/");
    expect(meta.ogTitle).toBe("Blog");
  });

  it("explicit ogTitle overrides the title fallback", () => {
    const meta = resolvePageHeadMeta(
      { ...BASE_PROPS, ogTitle: "Custom OG Title" },
      SITE_CONFIG.main,
      "/"
    );
    expect(meta.ogTitle).toBe("Custom OG Title");
  });

  it("ogDescription falls back to description", () => {
    const meta = resolvePageHeadMeta(BASE_PROPS, SITE_CONFIG.main, "/");
    expect(meta.ogDescription).toBe(BASE_PROPS.description);
  });

  it("explicit ogDescription overrides the description fallback", () => {
    const meta = resolvePageHeadMeta(
      { ...BASE_PROPS, ogDescription: "Custom OG desc" },
      SITE_CONFIG.main,
      "/"
    );
    expect(meta.ogDescription).toBe("Custom OG desc");
  });

  it("description is passed through unchanged", () => {
    const meta = resolvePageHeadMeta(BASE_PROPS, SITE_CONFIG.main, "/");
    expect(meta.description).toBe(BASE_PROPS.description);
  });
});
