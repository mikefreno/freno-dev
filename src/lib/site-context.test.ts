/**
 * Unit tests for the shared site-context resolver.
 *
 * `resolveSiteFromHost` is pure — no env / no I/O — so the cases below are
 * straightforward synchronous assertions mirroring the acceptance matrix.
 */
import { describe, it, expect } from "bun:test";
import {
  resolveSiteFromHost,
  resolveSiteFromPath,
  resolveSiteFromLocation,
  SITE_CONFIG,
  type SiteId
} from "./site-context";

function expectSite(host: string, id: SiteId) {
  expect(resolveSiteFromHost(host).id).toBe(id);
}

describe("resolveSiteFromHost", () => {
  it("maps each product subdomain to its own site config", () => {
    expectSite("nessa.freno.me", "nessa");
    expectSite("lineage.freno.me", "lineage");
    expectSite("gaze.freno.me", "gaze");
    expectSite("inputhalo.freno.me", "inputhalo");
  });

  it("maps the apex and www hosts to main", () => {
    expectSite("freno.me", "main");
    expectSite("www.freno.me", "main");
  });

  it("falls back to main for unknown subdomains", () => {
    expectSite("unknown.freno.me", "main");
    expectSite("blog.freno.me", "main");
  });

  it("handles ports", () => {
    expectSite("freno.me:3000", "main");
    expectSite("nessa.freno.me:8787", "nessa");
    expectSite("www.freno.me:443", "main");
  });

  it("handles localhost dev hosts", () => {
    expectSite("localhost", "main");
    expectSite("localhost:3000", "main");
    expectSite("nessa.localhost:3000", "nessa");
    expectSite("nessa.localhost", "nessa");
    expectSite("gaze.localhost", "gaze");
    expectSite("lineage.localhost", "lineage");
    expectSite("inputhalo.localhost", "inputhalo");
  });

  it("treats unknown *.localhost as main", () => {
    expectSite("wat.localhost", "main");
  });

  it("handles empty / null / undefined hosts by returning main", () => {
    expect(resolveSiteFromHost("").id).toBe("main");
    expect(resolveSiteFromHost(null).id).toBe("main");
    expect(resolveSiteFromHost(undefined).id).toBe("main");
    expect(resolveSiteFromHost("   ").id).toBe("main");
  });

  it("case-insensitively normalizes hosts", () => {
    expectSite("NeSsA.Freno.Me", "nessa");
    expectSite("WWW.Freno.Me", "main");
    expectSite("Gaze.LOCALHOST:3000", "gaze");
  });

  it("preserves exact dot-match semantics (no prefix bleed)", () => {
    // `x-nessa.freno.me` must NOT match `nessa.freno.me`.
    expectSite("x-nessa.freno.me", "main");
    expectSite("notgaze.freno.me", "main");
  });

  it("returns the matching SITE_CONFIG entry (full object, not just id)", () => {
    expect(resolveSiteFromHost("nessa.freno.me")).toEqual(SITE_CONFIG.nessa);
    expect(resolveSiteFromHost("gaze.freno.me")).toEqual(SITE_CONFIG.gaze);
    expect(resolveSiteFromHost("freno.me")).toEqual(SITE_CONFIG.main);
  });

  it("every SITE_CONFIG entry has a non-empty baseRoutePrefix for subdomains", () => {
    for (const id of ["nessa", "lineage", "gaze", "inputhalo"] as SiteId[]) {
      expect(SITE_CONFIG[id].baseRoutePrefix).toBe(`/${id}`);
      expect(SITE_CONFIG[id].subdomain).toBe(id);
      expect(SITE_CONFIG[id].titleSuffix).toBe(
        ` | ${SITE_CONFIG[id].displayName}`
      );
    }
  });

  it("main has empty subdomain and empty baseRoutePrefix", () => {
    expect(SITE_CONFIG.main.subdomain).toBe("");
    expect(SITE_CONFIG.main.baseRoutePrefix).toBe("");
  });
});

describe("resolveSiteFromPath", () => {
  it("maps a subdomain-prefixed path to the right site", () => {
    expect(resolveSiteFromPath("/nessa/contact")?.id).toBe("nessa");
    expect(resolveSiteFromPath("/lineage/downloads")?.id).toBe("lineage");
    expect(resolveSiteFromPath("/gaze/")?.id).toBe("gaze");
    expect(resolveSiteFromPath("/inputhalo/privacy")?.id).toBe("inputhalo");
  });

  it("matches the exact prefix (landing page)", () => {
    expect(resolveSiteFromPath("/nessa")?.id).toBe("nessa");
    expect(resolveSiteFromPath("/gaze")?.id).toBe("gaze");
  });

  it("returns null for non-subdomain paths", () => {
    expect(resolveSiteFromPath("/")).toBeNull();
    expect(resolveSiteFromPath("/contact")).toBeNull();
    expect(resolveSiteFromPath("/blog/post")).toBeNull();
    expect(resolveSiteFromPath("/downloads")).toBeNull();
  });

  it("does not match prefix substrings (no false positives)", () => {
    // `/nessa-extra` must NOT match `/nessa`.
    expect(resolveSiteFromPath("/nessa-extra")).toBeNull();
    expect(resolveSiteFromPath("/gazette")).toBeNull();
  });

  it("handles empty / null / undefined", () => {
    expect(resolveSiteFromPath("")).toBeNull();
    expect(resolveSiteFromPath(null)).toBeNull();
    expect(resolveSiteFromPath(undefined)).toBeNull();
  });

  it("returns the full SITE_CONFIG entry", () => {
    expect(resolveSiteFromPath("/nessa/contact")).toEqual(SITE_CONFIG.nessa);
    expect(resolveSiteFromPath("/gaze")).toEqual(SITE_CONFIG.gaze);
  });
});

describe("resolveSiteFromLocation", () => {
  it("prefers the host when it identifies a subdomain", () => {
    expect(resolveSiteFromLocation("nessa.freno.me", "/contact").id).toBe(
      "nessa"
    );
    expect(resolveSiteFromLocation("gaze.localhost", "/").id).toBe("gaze");
  });

  it("falls back to the path prefix when the host is localhost/main", () => {
    expect(resolveSiteFromLocation("localhost", "/nessa/contact").id).toBe(
      "nessa"
    );
    expect(resolveSiteFromLocation("localhost", "/lineage/").id).toBe(
      "lineage"
    );
    expect(resolveSiteFromLocation("freno.me", "/gaze/downloads").id).toBe(
      "gaze"
    );
  });

  it("returns main when neither host nor path identifies a subdomain", () => {
    expect(resolveSiteFromLocation("localhost", "/contact").id).toBe("main");
    expect(resolveSiteFromLocation("freno.me", "/").id).toBe("main");
  });
});
