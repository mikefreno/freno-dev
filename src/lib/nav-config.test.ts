/**
 * Unit tests for the per-site navigation configuration (task 04).
 *
 * `NAV_CONFIG` + helpers are pure (no solid-js / router / meta imports), so
 * these mirror the acceptance matrix directly. Integration / visual checks
 * (rendering on `nessa.localhost:3000`) are covered by the build gate and
 * manual validation described in the task; here we assert the data layer.
 */
import { describe, it, expect } from "bun:test";
import {
  NAV_CONFIG,
  BACK_TO_FRENO,
  filterNavByAuth,
  navLabelsFor,
  type NavItem
} from "./nav-config";
import { SITE_CONFIG, type SiteId } from "./site-context";

const ALL_SITES: SiteId[] = [
  "main",
  "nessa",
  "lineage",
  "gaze",
  "inputhalo"
];

describe("NAV_CONFIG — per-site link sets", () => {
  it("main → Home, Blog, Downloads, Resume, Contact, GitHub, LinkedIn", () => {
    expect(navLabelsFor("main")).toEqual([
      "Home",
      "Blog",
      "Downloads",
      "Resume",
      "Contact",
      "GitHub",
      "LinkedIn"
    ]);
  });

  it("nessa → Home, Contact, Privacy (no Blog/Resume/Downloads)", () => {
    const labels = navLabelsFor("nessa");
    expect(labels).toEqual(["Home", "Contact", "Privacy"]);
    expect(labels).not.toContain("Blog");
    expect(labels).not.toContain("Resume");
    expect(labels).not.toContain("Downloads");
  });

  it("lineage → Home, Downloads, Contact, Privacy, Account Deletion", () => {
    expect(navLabelsFor("lineage")).toEqual([
      "Home",
      "Downloads",
      "Contact",
      "Privacy",
      "Account Deletion"
    ]);
  });

  it("gaze → Home, Contact, Privacy", () => {
    expect(navLabelsFor("gaze")).toEqual(["Home", "Contact", "Privacy"]);
  });

  it("inputhalo → Home, Contact, Privacy", () => {
    expect(navLabelsFor("inputhalo")).toEqual(["Home", "Contact", "Privacy"]);
  });
});

describe("NAV_CONFIG — href correctness", () => {
  it("every main internal link is a path (no host), externals are absolute URLs", () => {
    for (const item of NAV_CONFIG.main) {
      if (item.external) {
        expect(item.href).toMatch(/^https?:\/\//);
      } else {
        expect(item.href.startsWith("/")).toBe(true);
      }
    }
  });

  it("subdomain nav hrefs are public browser paths, never the internal rewritten prefix", () => {
    for (const id of ["nessa", "lineage", "gaze", "inputhalo"] as SiteId[]) {
      for (const item of NAV_CONFIG[id]) {
        // No subdomain-prefixed paths leak into the public nav.
        expect(item.href.startsWith(`/${id}/`)).toBe(false);
        expect(item.href).toMatch(/^\//);
      }
    }
  });

  it("the lineage Account Deletion link points to /deletion (host-scoped route)", () => {
    const deletion = NAV_CONFIG.lineage.find(
      (i) => i.label === "Account Deletion"
    );
    expect(deletion).toBeDefined();
    expect(deletion!.href).toBe("/deletion");
  });

  it("main external GitHub + LinkedIn point to the canonical profiles", () => {
    const gh = NAV_CONFIG.main.find((i) => i.label === "GitHub");
    expect(gh?.external).toBe(true);
    expect(gh?.href).toBe("https://github.com/MikeFreno/");
    const li = NAV_CONFIG.main.find((i) => i.label === "LinkedIn");
    expect(li?.external).toBe(true);
    expect(li?.href).toBe(
      "https://www.linkedin.com/in/michael-freno-176001256/"
    );
  });
});

describe("NAV_CONFIG — auth-scoping by construction", () => {
  it("no subdomain nav item sets showLoggedIn / showLoggedOut", () => {
    for (const id of ["nessa", "lineage", "gaze", "inputhalo"] as SiteId[]) {
      for (const item of NAV_CONFIG[id]) {
        expect(item.showLoggedIn).toBeUndefined();
        expect(item.showLoggedOut).toBeUndefined();
      }
    }
  });

  it("every site's nav is a non-empty array", () => {
    for (const id of ALL_SITES) {
      expect(NAV_CONFIG[id].length).toBeGreaterThan(0);
    }
  });

  it("every site has a Home item pointing to /", () => {
    for (const id of ALL_SITES) {
      const home = NAV_CONFIG[id].find((i) => i.label === "Home");
      expect(home).toBeDefined();
      expect(home!.href).toBe("/");
    }
  });

  it("is exhaustively defined for every SiteId", () => {
    // Every entry in SITE_CONFIG has a NAV_CONFIG entry.
    for (const id of Object.keys(SITE_CONFIG) as SiteId[]) {
      expect(NAV_CONFIG[id]).toBeDefined();
      expect(Array.isArray(NAV_CONFIG[id])).toBe(true);
    }
  });
});

describe("filterNavByAuth", () => {
  const mixed: NavItem[] = [
    { label: "Public", href: "/" },
    { label: "Only Logged In", href: "/in", showLoggedIn: true },
    { label: "Only Logged Out", href: "/out", showLoggedOut: true }
  ];

  it("shows public items to both audiences", () => {
    expect(filterNavByAuth(mixed, true).map((i) => i.label)).toContain(
      "Public"
    );
    expect(filterNavByAuth(mixed, false).map((i) => i.label)).toContain(
      "Public"
    );
  });

  it("shows showLoggedIn only when authenticated", () => {
    expect(filterNavByAuth(mixed, true).map((i) => i.label)).toContain(
      "Only Logged In"
    );
    expect(filterNavByAuth(mixed, false).map((i) => i.label)).not.toContain(
      "Only Logged In"
    );
  });

  it("shows showLoggedOut only when logged out", () => {
    expect(filterNavByAuth(mixed, false).map((i) => i.label)).toContain(
      "Only Logged Out"
    );
    expect(filterNavByAuth(mixed, true).map((i) => i.label)).not.toContain(
      "Only Logged Out"
    );
  });

  it("does not mutate the input array", () => {
    const before = mixed.map((i) => ({ ...i }));
    filterNavByAuth(mixed, true);
    expect(mixed).toEqual(before);
  });
});

describe("BACK_TO_FRENO", () => {
  it("links to the apex freno.me and is external", () => {
    expect(BACK_TO_FRENO.href).toBe("https://freno.me");
    expect(BACK_TO_FRENO.external).toBe(true);
    expect(BACK_TO_FRENO.icon).toBe("back");
  });
});
