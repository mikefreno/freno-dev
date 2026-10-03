import { describe, expect, it } from "bun:test";
import { parseUtm } from "./utm";

describe("parseUtm", () => {
  it("reads the three keys from a full URL", () => {
    expect(
      parseUtm(
        "https://nook.freno.me/?utm_source=hn&utm_medium=post&utm_campaign=launch"
      )
    ).toEqual({
      utmSource: "hn",
      utmMedium: "post",
      utmCampaign: "launch"
    });
  });

  it("reads a relative path with a query (the client beacon's shape)", () => {
    expect(parseUtm("/nook/?utm_source=r_macapps")).toEqual({
      utmSource: "r_macapps",
      utmMedium: null,
      utmCampaign: null
    });
  });

  it("returns all nulls when nothing is tagged", () => {
    const empty = { utmSource: null, utmMedium: null, utmCampaign: null };
    expect(parseUtm("https://nook.freno.me/")).toEqual(empty);
    expect(parseUtm("/nook/?ref=friend")).toEqual(empty);
    expect(parseUtm(null)).toEqual(empty);
    expect(parseUtm(undefined)).toEqual(empty);
    expect(parseUtm("")).toEqual(empty);
  });

  it("lets an earlier argument win per key, later ones filling gaps", () => {
    // A download click with no query of its own takes all three from the
    // landing page carried in the referer.
    expect(
      parseUtm(
        "https://nook.freno.me/api/the-nook/download",
        "https://nook.freno.me/?utm_source=hn&utm_campaign=launch"
      )
    ).toEqual({
      utmSource: "hn",
      utmMedium: null,
      utmCampaign: "launch"
    });

    // The click's own tags win; the referer only supplies what is missing.
    expect(
      parseUtm(
        "https://nook.freno.me/api/the-nook/download?utm_source=x",
        "https://nook.freno.me/?utm_source=hn&utm_campaign=launch"
      )
    ).toEqual({
      utmSource: "x",
      utmMedium: null,
      utmCampaign: "launch"
    });
  });

  it("trims whitespace, drops empties, and caps length", () => {
    expect(parseUtm("https://x.test/?utm_source=%20hn%20&utm_medium=")).toEqual({
      utmSource: "hn",
      utmMedium: null,
      utmCampaign: null
    });

    const long = parseUtm(
      `https://x.test/?utm_campaign=${"a".repeat(500)}`
    );
    expect(long.utmCampaign!.length).toBe(200);
  });

  it("does not case-fold values", () => {
    expect(parseUtm("https://x.test/?utm_campaign=Launch").utmCampaign).toBe(
      "Launch"
    );
  });

  it("ignores unrelated parameters", () => {
    expect(
      parseUtm("https://x.test/?utm_source=hn&c=GB&gclid=abc")
    ).toEqual({ utmSource: "hn", utmMedium: null, utmCampaign: null });
  });
});
