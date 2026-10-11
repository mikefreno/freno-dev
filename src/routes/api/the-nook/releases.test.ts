import { describe, expect, it, mock, beforeEach } from "bun:test";

// The contract The Nook's Settings > Changelog tab is built on:
//   1. One list, newest first, from the appcast plus the archive of releases
//      the appcast has aged out — the same merge /changelog renders.
//   2. Structured notes and ISO dates, so the client renders instead of
//      parsing HTML it would only take apart again.
//   3. An unreadable appcast is a 503, never an archived-only 200 that reads
//      as current.

type Release = {
  version: string;
  build: string | null;
  date: string | null;
  sections: { title: string; bullets: string[] }[];
};

let appcastXml = "";
let s3ShouldThrow = false;

mock.module("~/env/server", () => ({
  env: {
    AWS_REGION: "us-east-1",
    MY_AWS_ACCESS_KEY: "test-key",
    MY_AWS_SECRET_KEY: "test-secret",
    VITE_DOWNLOAD_BUCKET_STRING: "test-bucket"
  }
}));

mock.module("@aws-sdk/client-s3", () => ({
  S3Client: class {
    async send() {
      if (s3ShouldThrow) throw new Error("s3 unavailable");
      return {
        Body: appcastXml
          ? { transformToString: async () => appcastXml }
          : null
      };
    }
  },
  GetObjectCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
}));

const { GET } = await import("./releases.json");
const { invalidateAppcastCache } = await import("./_appcast");
const { isoDateOrNull, sectionsFromHtml } = await import("./_releases");
const { ARCHIVED_RELEASES } = await import("~/routes/nook/changelog-archive");

const item = (version: string, pubDate: string, notes: string) => `
  <item>
    <title>Version ${version}</title>
    <pubDate>${pubDate}</pubDate>
    <sparkle:version>${version === "0.6.3" ? "10" : "9"}</sparkle:version>
    <sparkle:shortVersionString>${version}</sparkle:shortVersionString>
    <description><![CDATA[${notes}]]></description>
    <enclosure url="https://cdn.example/TheNook-${version}.dmg" type="application/octet-stream"/>
  </item>`;

const NOTES =
  "<p><b>Added</b></p><ul><li>Changelog tab in Settings.</li></ul>" +
  "<p><b>Fixed</b></p><ul><li>Call actions press only their own button; &quot;End Call&quot; no longer matches &quot;Send&quot;.</li></ul>";

const appcast = (items: string) =>
  `<?xml version="1.0"?><rss><channel>${items}</channel></rss>`;

const request = () =>
  ({
    request: new Request("https://freno.me/api/the-nook/releases.json"),
    nativeEvent: {}
  }) as never;

async function body(): Promise<{ releases: Release[] }> {
  const res = await GET(request());
  return (await res.json()) as { releases: Release[] };
}

beforeEach(() => {
  appcastXml = appcast(
    item("0.6.3", "Fri, 02 Oct 2026 23:29:42 -0400", NOTES) +
      item("0.6.2", "Thu, 24 Sep 2026 21:16:04 -0400", NOTES)
  );
  s3ShouldThrow = false;
  invalidateAppcastCache();
});

describe("GET /api/the-nook/releases.json", () => {
  it("serves the appcast releases newest first, cacheable for five minutes", async () => {
    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=300");

    const { releases } = await body();
    expect(releases.map((r) => r.version)).toEqual(["0.6.3", "0.6.2", ...archivedVersions]);
    expect(releases[0].build).toBe("10");
  });

  it("splits the published notes into titled bullet groups", async () => {
    const [first] = (await body()).releases;

    expect(first!.sections).toEqual([
      { title: "Added", bullets: ["Changelog tab in Settings."] },
      {
        title: "Fixed",
        bullets: [
          'Call actions press only their own button; "End Call" no longer matches "Send".'
        ]
      }
    ]);
  });

  it("dates a release on its own day, not the UTC one", async () => {
    const releases = (await body()).releases;

    // 23:29 -0400 is 03:29Z the next day; the release is still dated the 2nd.
    expect(releases[0]!.date).toBe("2026-10-02");
    expect(releases[1]!.date).toBe("2026-09-24");
  });

  it("appends the archived releases the appcast has aged out", async () => {
    const releases = (await body()).releases;
    const archived = releases.filter((r) => !["0.6.3", "0.6.2"].includes(r.version));

    expect(archived.map((r) => r.version)).toEqual(archivedVersions);
    expect(archived[0]!.build).toBeNull();
    // Archive dates are already calendar dates and pass through untouched.
    expect(archived[0]!.date).toBe(ARCHIVED_RELEASES[0]!.date);
    expect(archived[0]!.sections.length).toBeGreaterThan(0);
  });

  it("lists a version once when the appcast and the archive both carry it", async () => {
    appcastXml = appcast(item("0.5.0", "Mon, 07 Sep 2026 16:11:44 -0400", NOTES));
    invalidateAppcastCache();

    const releases = (await body()).releases;
    const matches = releases.filter((r) => r.version === "0.5.0");

    expect(matches.length).toBe(1);
    // The live item wins: it carries the build number the archive lacks.
    expect(matches[0]!.build).toBe("9");
    expect(matches[0]!.date).toBe("2026-09-07");
  });

  it("503s when the appcast cannot be read, rather than serving archive-only notes", async () => {
    s3ShouldThrow = true;

    const res = await GET(request());
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toBe(
      "Release list unavailable"
    );
  });
});

describe("sectionsFromHtml", () => {
  it("labels an unlabelled list as Notes", () => {
    expect(sectionsFromHtml("<ul><li>Fixes</li></ul>")).toEqual([
      { title: "Notes", bullets: ["Fixes"] }
    ]);
  });

  it("joins a bullet the HTML wrapped across lines, and drops empty ones", () => {
    expect(
      sectionsFromHtml(
        "<p><b>Fixed</b></p><ul>\n<li>a bullet\n   split over\n   lines</li><li> </li></ul>"
      )
    ).toEqual([{ title: "Fixed", bullets: ["a bullet split over lines"] }]);
  });

  it("returns no sections for empty or note-less HTML", () => {
    expect(sectionsFromHtml("")).toEqual([]);
    expect(sectionsFromHtml("<p><b>Added</b></p>")).toEqual([]);
  });
});

describe("isoDateOrNull", () => {
  it("reads an RFC-1123 pubDate at its own offset", () => {
    expect(isoDateOrNull("Sat, 03 Oct 2026 00:00:00 +0000")).toBe("2026-10-03");
    expect(isoDateOrNull("Fri, 02 Oct 2026 23:29:42 -0400")).toBe("2026-10-02");
    expect(isoDateOrNull("Tue, 06 Oct 2026 09:00:00 +0200")).toBe("2026-10-06");
  });

  it("passes a calendar date through and rejects junk", () => {
    expect(isoDateOrNull("2026-09-06")).toBe("2026-09-06");
    expect(isoDateOrNull("sometime in September")).toBeNull();
    expect(isoDateOrNull("")).toBeNull();
    expect(isoDateOrNull(null)).toBeNull();
  });
});

/** The archive in full, in file order (newest first) — the tail of the list. */
const archivedVersions = ARCHIVED_RELEASES.map((r) => r.version);
